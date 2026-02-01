import { pipeline } from '@xenova/transformers';

import type { EmbeddingProvider } from './EmbeddingProvider';

export class MiniLMEmbeddingProvider implements EmbeddingProvider {
  private readonly extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  modelName() {
    return 'Xenova/all-MiniLM-L6-v2';
  }

  dims() {
    return 384;
  }

  async embed(text: string): Promise<number[]> {
    const extractor: any = await this.extractorPromise;
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  }
}
