
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Upload, FileText, Download, PenTool, Eraser, CheckCircle2, Trash2, Loader2, Move, Layout, Check } from 'lucide-react';
import { signPdf, getPageCount, SignaturePlacement } from '../services/pdfService';
import { PDFDocument } from 'pdf-lib';
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
  
  // Configuración de posicionamiento
  const [samePositionForAll, setSamePositionForAll] = useState(true);
  const [downloadOnlySigned, setDownloadOnlySigned] = useState(false);
  const [pagePreviews, setPagePreviews] = useState<Record<number, { url: string, width: number, height: number }>>({});
  const [placements, setPlacements] = useState<Record<number, RectPosition>>({});
  const [activeDraggingIdx, setActiveDraggingIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containersRef = useRef<Record<number, HTMLDivElement | null>>({});

  // Cargar previsualización de una página específica
  const loadPagePreview = useCallback(async (buffer: ArrayBuffer, pageNum: number) => {
    if (pagePreviews[pageNum - 1]) return pagePreviews[pageNum - 1];
    
    try {
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      
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

  // Dibujo de firma
  useEffect(() => {
    if (step === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [step]);

  // Efecto para cargar páginas faltantes si se cambia el toggle de "misma posición"
  useEffect(() => {
    const loadMissing = async () => {
      if (step === 'placement' && file && !samePositionForAll) {
        setIsProcessing(true);
        for (const p of selectedPages) {
          if (!pagePreviews[p]) {
            const preview = await loadPagePreview(file.data, p + 1);
            if (preview && !placements[p]) {
              setPlacements(prev => ({
                ...prev,
                [p]: { x: preview.width / 2 - 75, y: preview.height - 150, width: 150, height: 75 }
              }));
            }
          }
        }
        setIsProcessing(false);
      }
    };
    loadMissing();
  }, [samePositionForAll, step, file, selectedPages, loadPagePreview, pagePreviews, placements]);

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
      setStep('draw');
    }
  };

  const goToPlacement = async () => {
    if (!file || selectedPages.length === 0) return;
    setIsProcessing(true);
    
    const pagesToLoad = samePositionForAll ? [selectedPages[0]] : selectedPages;
    for (const p of pagesToLoad) {
      const preview = await loadPagePreview(file.data, p + 1);
      if (preview && !placements[p]) {
        setPlacements(prev => ({
          ...prev,
          [p]: { x: preview.width / 2 - 75, y: preview.height - 150, width: 150, height: 75 }
        }));
      }
    }
    
    setIsProcessing(false);
    setStep('placement');
  };

  const handlePlacementMove = (e: React.MouseEvent | React.TouchEvent, pageIdx: number) => {
    if (activeDraggingIdx !== pageIdx) return;
    const container = containersRef.current[pageIdx];
    const preview = pagePreviews[pageIdx];
    const pos = placements[pageIdx];
    
    if (!container || !preview || !pos) return;

    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(clientX - rect.left - pos.width / 2, preview.width - pos.width));
    const y = Math.max(0, Math.min(clientY - rect.top - pos.height / 2, preview.height - pos.height));
    
    setPlacements(prev => ({ ...prev, [pageIdx]: { ...pos, x, y } }));
  };

  const handleSign = async () => {
    if (!file || !signatureUrl || selectedPages.length === 0) return;
    setIsProcessing(true);
    try {
      const finalPlacements: SignaturePlacement[] = [];

      for (const pIdx of selectedPages) {
        const sourceIdx = samePositionForAll ? selectedPages[0] : pIdx;
        const pos = placements[sourceIdx];
        const preview = pagePreviews[sourceIdx];

        if (!pos || !preview) continue;

        const loadingTask = pdfjsLib.getDocument({ data: file.data.slice(0) });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pIdx + 1);
        const { width: pdfWidth, height: pdfHeight } = page.getViewport({ scale: 1 });

        const scaleX = pdfWidth / preview.width;
        const scaleY = pdfHeight / preview.height;

        finalPlacements.push({
          pageIndex: pIdx,
          x: pos.x * scaleX,
          y: (preview.height - pos.y - pos.height) * scaleY,
          width: pos.width * scaleX,
          height: pos.height * scaleY
        });
      }

      let result: Uint8Array;
      
      if (downloadOnlySigned) {
        // Lógica para exportar solo las páginas firmadas
        const originalPdf = await PDFDocument.load(file.data);
        const newPdf = await PDFDocument.create();
        
        // Copiamos solo las páginas seleccionadas
        const copiedPages = await newPdf.copyPages(originalPdf, selectedPages);
        copiedPages.forEach((page) => newPdf.addPage(page));
        
        // Embeber la firma en el nuevo documento
        const signatureImageBytes = await fetch(signatureUrl).then((res) => res.arrayBuffer());
        const signatureImage = await newPdf.embedPng(signatureImageBytes);
        
        const pages = newPdf.getPages();
        for (let i = 0; i < selectedPages.length; i++) {
          const originalIdx = selectedPages[i];
          const sourceIdx = samePositionForAll ? selectedPages[0] : originalIdx;
          const pos = placements[sourceIdx];
          const preview = pagePreviews[sourceIdx];
          
          if (!pos || !preview) continue;
          
          const page = pages[i];
          const pdfWidth = page.getWidth();
          const pdfHeight = page.getHeight();
          const scaleX = pdfWidth / preview.width;
          const scaleY = pdfHeight / preview.height;

          page.drawImage(signatureImage, {
            x: pos.x * scaleX,
            y: (preview.height - pos.y - pos.height) * scaleY,
            width: pos.width * scaleX,
            height: pos.height * scaleY,
          });
        }
        result = await newPdf.save();
      } else {
        // Comportamiento normal: todas las páginas
        result = await signPdf(file.data.slice(0), signatureUrl, finalPlacements);
      }

      const blob = new Blob([result], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firmado_${downloadOnlySigned ? 'solo_paginas_' : ''}${file.name}`;
      a.click();
    } catch (err) {
      console.error(err);
      alert('Error al firmar.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium">
        <ChevronLeft className="w-5 h-5 mr-1" /> Volver al Panel
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
        {/* Header Steps */}
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-8">
            <StepIndicator active={step === 'upload'} completed={!!file} label="1. Subir" />
            <StepIndicator active={step === 'draw'} completed={!!signatureUrl} label="2. Firma" />
            <StepIndicator active={step === 'select-pages'} completed={selectedPages.length > 0 && step !== 'select-pages'} label="3. Páginas" />
            <StepIndicator active={step === 'placement'} completed={false} label="4. Posición" />
          </div>
          {file && (
            <button onClick={() => { setFile(null); setSignatureUrl(null); setStep('upload'); setSelectedPages([]); setPlacements({}); setPagePreviews({}); }} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
              <Trash2 className="w-4 h-4" /> Reiniciar
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-grow flex flex-col">
          {step === 'upload' && (
            <div className="p-16 flex flex-col items-center justify-center text-center space-y-6">
              <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-md border-4 border-dashed border-slate-200 rounded-3xl p-12 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf" />
                <div className="bg-blue-100 text-blue-600 p-6 rounded-2xl w-fit mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Upload className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Cargar Documento</h3>
                <p className="text-slate-500 mt-2">Selecciona el PDF que deseas firmar</p>
              </div>
            </div>
          )}

          {step === 'draw' && (
            <div className="p-12 flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Dibuja tu firma</h2>
              <p className="text-slate-500 mb-8 text-center">Utiliza el ratón o el dedo para firmar en el lienzo blanco</p>
              
              <div className="relative bg-white border-2 border-slate-200 rounded-2xl shadow-inner overflow-hidden">
                <canvas
                  ref={canvasRef} width={600} height={300}
                  onMouseDown={(e) => { 
                    setIsDrawing(true); 
                    if (canvasRef.current) {
                      const rect = canvasRef.current.getBoundingClientRect(); 
                      const ctx = canvasRef.current.getContext('2d');
                      if (ctx) ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                    }
                  }}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseOut={() => setIsDrawing(false)}
                  onMouseMove={draw}
                  onTouchStart={(e) => { 
                    setIsDrawing(true); 
                    if (canvasRef.current) {
                      const rect = canvasRef.current.getBoundingClientRect(); 
                      const ctx = canvasRef.current.getContext('2d');
                      if (ctx) ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top); 
                    }
                  }}
                  onTouchEnd={() => setIsDrawing(false)}
                  onTouchMove={draw}
                  className="touch-none cursor-crosshair"
                />
                <button onClick={() => { const ctx = canvasRef.current?.getContext('2d'); if (ctx) { ctx.clearRect(0,0,600,300); ctx.beginPath(); } }} className="absolute bottom-4 right-4 bg-white border border-slate-200 p-3 rounded-xl hover:bg-slate-50 shadow-sm">
                  <Eraser className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <div className="mt-12 flex gap-4">
                <button onClick={() => setStep('upload')} className="px-8 py-3 font-bold text-slate-500 hover:text-slate-800">Atrás</button>
                <button onClick={saveSignature} className="bg-blue-600 text-white px-12 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Continuar</button>
              </div>
            </div>
          )}

          {step === 'select-pages' && (
            <div className="p-12 flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              <div className="max-w-4xl mx-auto w-full space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-800">¿En qué páginas quieres firmar?</h2>
                  <p className="text-slate-500">Selecciona las páginas donde aparecerá tu firma.</p>
                </div>

                <div className="flex gap-4 justify-center">
                  <button onClick={() => setSelectedPages(Array.from({length: pageCount}, (_, i) => i))} className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors">Todas</button>
                  <button onClick={() => setSelectedPages([])} className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">Ninguna</button>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 max-h-[300px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPages(prev => prev.includes(i) ? prev.filter(p => p !== i) : [...prev, i].sort((a,b)=>a-b))}
                      className={`aspect-square flex items-center justify-center rounded-xl border-2 transition-all font-bold ${
                        selectedPages.includes(i) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <button disabled={selectedPages.length === 0} onClick={goToPlacement} className="bg-blue-600 text-white px-16 py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-200 disabled:shadow-none transition-all flex items-center gap-2">
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Move className="w-5 h-5" />}
                    Confirmar páginas y Posicionar
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'placement' && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-8">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={samePositionForAll} onChange={() => setSamePositionForAll(!samePositionForAll)} className="sr-only peer" />
                      <div className="w-12 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
                    </div>
                    <span className="font-bold text-slate-700">Misma posición</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" checked={downloadOnlySigned} onChange={() => setDownloadOnlySigned(!downloadOnlySigned)} className="sr-only peer" />
                      <div className="w-12 h-6 bg-slate-300 rounded-full peer-checked:bg-purple-600 transition-colors"></div>
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
                    </div>
                    <span className="font-bold text-slate-700">Descargar solo firmadas</span>
                  </label>
                </div>
                
                <button onClick={handleSign} disabled={isProcessing} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-100 hover:bg-green-700 flex items-center gap-2 transition-all">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Download className="w-5 h-5" />}
                  Finalizar y Descargar PDF
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 bg-slate-200 flex flex-col items-center gap-12">
                {isProcessing && Object.keys(pagePreviews).length < (samePositionForAll ? 1 : selectedPages.length) && (
                  <div className="flex flex-col items-center gap-4 py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-slate-500 font-medium">Preparando previsualizaciones...</p>
                  </div>
                )}
                
                {(samePositionForAll ? [selectedPages[0]] : selectedPages).map((pIdx) => {
                  const preview = pagePreviews[pIdx];
                  const pos = placements[pIdx];
                  if (!preview || !pos) return null;

                  return (
                    <div key={pIdx} className="flex flex-col items-center gap-3">
                      <span className="bg-white px-4 py-1.5 rounded-full text-xs font-black text-slate-500 shadow-sm uppercase tracking-widest">
                        Página {pIdx + 1} {samePositionForAll && selectedPages.length > 1 && `(Maestra)`}
                      </span>
                      <div
                        ref={el => { containersRef.current[pIdx] = el; }}
                        onMouseMove={(e) => handlePlacementMove(e, pIdx)}
                        onMouseUp={() => setActiveDraggingIdx(null)}
                        onTouchMove={(e) => handlePlacementMove(e, pIdx)}
                        onTouchEnd={() => setActiveDraggingIdx(null)}
                        className="relative shadow-2xl bg-white border-4 border-white rounded-sm select-none touch-none overflow-hidden"
                        style={{ width: `${preview.width}px`, height: `${preview.height}px` }}
                      >
                        <img src={preview.url} alt={`Preview page ${pIdx+1}`} className="w-full h-full pointer-events-none" />
                        
                        {signatureUrl && (
                          <div
                            onMouseDown={(e) => { e.preventDefault(); setActiveDraggingIdx(pIdx); }}
                            onTouchStart={() => setActiveDraggingIdx(pIdx)}
                            className={`absolute cursor-move transition-shadow ${activeDraggingIdx === pIdx ? 'ring-4 ring-blue-500/50 shadow-2xl' : 'hover:ring-2 hover:ring-blue-400'}`}
                            style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${pos.width}px`, height: `${pos.height}px` }}
                          >
                            <img src={signatureUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
                            <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg">
                              <Move className="w-3 h-3" />
                            </div>
                          </div>
                        )}
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
  <div className={`flex items-center gap-3 transition-colors ${active ? 'text-blue-600' : completed ? 'text-green-600' : 'text-slate-400'}`}>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
      active ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg shadow-blue-100' : 
      completed ? 'bg-green-500 border-green-500 text-white' : 
      'bg-transparent border-slate-200'
    }`}>
      {completed ? <Check className="w-4 h-4" /> : label.split('.')[0]}
    </div>
    <span className={`text-sm font-bold ${active ? 'opacity-100' : 'opacity-70'}`}>{label.split('. ')[1] || label}</span>
  </div>
);

export default PdfSigner;
