export class PdfParser {
  async parse(buffer: Buffer): Promise<string> {
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text?: string }>;
    const data = await pdfParse(buffer);
    return data.text || '';
  }
}
