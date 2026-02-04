import type { PrismaClient } from '@prisma/client';

import { chunkText } from './chunking/chunkText';
import type { EmbeddingProvider } from './embeddings/EmbeddingProvider';
import { CloudinaryFetcher } from './fetchers/cloudinaryFetcher';
import { PdfParser } from './parsers/pdfParser';
import type { VectorStore } from './vectorstore/VectorStore';

export class IngestionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly fetcher: CloudinaryFetcher,
    private readonly pdfParser: PdfParser,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly vectorStore: VectorStore
  ) {}

  async ingestMaterial(materialId: number) {
    console.log('[AI][INGEST_START]', materialId);
    await this.prisma.aiMaterial.update({
      where: { id: materialId },
      data: { indexStatus: 'INDEXING', indexError: null },
    });

    try {
      const material = await this.prisma.aiMaterial.findUnique({ where: { id: materialId } });
      if (!material) throw new Error('Material not found');
      if (!material.isApproved) throw new Error('Material not approved');
      if (!material.cloudinaryUrl) throw new Error('Material missing cloudinaryUrl');

      if (material.mimeType !== 'application/pdf') {
        throw new Error(`Unsupported mimeType for ingestion: ${material.mimeType}`);
      }

      const bytes = await this.fetcher.fetchBytes(material.cloudinaryUrl);
      const pages = await this.pdfParser.parsePages(bytes);
      const pageCount = pages.length;

      const allChunks: Array<{ chunkIndex: number; text: string; pageNo: number }> = [];
      let globalIdx = 0;

      for (const p of pages) {
        const pageText = (p.text || '').trim();
        if (!pageText) continue;

        const chunks = chunkText({ text: pageText });
        for (const c of chunks) {
          allChunks.push({ chunkIndex: globalIdx++, text: c.text, pageNo: p.pageNo });
        }
      }

      if (allChunks.length === 0) throw new Error('No extractable text found');

      console.log('[AI][CHUNKED]', materialId, { pages: pageCount, chunks: allChunks.length });

      const existingChunkIds = (
        await this.prisma.aiMaterialChunk.findMany({
          where: { materialId },
          select: { id: true },
        })
      ).map((c) => c.id);

      if (existingChunkIds.length > 0) {
        await this.prisma.aiQueryRetrieval.deleteMany({ where: { chunkId: { in: existingChunkIds } } });
        await this.prisma.aiChunkEmbedding.deleteMany({ where: { chunkId: { in: existingChunkIds } } });
      }

      await this.prisma.aiMaterialChunk.deleteMany({ where: { materialId } });

      let createdCount = 0;
      for (const c of allChunks) {
        const createdChunk = await this.prisma.aiMaterialChunk.create({
          data: {
            materialId,
            chunkIndex: c.chunkIndex,
            text: c.text,
            pageStart: c.pageNo,
            pageEnd: c.pageNo,
          },
        });

        const vector = await this.embeddingProvider.embed(c.text);

        await this.vectorStore.upsertEmbedding({
          chunkId: createdChunk.id,
          embeddingModel: this.embeddingProvider.modelName(),
          dims: this.embeddingProvider.dims(),
          vector,
        });

        createdCount += 1;
      }

      console.log('[AI][EMBEDDINGS_CREATED]', materialId, { embeddings: createdCount });

      await this.prisma.aiMaterial.update({
        where: { id: materialId },
        data: { indexStatus: 'INDEXED', indexedAt: new Date(), indexError: null },
      });

      console.log('[AI][INGEST_DONE]', materialId);
    } catch (error: any) {
      console.error('[AI][INGEST_FAILED]', materialId, error?.stack || error);
      const errText = String(error?.stack || error?.message || error || 'Indexing failed');
      await this.prisma.aiMaterial.update({
        where: { id: materialId },
        data: { indexStatus: 'FAILED', indexError: errText },
      });

      throw error;
    }
  }
}
