declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult {
    text: string;
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PDFParseResult>;
  export default pdfParse;
}
