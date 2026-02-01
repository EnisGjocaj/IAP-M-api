export class CloudinaryFetcher {
  async fetchBytes(url: string): Promise<Buffer> {
    const fetchFn = require('node-fetch') as (url: string) => Promise<{
      ok: boolean;
      status: number;
      statusText: string;
      arrayBuffer: () => Promise<ArrayBuffer>;
    }>;

    const res = await fetchFn(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch material: ${res.status} ${res.statusText}`);
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}
