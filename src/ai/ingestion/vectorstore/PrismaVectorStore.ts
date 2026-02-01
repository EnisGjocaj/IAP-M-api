import type { PrismaClient } from '@prisma/client';

import type { VectorSearchResult, VectorStore } from './VectorStore';

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a: number[]) {
  return Math.sqrt(dot(a, a));
}

function cosine(a: number[], b: number[]) {
  const d = dot(a, b);
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return d / (na * nb);
}

export class PrismaVectorStore implements VectorStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertEmbedding(input: { chunkId: number; embeddingModel: string; dims: number; vector: number[] }) {
    await this.prisma.aiChunkEmbedding.upsert({
      where: { chunkId: input.chunkId },
      update: {
        embeddingModel: input.embeddingModel,
        dims: input.dims,
        vector: input.vector,
      },
      create: {
        chunkId: input.chunkId,
        embeddingModel: input.embeddingModel,
        dims: input.dims,
        vector: input.vector,
      },
    });
  }

  async search(input: {
    materialIds: number[];
    embeddingModel: string;
    queryVector: number[];
    topK: number;
  }): Promise<VectorSearchResult[]> {
    const rows = (await this.prisma.aiChunkEmbedding.findMany({
      where: {
        embeddingModel: input.embeddingModel,
        chunk: {
          materialId: { in: input.materialIds },
        },
      },
      select: { chunkId: true, vector: true },
    })) as Array<{ chunkId: number; vector: number[] }>;

    const scored: VectorSearchResult[] = rows.map((r: { chunkId: number; vector: number[] }) => ({
      chunkId: r.chunkId,
      score: cosine(input.queryVector, r.vector as number[]),
    }));

    scored.sort((a: VectorSearchResult, b: VectorSearchResult) => b.score - a.score);
    return scored.slice(0, input.topK);
  }
}
