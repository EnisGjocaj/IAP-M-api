"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class NewsService {
    getAllNews() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newsList = yield prisma.news.findMany();
                return { statusCode: 200, message: newsList };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    getNewsById(newsId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newsItem = yield prisma.news.findUnique({ where: { id: Number(newsId) } });
                if (!newsItem) {
                    return { statusCode: 404, message: 'News not found' };
                }
                return { statusCode: 200, message: newsItem };
            }
            catch (error) {
                return { statusCode: 500, message: error.message };
            }
        });
    }
    createNews(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newNewsItem = yield prisma.news.create({ data });
                return { statusCode: 201, message: newNewsItem };
            }
            catch (error) {
                throw new Error(`Error creating news: ${error.message}`);
            }
        });
    }
    updateNews(newsId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updateData = {};
                if (data.title !== undefined)
                    updateData.title = data.title;
                if (data.content !== undefined)
                    updateData.content = data.content;
                if (data.imageUrl !== undefined)
                    updateData.imageUrl = data.imageUrl;
                const updatedNews = yield prisma.news.update({
                    where: { id: Number(newsId) },
                    data: updateData,
                });
                return { statusCode: 200, message: updatedNews };
            }
            catch (error) {
                throw new Error(`Error updating news: ${error.message}`);
            }
        });
    }
    deleteNews(newsId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedNews = yield prisma.news.delete({
                    where: { id: Number(newsId) },
                });
                return { statusCode: 200, message: deletedNews };
            }
            catch (error) {
                throw new Error(`Error deleting news: ${error.message}`);
            }
        });
    }
}
exports.NewsService = NewsService;
//# sourceMappingURL=news.service.js.map