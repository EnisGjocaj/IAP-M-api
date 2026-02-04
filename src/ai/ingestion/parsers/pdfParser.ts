export class PdfParser {
  async parsePages(buffer: Buffer): Promise<Array<{ pageNo: number; text: string }>> {
    const mod: any = require('pdf-parse');

    if (typeof mod?.PDFParse === 'function') {
      const parser = new mod.PDFParse({ data: buffer });
      try {
        const result = await parser.getText({ pageJoiner: '\n<<<PAGE_BREAK page_number>>>\n' });
        const raw = String(result?.text || '');

        const re = /<<<PAGE_BREAK\s+(\d+)>>>/g;
        const pages: Array<{ pageNo: number; text: string }> = [];

        let lastIndex = 0;
        let match: RegExpExecArray | null;
        let nextPageNo = 1;

        while ((match = re.exec(raw))) {
          const pageNo = Number(match[1]);
          const pageText = raw.slice(lastIndex, match.index).trim();
          if (pageText.length > 0) {
            pages.push({ pageNo: Number.isFinite(pageNo) ? pageNo : nextPageNo, text: pageText });
          }
          lastIndex = re.lastIndex;
          nextPageNo = (Number.isFinite(pageNo) ? pageNo : nextPageNo) + 1;
        }

        const tail = raw.slice(lastIndex).trim();
        if (tail.length > 0) {
          pages.push({ pageNo: nextPageNo, text: tail });
        }

        if (pages.length > 0) return pages;

        const cleaned = raw.replace(re, '').trim();
        return cleaned.length > 0 ? [{ pageNo: 1, text: cleaned }] : [];
      } finally {
        try {
          await parser.destroy();
        } catch {
          // ignore
        }
      }
    }

    const candidates: any[] = [mod, mod?.default, mod?.default?.default, mod?.pdfParse, mod?.default?.pdfParse];
    const pdfParse = candidates.find((c) => typeof c === 'function');

    if (typeof pdfParse !== 'function') {
      const keys = mod && typeof mod === 'object' ? Object.keys(mod) : [];
      console.error('[AI][PDF_PARSE_EXPORT_INVALID]', {
        typeofMod: typeof mod,
        keys,
        defaultType: typeof mod?.default,
        defaultDefaultType: typeof mod?.default?.default,
      });
      throw new TypeError('pdf-parse export is not a function (check CJS/ESM interop)');
    }

    const data = await pdfParse(buffer);
    const text = String(data?.text || '').trim();
    return text.length > 0 ? [{ pageNo: 1, text }] : [];
  }

  async parse(buffer: Buffer): Promise<string> {
    const pages = await this.parsePages(buffer);
    return pages.map((p) => p.text).join('\n\n');
  }
}
