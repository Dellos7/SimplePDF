
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Upload, FileText, Download, PenTool, Eraser, CheckCircle2, Trash2, Loader2, Move, Layout, Check, Maximize2, Scale, ArrowDownRight } from 'lucide-react';
import { signPdf, getPageCount, SignaturePlacement } from '../services/pdfService';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface PdfSignerProps {
  onBack: () => void;
}

interface RectPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Step = 'upload' | 'draw' | 'select-pages' | 'placement';

const PdfSigner: React.FC<PdfSignerProps> = ({ onBack }) => {
  const [file, setFile] = useState<{ name: string; data: ArrayBuffer } | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  
  const [samePositionForAll, setSamePositionForAll] = useState(true);
  const [downloadOnlySigned, setDownloadOnlySigned] = useState(false);
  const [pagePreviews, setPagePreviews] = useState<Record<number, { url: string, width: number, height: number }>>({});
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [placements, setPlacements] = useState<Record<number, RectPosition>>({});
  const [activeDraggingIdx, setActiveDraggingIdx] = useState<number | null>(null);
  const [activeResizingIdx, setActiveResizingIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containersRef = useRef<Record<number, HTMLDivElement | null>>({});

  const loadPagePreview = useCallback(async (buffer: ArrayBuffer, pageNum: number) => {
    if (pagePreviews[pageNum - 1]) return pagePreviews[pageNum - 1];
    
    try {
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);
      // El viewport de PDF.js ya maneja la rotación visual del documento
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        const data = { url: canvas.toDataURL(), width: viewport.width, height: viewport.height };
        
        setPagePreviews(prev => ({ ...prev, [pageNum - 1]: data }));
        return data;
      }
    } catch (err) {
      console.error(`Error loading preview for page ${pageNum}:`, err);
    }
    return null;
  }, [pagePreviews]);

  const generateThumbnails = async (buffer: ArrayBuffer) => {
    setIsLoadingPreviews(true);
    const thumbs: string[] = [];
    try {
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
      const pdf = await loadingTask.promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          thumbs.push(canvas.toDataURL('image/jpeg', 0.7));
        }
      }
      setThumbnails(thumbs);
    } catch (err) {
      console.error('Error generating thumbnails:', err);
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  useEffect(() => {
    if (step === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [step]);

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const saveSignature = () => {
    if (canvasRef.current) {
      setSignatureUrl(canvasRef.current.toDataURL('image/png'));
      setStep('select-pages');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === 'application/pdf') {
      const buffer = await selectedFile.arrayBuffer();
      const count = await getPageCount(buffer.slice(0));
      setFile({ name: selectedFile.name, data: buffer });
      setPageCount(count);
      setSelectedPages([0]);
      generateThumbnails(buffer.slice(0));
      setStep('draw');
    }
  };

  const goToPlacement = async () => {
    if (!file || selectedPages.length === 0) return;
    setIsProcessing(true);
    
    // IMPORTANTE: Cargamos las previsualizaciones de TODAS las páginas seleccionadas
    // para que al desmarcar "Misma posición" no aparezcan vacías.
    for (const p of selectedPages) {
      const preview = await loadPagePreview(file.data, p + 1);
      if (preview && !placements[p]) {
        // Inicializamos posición si no existe
        const initialWidth = preview.width * 0.25;
        const initialHeight = initialWidth * 0.5; 
        setPlacements(prev => ({
          ...prev,
          [p]: { 
            x: preview.width / 2 - initialWidth / 2, 
            y: preview.height - initialHeight - 50, 
            width: initialWidth, 
            height: initialHeight 
          }
        }));
      }
    }
    
    setIsProcessing(false);
    setStep('placement');
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent, pageIdx: number) => {
    if (activeDraggingIdx !== pageIdx && activeResizingIdx !== pageIdx) return;
    
    const container = containersRef.current[pageIdx];
    const preview = pagePreviews[pageIdx];
    const pos = placements[pageIdx];
    if (!container || !preview || !pos) return;

    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const scaleFactorX = preview.width / rect.width;
    const scaleFactorY = preview.height / rect.height;

    const localX = (clientX - rect.left) * scaleFactorX;
    const localY = (clientY - rect.top) * scaleFactorY;

    if (activeResizingIdx === pageIdx) {
      // Redimensionar manteniendo proporción
      const ratio = pos.width / pos.height;
      const newWidth = Math.max(40, localX - pos.x);
      const newHeight = newWidth / ratio;
      
      if (pos.x + newWidth <= preview.width && pos.y + newHeight <= preview.height) {
        setPlacements(prev => ({ 
          ...prev, 
          [pageIdx]: { ...pos, width: newWidth, height: newHeight } 
        }));
      }
    } else if (activeDraggingIdx === pageIdx) {
      // Arrastrar
      const x = Math.max(0, Math.min(localX - pos.width / 2, preview.width - pos.width));
      const y = Math.max(0, Math.min(localY - pos.height / 2, preview.height - pos.height));
      setPlacements(prev => ({ ...prev, [pageIdx]: { ...pos, x, y } }));
    }
  };

  const handleSign = async () => {
    if (!file || !signatureUrl || selectedPages.length === 0) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(file.data.slice(0));
      const pages = pdfDoc.getPages();
      const signatureImageBytes = await fetch(signatureUrl).then((res) => res.arrayBuffer());
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

      for (const pIdx of selectedPages) {
        const sourceIdx = samePositionForAll ? selectedPages[0] : pIdx;
        const pos = placements[sourceIdx];
        const preview = pagePreviews[sourceIdx];
        if (!pos || !preview) continue;

        const page = pages[pIdx];
        // getSize() en pdf-lib ya devuelve las dimensiones visuales (corrigiendo rotación)
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        
        // Factores de escala entre la previsualización del navegador y el PDF real
        const scaleX = pdfWidth / preview.width;
        const scaleY = pdfHeight / preview.height;

        const finalWidth = pos.width * scaleX;
        const finalHeight = pos.height * scaleY;
        const finalX = pos.x * scaleX;
        
        // Inversión de eje Y: 0 es abajo en PDF
        const finalY = pdfHeight - (pos.y * scaleY) - finalHeight;

        page.drawImage(signatureImage, {
          x: finalX,
          y: finalY,
          width: finalWidth,
          height: finalHeight
        });
      }

      let result: Uint8Array;
      if (downloadOnlySigned) {
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(pdfDoc, selectedPages);
        copiedPages.forEach((page) => newPdf.addPage(page));
        result = await newPdf.save();
      } else {
        result = await pdfDoc.save();
      }

      const blob = new Blob([result], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firmado_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error al firmar el documento.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 pb-12 transition-colors">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium">
        <ChevronLeft className="w-5 h-5 mr-1" /> Volver al Panel
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden min-h-[500px] flex flex-col transition-colors">
        {/* Header Steps */}
        <div className="bg-slate-50 dark:bg-slate-950 px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 transition-colors">
          <div className="flex items-center gap-4 md:gap-8 overflow-x-auto no-scrollbar py-2">
            <StepIndicator active={step === 'upload'} completed={!!file} label="1. Subir" />
            <StepIndicator active={step === 'draw'} completed={!!signatureUrl} label="2. Firma" />
            <StepIndicator active={step === 'select-pages'} completed={selectedPages.length > 0 && step !== 'select-pages'} label="3. Páginas" />
            <StepIndicator active={step === 'placement'} completed={false} label="4. Posición" />
          </div>
          {file && (
            <button onClick={() => { setFile(null); setSignatureUrl(null); setStep('upload'); setSelectedPages([]); setPlacements({}); setPagePreviews({}); }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
              <Trash2 className="w-4 h-4" /> Reiniciar
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-grow flex flex-col">
          {step === 'upload' && (
            <div className="p-10 md:p-16 flex flex-col items-center justify-center text-center space-y-6">
              <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-md border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 md:p-12 cursor-pointer hover:border-blue-400 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all group">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />
                <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-6 rounded-2xl w-fit mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Cargar Documento</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Selecciona el PDF que deseas firmar</p>
              </div>
            </div>
          )}

          {step === 'draw' && (
            <div className="p-6 md:p-12 flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Dibuja tu firma</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-center text-sm">Utiliza el ratón o el dedo para firmar.</p>
              
              <div className="relative bg-white border-4 border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner overflow-hidden max-w-full transition-colors">
                <canvas
                  ref={canvasRef} 
                  width={window.innerWidth < 640 ? 300 : 600} 
                  height={300}
                  onMouseDown={(e) => { 
                    setIsDrawing(true); 
                    if (canvasRef.current) {
                      const rect = canvasRef.current.getBoundingClientRect(); 
                      const ctx = canvasRef.current.getContext('2d');
                      if (ctx) {
                        ctx.beginPath();
                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                      }
                    }
                  }}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseOut={() => setIsDrawing(false)}
                  onMouseMove={draw}
                  /* Fix: Using clientY and subtracting rect.top instead of non-existent .top property on touch event */
                  onTouchStart={(e) => { 
                    setIsDrawing(true); 
                    if (canvasRef.current) {
                      const rect = canvasRef.current.getBoundingClientRect(); 
                      const ctx = canvasRef.current.getContext('2d');
                      if (ctx) {
                        ctx.beginPath();
                        ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top); 
                      }
                    }
                  }}
                  onTouchEnd={() => setIsDrawing(false)}
                  onTouchMove={draw}
                  className="touch-none cursor-crosshair bg-white"
                />
                <button onClick={() => { const ctx = canvasRef.current?.getContext('2d'); if (ctx) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,600,300); ctx.beginPath(); } }} className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors">
                  <Eraser className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="mt-12 flex gap-4 w-full justify-center">
                <button onClick={() => setStep('upload')} className="px-8 py-3 font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">Atrás</button>
                <button onClick={saveSignature} className="bg-blue-600 text-white px-12 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all">Continuar</button>
              </div>
            </div>
          )}

          {step === 'select-pages' && (
            <div className="p-6 md:p-12 flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              <div className="max-w-5xl mx-auto w-full space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">¿En qué páginas quieres firmar?</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Selecciona las páginas donde aparecerá tu rúbrica.</p>
                </div>

                <div className="flex gap-4 justify-center">
                  <button onClick={() => setSelectedPages(Array.from({length: pageCount}, (_, i) => i))} className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">Todas</button>
                  <button onClick={() => setSelectedPages([])} className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Ninguna</button>
                </div>

                {isLoadingPreviews ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="font-medium animate-pulse">Cargando páginas...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[450px] overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
                    {thumbnails.map((src, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedPages(prev => prev.includes(i) ? prev.filter(p => p !== i) : [...prev, i].sort((a,b)=>a-b))}
                        className={`group relative cursor-pointer rounded-xl border-4 transition-all overflow-hidden bg-white dark:bg-slate-900 ${
                          selectedPages.includes(i) 
                            ? 'border-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-900/50' 
                            : 'border-white dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <img src={src} alt={`Página ${i+1}`} className="w-full h-auto block select-none" />
                        <div className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors ${
                          selectedPages.includes(i) ? 'bg-blue-600 text-white' : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                        }`}>
                          {i + 1}
                        </div>
                        {selectedPages.includes(i) && (
                          <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-10 h-10 text-blue-600 drop-shadow-md" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-center pt-8">
                  <button disabled={selectedPages.length === 0} onClick={goToPlacement} className="bg-blue-600 text-white w-full max-w-sm py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:shadow-none transition-all flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : <Move className="w-5 h-5" />}
                    Confirmar y Posicionar
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'placement' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-50 dark:bg-slate-950 px-4 md:px-8 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10 transition-colors">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={samePositionForAll} onChange={() => setSamePositionForAll(!samePositionForAll)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Misma posición</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={downloadOnlySigned} onChange={() => setDownloadOnlySigned(!downloadOnlySigned)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 rounded-full peer-checked:bg-purple-600 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Solo firmadas</span>
                  </label>
                </div>
                <button onClick={handleSign} disabled={isProcessing} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-green-100 dark:shadow-none hover:bg-green-700 flex items-center gap-2 transition-all text-sm w-full md:w-auto justify-center">
                  {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                  Finalizar PDF
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 md:p-8 bg-slate-100 dark:bg-slate-950 flex flex-col items-center gap-8 min-h-[400px] transition-colors">
                {(samePositionForAll ? [selectedPages[0]] : selectedPages).map((pIdx) => {
                  const preview = pagePreviews[pIdx];
                  const pos = placements[pIdx];
                  if (!preview || !pos) return null;

                  return (
                    <div key={pIdx} className="flex flex-col items-center gap-4 w-full max-w-full">
                      <span className="bg-white dark:bg-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-800 uppercase tracking-widest">
                        Página {pIdx + 1} {samePositionForAll && selectedPages.length > 1 && `(Patrón)`}
                      </span>
                      
                      <div className="w-full flex justify-center items-start">
                        <div
                          ref={el => { containersRef.current[pIdx] = el; }}
                          onMouseMove={(e) => handlePointerMove(e, pIdx)}
                          onMouseUp={() => { setActiveDraggingIdx(null); setActiveResizingIdx(null); }}
                          onTouchMove={(e) => handlePointerMove(e, pIdx)}
                          onTouchEnd={() => { setActiveDraggingIdx(null); setActiveResizingIdx(null); }}
                          className="relative shadow-2xl bg-white border-4 border-white select-none touch-none mx-auto overflow-hidden rounded-sm"
                          style={{ 
                            width: '100%',
                            maxWidth: `${preview.width}px`,
                            aspectRatio: `${preview.width} / ${preview.height}`,
                          }}
                        >
                          <img src={preview.url} alt={`Preview ${pIdx+1}`} className="w-full h-full pointer-events-none block" />
                          
                          {signatureUrl && (
                            <div
                              className={`absolute transition-all ${
                                activeDraggingIdx === pIdx || activeResizingIdx === pIdx 
                                  ? 'ring-4 ring-blue-500/50 scale-[1.02]' 
                                  : 'hover:ring-2 hover:ring-blue-400'
                              }`}
                              style={{ 
                                left: `${(pos.x / preview.width) * 100}%`, 
                                top: `${(pos.y / preview.height) * 100}%`, 
                                width: `${(pos.width / preview.width) * 100}%`, 
                                height: `${(pos.height / preview.height) * 100}%` 
                              }}
                            >
                              {/* Área de arrastre */}
                              <div 
                                onMouseDown={(e) => { e.preventDefault(); setActiveDraggingIdx(pIdx); }}
                                onTouchStart={() => setActiveDraggingIdx(pIdx)}
                                className="w-full h-full cursor-move"
                              >
                                <img src={signatureUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
                              </div>

                              {/* Tirador de redimensionamiento con flecha diagonal */}
                              <div 
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setActiveResizingIdx(pIdx); }}
                                onTouchStart={(e) => { e.stopPropagation(); setActiveResizingIdx(pIdx); }}
                                className="absolute -bottom-3 -right-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-nwse-resize z-20 active:scale-90 transition-transform hover:bg-blue-700"
                              >
                                <ArrowDownRight className="w-5 h-5" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StepIndicator: React.FC<{ active: boolean; completed: boolean; label: string }> = ({ active, completed, label }) => (
  <div className={`flex items-center gap-2 transition-colors shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : completed ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-600'}`}>
    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
      active ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-100 dark:shadow-none' : 
      completed ? 'bg-green-500 border-green-500 text-white' : 
      'bg-transparent border-slate-200 dark:border-slate-800'
    }`}>
      {completed ? <Check className="w-3 h-3" /> : label.split('.')[0]}
    </div>
    <span className={`text-[10px] md:text-sm font-bold whitespace-nowrap ${active ? 'opacity-100' : 'opacity-70'}`}>{label.split('. ')[1] || label}</span>
  </div>
);

export default PdfSigner;
