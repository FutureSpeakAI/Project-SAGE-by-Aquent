// Type definitions for brief processing to resolve TypeScript errors

export interface PDFTextRun {
  T?: string;
}

export interface PDFTextItem {
  R?: PDFTextRun[];
  x: number;
  y: number;
}

export interface PDFPage {
  Texts?: PDFTextItem[];
}

export interface PDFData {
  Pages?: PDFPage[];
}

export interface PDFErrorData {
  parserError: string;
}