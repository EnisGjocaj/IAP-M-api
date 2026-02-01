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
      const text = await this.pdfParser.parse(bytes);
      if (!text || text.trim().length === 0) throw new Error('No extractable text found');

      const chunks = chunkText({ text });

      await this.prisma.aiMaterialChunk.deleteMany({ where: { materialId } });

      for (const c of chunks) {
        const createdChunk = await this.prisma.aiMaterialChunk.create({
          data: {
            materialId,
            chunkIndex: c.chunkIndex,
            text: c.text,
          },
        });

        const vector = await this.embeddingProvider.embed(c.text);

        await this.vectorStore.upsertEmbedding({
          chunkId: createdChunk.id,
          embeddingModel: this.embeddingProvider.modelName(),
          dims: this.embeddingProvider.dims(),
          vector,
        });
      }

      await this.prisma.aiMaterial.update({
        where: { id: materialId },
        data: { indexStatus: 'INDEXED', indexedAt: new Date(), indexError: null },
      });
    } catch (error: any) {
      await this.prisma.aiMaterial.update({
        where: { id: materialId },
        data: { indexStatus: 'FAILED', indexError: error?.message || 'Indexing failed' },
      });

      throw error;
    }
  }
}
