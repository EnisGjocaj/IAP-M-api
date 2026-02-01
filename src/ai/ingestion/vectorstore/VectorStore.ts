export type VectorSearchResult = { chunkId: number; score: number };

export interface VectorStore {
  upsertEmbedding(input: {
    chunkId: number;
    embeddingModel: string;
    dims: number;
    vector: number[];
  }): Promise<void>;

  search(input: {
    materialIds: number[];
    embeddingModel: string;
    queryVector: number[];
    topK: number;
  }): Promise<VectorSearchResult[]>;
}
