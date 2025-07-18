import { PrismaClient } from '@prisma/client';
import { supabase } from '../../supabase.config';

const prisma = new PrismaClient();

export class NewsService {
  private readonly BUCKET_NAME = 'news-images';

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
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
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

        uploadedUrls.push(publicUrl);
      } catch (error: any) {
        console.error(`Error uploading image: ${error.message}`);
      }
    }
    
    return uploadedUrls;
  }

  async createNews(data: { title: string; content: string; images?: Express.Multer.File[] }) {
    try {
      let mainImageUrl = '';
      let additionalImages: string[] = [];
      
      if (data.images && data.images.length > 0) {
        // Upload all images
        const uploadedUrls = await this.uploadMultipleImages(data.images);
        
        // Set first image as main image for backward compatibility
        mainImageUrl = uploadedUrls[0];
        additionalImages = uploadedUrls.slice(1);
      }

      // Create news with main image (backward compatible) when we had one image only
      const newNewsItem = await prisma.news.create({
        data: {
          title: data.title,
          content: data.content,
          imageUrl: mainImageUrl,
          images: {
            create: [
              { url: mainImageUrl, isMain: true, order: 0 },
              ...additionalImages.map((url, index) => ({
                url,
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
        where: { id: Number(newsId) }
      });

      if (news?.imageUrl) {
        const fileName = news.imageUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from(this.BUCKET_NAME)
            .remove([fileName]);
        }
      }

      const deletedNews = await prisma.news.delete({
        where: { id: Number(newsId) }
      });

      return { statusCode: 200, message: deletedNews };
    } catch (error: any) {
      throw new Error(`Error deleting news: ${error.message}`);
    }
  }
}
