
import { PDFDocument, rgb } from 'pdf-lib';

export interface FileData {
  name: string;
  data: ArrayBuffer;
}

export interface SignaturePlacement {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const splitPdf = async (fileData: ArrayBuffer, pageIndices: number[]): Promise<Uint8Array> => {
  const originalPdf = await PDFDocument.load(fileData);
  const newPdf = await PDFDocument.create();
  
  const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  
  return await newPdf.save();
};

export const mergePdfs = async (files: ArrayBuffer[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  
  for (const fileData of files) {
    const pdf = await PDFDocument.load(fileData);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
};

export const signPdf = async (
  fileData: ArrayBuffer, 
  signatureDataUrl: string, 
  placements: SignaturePlacement[]
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(fileData);
  
  // Extraer bytes de la firma
  const signatureImageBytes = await fetch(signatureDataUrl).then((res) => res.arrayBuffer());
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

  const pages = pdfDoc.getPages();
  
  for (const placement of placements) {
    if (placement.pageIndex >= 0 && placement.pageIndex < pages.length) {
      const page = pages[placement.pageIndex];
      page.drawImage(signatureImage, {
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      });
    }
  }

  return await pdfDoc.save();
};

export const getPageCount = async (fileData: ArrayBuffer): Promise<number> => {
  const pdfDoc = await PDFDocument.load(fileData);
  return pdfDoc.getPageCount();
};
