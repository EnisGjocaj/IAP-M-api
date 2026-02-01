import { PrismaClient } from '@prisma/client';

import { AIService } from './AIService';
import { GroqProvider } from '../providers/groq/groq.provider';
import { IngestionService } from '../ingestion/IngestionService';
import { CloudinaryFetcher } from '../ingestion/fetchers/cloudinaryFetcher';
import { PdfParser } from '../ingestion/parsers/pdfParser';
import { MiniLMEmbeddingProvider } from '../ingestion/embeddings/MiniLMEmbeddingProvider';
import { PrismaVectorStore } from '../ingestion/vectorstore/PrismaVectorStore';

const prisma = new PrismaClient();

const groqProvider = new GroqProvider();
const embeddingProvider = new MiniLMEmbeddingProvider();
const vectorStore = new PrismaVectorStore(prisma);

export const ingestionService = new IngestionService(
  prisma,
  new CloudinaryFetcher(),
  new PdfParser(),
  embeddingProvider,
  vectorStore
);

export const aiService = new AIService(prisma, groqProvider, embeddingProvider, vectorStore);
