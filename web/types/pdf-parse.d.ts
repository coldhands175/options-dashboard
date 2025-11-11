declare module "pdf-parse" {
  // Minimal typing for our use case
  interface PDFParseResult {
    text: string;
    // other fields are omitted
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PDFParseResult>;
  export default pdfParse;
}

// The package's index.js contains debug code that attempts to read a local file when imported
// in certain ESM/bundled environments. We import the internal implementation directly.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult {
    text: string;
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PDFParseResult>;
  export default pdfParse;
}

