import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NewsService {
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
      const newsItem = await prisma.news.findUnique({ where: { id: Number(newsId) } });
      if (!newsItem) {
        return { statusCode: 404, message: 'News not found' };
      }
      return { statusCode: 200, message: newsItem };
    } catch (error: any) {
      return { statusCode: 500, message: error.message };
    }
  }

  async createNews(data: { title: string; content: string; imageUrl?: string }) {
    try {
      const newNewsItem = await prisma.news.create({ data });
      return { statusCode: 201, message: newNewsItem };
    } catch (error: any) {
      throw new Error(`Error creating news: ${error.message}`);
    }
  }
  
  async updateNews(newsId: string, data: { title?: string; content?: string; imageUrl?: string }) {
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  
      const updatedNews = await prisma.news.update({
        where: { id: Number(newsId) },
        data: updateData,
      });
      return { statusCode: 200, message: updatedNews };
    } catch (error: any) {
      throw new Error(`Error updating news: ${error.message}`);
    }
  }
  

  async deleteNews(newsId: string) {
    try {
      const deletedNews = await prisma.news.delete({
        where: { id: Number(newsId) },
      });
      return { statusCode: 200, message: deletedNews };
    } catch (error: any) {
      throw new Error(`Error deleting news: ${error.message}`);
    }
  }
}
