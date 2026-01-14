
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Upload, FileText, Download, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { splitPdf, getPageCount } from '../services/pdfService';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface PdfSplitterProps {
  onBack: () => void;
}

const PdfSplitter: React.FC<PdfSplitterProps> = ({ onBack }) => {
  const [file, setFile] = useState<{ name: string; data: ArrayBuffer } | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generatePreviews = async (buffer: ArrayBuffer) => {
    setIsLoadingPreviews(true);
    const previewsArray: string[] = [];
    try {
      // IMPORTANTE: Usamos una copia del buffer (.slice(0)) porque PDF.js puede "desvincular" (detach) 
      // el ArrayBuffer al transferirlo al worker por rendimiento.
      const bufferCopy = buffer.slice(0);
      const loadingTask = pdfjsLib.getDocument({ data: bufferCopy });
      const pdf = await loadingTask.promise;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 }); // Escala baja para miniaturas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Fix: Add required 'canvas' property to satisfy type definitions in pdfjs-dist 4.x
          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
          }).promise;
          
          previewsArray.push(canvas.toDataURL('image/jpeg', 0.7));
        }
      }
      setPreviews(previewsArray);
    } catch (err) {
      console.error('Error generating previews:', err);
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      try {
        const buffer = await selectedFile.arrayBuffer();
        // Usamos copias para evitar que las librerías desvinculen el buffer principal
        const count = await getPageCount(buffer.slice(0));
        setFile({ name: selectedFile.name, data: buffer });
        setPageCount(count);
        setSelectedPages([]);
        generatePreviews(buffer.slice(0));
      } catch (err) {
        console.error('Error loading file:', err);
        alert('Error al cargar el archivo PDF.');
      }
    }
  };

  const togglePage = (index: number) => {
    setSelectedPages(prev => 
      prev.includes(index) 
        ? prev.filter(p => p !== index) 
        : [...prev, index].sort((a, b) => a - b)
    );
  };

  const handleSplit = async () => {
    if (!file || selectedPages.length === 0) return;
    setIsProcessing(true);
    try {
      // Pasamos una copia por seguridad, aunque pdf-lib suele ser menos agresivo que PDF.js
      const result = await splitPdf(file.data.slice(0), selectedPages);
      const blob = new Blob([result], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extraido_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error splitting PDF:', err);
      alert('Hubo un error al procesar el PDF. Prueba a subir el archivo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Volver al Panel
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Separar PDF</h2>
            <p className="text-slate-500 text-sm">Haz clic en las páginas para seleccionarlas.</p>
          </div>
          {file && (
            <button 
              onClick={() => { setFile(null); setPreviews([]); }}
              className="text-slate-400 hover:text-red-500 p-2 transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Quitar archivo
            </button>
          )}
        </div>

        {!file ? (
          <div className="p-12 text-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-xl p-12 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".pdf"
              />
              <div className="bg-blue-100 text-blue-600 p-4 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-slate-700 font-semibold text-lg">Sube un PDF para ver sus páginas</p>
              <p className="text-slate-400 text-sm mt-1">El procesamiento es 100% privado y local</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-blue-600 p-2 rounded-lg shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                  <p className="text-slate-500 text-xs">{pageCount} páginas totales</p>
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => setSelectedPages(Array.from({ length: pageCount }, (_, i) => i))}
                  className="text-xs font-bold text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
                >
                  Todas
                </button>
                <button 
                  onClick={() => setSelectedPages([])}
                  className="text-xs font-bold text-slate-500 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
                >
                  Ninguna
                </button>
              </div>
            </div>

            {isLoadingPreviews ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-medium animate-pulse">Generando vistas previas...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    onClick={() => togglePage(i)}
                    className={`group relative cursor-pointer rounded-xl border-4 transition-all overflow-hidden bg-slate-100 ${
                      selectedPages.includes(i) 
                        ? 'border-blue-500 shadow-md ring-2 ring-blue-200' 
                        : 'border-white hover:border-slate-200 shadow-sm'
                    }`}
                  >
                    <img 
                      src={src} 
                      alt={`Página ${i + 1}`} 
                      className="w-full h-auto block select-none"
                    />
                    
                    <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                      selectedPages.includes(i) 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-slate-700 group-hover:bg-slate-100'
                    }`}>
                      {i + 1}
                    </div>

                    {selectedPages.includes(i) && (
                      <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                        <div className="bg-white rounded-full p-1 shadow-lg">
                          <CheckCircle2 className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    )}
                    
                    {!selectedPages.includes(i) && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="sticky bottom-4 left-0 right-0 pt-4 flex justify-end">
              <button
                onClick={handleSplit}
                disabled={selectedPages.length === 0 || isProcessing}
                className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${
                  selectedPages.length === 0 || isProcessing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Descargar {selectedPages.length} {selectedPages.length === 1 ? 'página' : 'páginas'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfSplitter;
