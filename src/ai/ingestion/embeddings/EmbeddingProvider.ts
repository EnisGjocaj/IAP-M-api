export interface EmbeddingProvider {
  modelName(): string;
  dims(): number;
  embed(text: string): Promise<number[]>;
}
