import { PrismaClient } from '@prisma/client';
import { supabase } from '../../supabase.config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const prisma = new PrismaClient();

export class NewsService {
  private readonly BUCKET_NAME = 'news-images';

  // Helper function to upload to Cloudinary with social media optimization
  private async uploadToCloudinary(buffer: Buffer, fileName: string) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'news-social',
          public_id: fileName,
          transformation: [
            { 
              width: 1400, 
              height: 788,  // Perfect 16:9 aspect ratio
              crop: 'fill', 
              gravity: 'auto',  
              aspect_ratio: "16:9" 
            },
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ],
          tags: ['social_media']
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      const bufferStream = require('stream').Readable.from(buffer);
      bufferStream.pipe(uploadStream);
    });
  }

  async getAllNews() {
    try {
      const newsList = await prisma.news.findMany();
      return { statusCode: 200, message: newsList };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async getNewsById(newsId: string) {
    try {
      const newsItem = await prisma.news.findUnique({ 
        where: { id: Number(newsId) },
        include: {
          images: {
            orderBy: {
              order: 'asc'
            }
          }
        }
      });
      
      if (!newsItem) {
        return { statusCode: 404, message: 'News not found' };
      }
      return { statusCode: 200, message: newsItem };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async uploadImage(file: Express.Multer.File) {
    try {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600'
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      throw new Error(`Error uploading image: ${error.message}`);
    }
  }

  async uploadMultipleImages(files: Express.Multer.File[]) {
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        const { data, error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(`${fileName}.${fileExt}`, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600'
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(`${fileName}.${fileExt}`);

        // Upload to Cloudinary for social media
        const cloudinaryResult: any = await this.uploadToCloudinary(file.buffer, fileName);

        uploadedUrls.push({
          url: publicUrl,
          socialUrl: cloudinaryResult.secure_url
        });
      } catch (error: any) {
        console.error(`Error uploading image: ${error.message}`);
      }
    }
    
    return uploadedUrls;
  }

  async createNews(data: { title: string; content: string; images?: Express.Multer.File[] }) {
    try {
      let mainImageUrl = '';
      let mainSocialUrl = '';
      let additionalImages: any[] = [];
      
      if (data.images && data.images.length > 0) {
        const uploadedUrls = await this.uploadMultipleImages(data.images);
        
        mainImageUrl = uploadedUrls[0].url;
        mainSocialUrl = uploadedUrls[0].socialUrl;
        additionalImages = uploadedUrls.slice(1);
      }

      const newNewsItem = await prisma.news.create({
        data: {
          title: data.title,
          content: data.content,
          imageUrl: mainImageUrl,
          images: {
            create: [
              { 
                url: mainImageUrl, 
                socialUrl: mainSocialUrl,
                isMain: true, 
                order: 0 
              },
              ...additionalImages.map((img, index) => ({
                url: img.url,
                socialUrl: img.socialUrl, 
                isMain: false,
                order: index + 1
              }))
            ].filter(img => img.url) 
          }
        },
        include: {
          images: true
        }
      });
      
      return { statusCode: 201, message: newNewsItem };
    } catch (error: any) {
      throw new Error(`Error creating news: ${error.message}`);
    }
  }

  async updateNews(newsId: string, data: { 
    title?: string; 
    content?: string; 
    image?: Express.Multer.File 
  }) {
    try {
      const updateData: any = {
        title: data.title,
        content: data.content
      };

      if (data.image) {
        updateData.imageUrl = await this.uploadImage(data.image);
      }

      const updatedNews = await prisma.news.update({
        where: { id: Number(newsId) },
        data: updateData
      });
      
      return { statusCode: 200, message: updatedNews };
    } catch (error: any) {
      throw new Error(`Error updating news: ${error.message}`);
    }
  }

  async deleteNews(newsId: string) {
    try {
      const news = await prisma.news.findUnique({
        where: { id: Number(newsId) },
        include: {
          images: true
        }
      });

      if (!news) {
        throw new Error('News not found');
      }

      // Start a transaction to delete everything
      await prisma.$transaction(async (tx) => {
        // 1. Delete all associated images from Supabase
        for (const image of news.images) {
          const fileName = image.url.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from(this.BUCKET_NAME)
              .remove([fileName]);
          }
        }

        // 2. Delete all NewsImage records first
        await tx.newsImage.deleteMany({
          where: {
            newsId: Number(newsId)
          }
        });

        // 3. Finally delete the news article
        await tx.news.delete({
          where: {
            id: Number(newsId)
          }
        });
      });

      return { statusCode: 200, message: 'News deleted successfully' };
    } catch (error: any) {
      throw new Error(`Error deleting news: ${error.message}`);
    }
  }
}
