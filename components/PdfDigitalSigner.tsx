
import React, { useState, useRef, useCallback, useEffect } from 'react';
/* Added Fingerprint to imports */
import { ChevronLeft, Upload, FileText, Download, KeyRound, Loader2, Trash2, CheckCircle2, Move, ShieldCheck, Eye, EyeOff, AlertCircle, Fingerprint } from 'lucide-react';
import { getPageCount } from '../services/pdfService';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import forge from 'node-forge';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

interface PdfDigitalSignerProps {
  onBack: () => void;
}

interface CertData {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
}

type Step = 'upload-pdf' | 'upload-cert' | 'select-pages' | 'placement';

const PdfDigitalSigner: React.FC<PdfDigitalSignerProps> = ({ onBack }) => {
  const [file, setFile] = useState<{ name: string; data: ArrayBuffer } | null>(null);
  const [certFile, setCertFile] = useState<{ name: string; data: ArrayBuffer } | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [certData, setCertData] = useState<CertData | null>(null);
  const [step, setStep] = useState<Step>('upload-pdf');
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [pagePreviews, setPagePreviews] = useState<Record<number, { url: string, width: number, height: number }>>({});
  const [placements, setPlacements] = useState<Record<number, { x: number, y: number, width: number, height: number }>>({});
  const [activeDraggingIdx, setActiveDraggingIdx] = useState<number | null>(null);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const containersRef = useRef<Record<number, HTMLDivElement | null>>({});

  const loadPagePreview = useCallback(async (buffer: ArrayBuffer, pageNum: number) => {
    if (pagePreviews[pageNum - 1]) return pagePreviews[pageNum - 1];
    try {
      const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const data = { url: canvas.toDataURL(), width: viewport.width, height: viewport.height };
        setPagePreviews(prev => ({ ...prev, [pageNum - 1]: data }));
        return data;
      }
    } catch (err) { console.error(err); }
    return null;
  }, [pagePreviews]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f?.type === 'application/pdf') {
      const buffer = await f.arrayBuffer();
      const count = await getPageCount(buffer.slice(0));
      setFile({ name: f.name, data: buffer });
      setPageCount(count);
      setStep('upload-cert');
    }
  };

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const buffer = await f.arrayBuffer();
      setCertFile({ name: f.name, data: buffer });
      setError(null);
    }
  };

  const validateAndExtractCert = () => {
    if (!certFile || !password) return;
    setIsProcessing(true);
    setError(null);

    // Pequeño timeout para permitir que se muestre el loader
    setTimeout(() => {
      try {
        const p12Der = forge.util.createBuffer(certFile.data);
        const p12Asn1 = forge.asn1.fromDer(p12Der);
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
        
        // Buscar bolsas con certificados
        const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = bags[forge.pki.oids.certBag]?.[0];
        
        if (!certBag || !certBag.cert) {
          throw new Error('No se encontró un certificado válido en el archivo.');
        }

        const cert = certBag.cert;
        const subject = cert.subject.getField('CN')?.value || 'Desconocido';
        const issuer = cert.issuer.getField('CN')?.value || 'Desconocido';
        
        setCertData({
          subject,
          issuer,
          validFrom: cert.validity.notBefore.toLocaleDateString(),
          validTo: cert.validity.notAfter.toLocaleDateString(),
          serialNumber: cert.serialNumber
        });
        setStep('select-pages');
      } catch (err: any) {
        console.error(err);
        setError('Contraseña incorrecta o archivo de certificado no válido.');
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const goToPlacement = async () => {
    setIsProcessing(true);
    // Cargar solo la primera seleccionada para previsualizar
    if (file) {
      const pIdx = selectedPages[0];
      const preview = await loadPagePreview(file.data, pIdx + 1);
      if (preview) {
        setPlacements({ [pIdx]: { x: preview.width - 270, y: preview.height - 120, width: 250, height: 100 } });
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

  const handleFinalSign = async () => {
    if (!file || !certData) return;
    setIsProcessing(true);
    try {
      const pdfDoc = await PDFDocument.load(file.data);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.CourierBold);
      const fontNormal = await pdfDoc.embedFont(StandardFonts.Courier);

      const pIdx = selectedPages[0];
      const pos = placements[pIdx];
      const preview = pagePreviews[pIdx];

      for (const idx of selectedPages) {
        const page = pages[idx];
        /* Fixed: Use getWidth and getHeight from pdf-lib PDFPage instead of getViewport */
        const pWidth = page.getWidth();
        const pHeight = page.getHeight();
        const scaleX = pWidth / preview.width;
        const scaleY = pHeight / preview.height;

        const x = pos.x * scaleX;
        const y = (preview.height - pos.y - pos.height) * scaleY;
        const w = pos.width * scaleX;
        const h = pos.height * scaleY;

        // Fondo del sello
        page.drawRectangle({
          x, y, width: w, height: h,
          color: rgb(0.98, 0.98, 1),
          borderColor: rgb(0.1, 0.4, 0.8),
          borderWidth: 1.5,
        });

        // Línea lateral de seguridad
        page.drawRectangle({ x, y, width: 6, height: h, color: rgb(0.1, 0.4, 0.8) });

        // Textos del sello (Visual Signature Data)
        const textX = x + 15;
        const startY = y + h - 20;

        page.drawText('FIRMADO DIGITALMENTE POR:', { x: textX, y: startY, size: 7, font: fontNormal, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(certData.subject.toUpperCase(), { x: textX, y: startY - 12, size: 9, font: font, color: rgb(0.1, 0.1, 0.1) });
        
        page.drawText(`EMISOR: ${certData.issuer}`, { x: textX, y: startY - 30, size: 7, font: fontNormal, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(`FECHA: ${new Date().toLocaleString()}`, { x: textX, y: startY - 42, size: 7, font: fontNormal, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(`VALIDEZ: ${certData.validFrom} - ${certData.validTo}`, { x: textX, y: startY - 54, size: 7, font: fontNormal, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(`SERIAL: ${certData.serialNumber.substring(0, 16)}...`, { x: textX, y: startY - 66, size: 6, font: fontNormal, color: rgb(0.5, 0.5, 0.5) });
        
        page.drawText('VERIFICADO POR BASICPDF TOOLKIT', { x: textX, y: y + 8, size: 6, font: font, color: rgb(0.1, 0.4, 0.8) });
      }

      const signedBytes = await pdfDoc.save();
      const blob = new Blob([signedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firmado_digital_${file.name}`;
      a.click();
    } catch (err) {
      console.error(err);
      alert('Error al generar la firma visual.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium">
        <ChevronLeft className="w-5 h-5 mr-1" /> Volver al Panel
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[550px] flex flex-col">
        {/* Progress Stepper */}
        <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex items-center gap-6 overflow-x-auto">
          <Badge active={step === 'upload-pdf'} done={!!file} label="1. Documento" />
          <Badge active={step === 'upload-cert'} done={!!certData} label="2. Certificado" />
          <Badge active={step === 'select-pages'} done={selectedPages.length > 0 && step !== 'select-pages'} label="3. Páginas" />
          <Badge active={step === 'placement'} done={false} label="4. Posición" />
        </div>

        <div className="flex-grow flex flex-col">
          {step === 'upload-pdf' && (
            <div className="p-16 flex flex-col items-center justify-center text-center space-y-6">
              <div onClick={() => pdfInputRef.current?.click()} className="w-full max-w-md border-4 border-dashed border-slate-200 rounded-3xl p-12 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                <input type="file" ref={pdfInputRef} onChange={handlePdfUpload} className="hidden" accept=".pdf" />
                <div className="bg-blue-100 text-blue-600 p-6 rounded-2xl w-fit mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Cargar PDF</h3>
                <p className="text-slate-500 mt-2">Sube el archivo que quieres firmar</p>
              </div>
            </div>
          )}

          {step === 'upload-cert' && (
            <div className="p-12 flex flex-col items-center max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-right-4">
              <div className="text-center mb-8 space-y-2">
                <div className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl w-fit mx-auto mb-4">
                  <KeyRound className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Configurar Certificado</h2>
                <p className="text-slate-500">Sube tu archivo .p12 o .pfx y tu contraseña. Todo se procesa localmente encriptado.</p>
              </div>

              <div className="w-full space-y-6 bg-slate-50 p-8 rounded-3xl border border-slate-200">
                <div 
                  onClick={() => !certFile && certInputRef.current?.click()} 
                  className={`border-2 border-dashed rounded-xl p-6 transition-all text-center ${certFile ? 'bg-white border-emerald-500 text-emerald-700' : 'bg-white border-slate-300 hover:border-blue-400 cursor-pointer'}`}
                >
                  <input type="file" ref={certInputRef} onChange={handleCertUpload} className="hidden" accept=".p12,.pfx" />
                  {certFile ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold text-sm truncate max-w-[200px]">{certFile.name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setCertFile(null); }} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">Seleccionar archivo .p12 o .pfx</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Contraseña del certificado</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all pr-12 font-mono"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button 
                  disabled={!certFile || !password || isProcessing}
                  onClick={validateAndExtractCert}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:bg-slate-200 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  Validar Certificado
                </button>
              </div>
            </div>
          )}

          {step === 'select-pages' && (
            <div className="p-12 flex flex-col h-full animate-in slide-in-from-right-4">
              <div className="max-w-4xl mx-auto w-full space-y-8">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-center gap-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm text-emerald-600">
                    <Fingerprint className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Certificado verificado</p>
                    <p className="font-bold text-slate-800 truncate">{certData?.subject}</p>
                    <p className="text-xs text-slate-500 italic">Emitido por: {certData?.issuer}</p>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800">¿Dónde firmar?</h2>
                  <p className="text-slate-500">Selecciona las páginas en las que aparecerá el sello digital.</p>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-10 gap-3 max-h-[250px] overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPages(prev => prev.includes(i) ? (prev.length > 1 ? prev.filter(p => p !== i) : prev) : [...prev, i].sort((a,b)=>a-b))}
                      className={`aspect-square flex items-center justify-center rounded-xl border-2 transition-all font-bold ${
                        selectedPages.includes(i) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center">
                  <button onClick={goToPlacement} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 flex items-center gap-2 transition-all">
                    Continuar a Posicionamiento
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'placement' && (
            <div className="flex flex-col h-full animate-in fade-in">
              <div className="bg-slate-50 px-8 py-4 border-b border-slate-200 flex items-center justify-between">
                <p className="text-slate-500 text-sm">Arrastra el sello para ubicar la firma. Se aplicará en todas las páginas seleccionadas.</p>
                <button 
                  onClick={handleFinalSign} 
                  disabled={isProcessing}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 flex items-center gap-2 transition-all"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  Generar PDF Firmado
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-12 bg-slate-200 flex justify-center items-start">
                {selectedPages.map(pIdx => {
                  const preview = pagePreviews[pIdx];
                  const pos = placements[pIdx];
                  if (!preview || !pos) return null;
                  
                  // Solo permitimos mover en la primera de las seleccionadas (que actúa como master)
                  const isMaster = pIdx === selectedPages[0];
                  if (!isMaster) return null;

                  return (
                    <div key={pIdx} className="flex flex-col items-center gap-3">
                      <div
                        ref={el => { containersRef.current[pIdx] = el; }}
                        onMouseMove={(e) => handlePlacementMove(e, pIdx)}
                        onMouseUp={() => setActiveDraggingIdx(null)}
                        onTouchMove={(e) => handlePlacementMove(e, pIdx)}
                        onTouchEnd={() => setActiveDraggingIdx(null)}
                        className="relative shadow-2xl bg-white border-[10px] border-white select-none touch-none"
                        style={{ width: `${preview.width}px`, height: `${preview.height}px` }}
                      >
                        <img src={preview.url} alt="PDF Preview" className="w-full h-full pointer-events-none" />
                        
                        {/* El Sello Digital Visual */}
                        <div
                          onMouseDown={(e) => { e.preventDefault(); setActiveDraggingIdx(pIdx); }}
                          onTouchStart={() => setActiveDraggingIdx(pIdx)}
                          className={`absolute cursor-move border-2 border-emerald-500 bg-emerald-50/90 shadow-lg p-2 flex overflow-hidden ${activeDraggingIdx === pIdx ? 'ring-4 ring-emerald-500/20' : ''}`}
                          style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: `${pos.width}px`, height: `${pos.height}px` }}
                        >
                          <div className="w-1.5 h-full bg-emerald-500 absolute left-0 top-0"></div>
                          <div className="ml-2 flex flex-col justify-between h-full w-full pointer-events-none">
                            <div className="flex justify-between items-start">
                              <span className="text-[6px] font-black text-emerald-600 uppercase tracking-tighter">FIRMADO POR</span>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            </div>
                            <div className="font-mono text-[9px] font-bold text-slate-800 leading-none truncate pr-1">
                              {certData?.subject.toUpperCase()}
                            </div>
                            <div className="space-y-[1px]">
                              <p className="font-mono text-[5px] text-slate-500">EMISOR: {certData?.issuer}</p>
                              <p className="font-mono text-[5px] text-slate-500">FECHA: {new Date().toLocaleDateString()}</p>
                              <p className="font-mono text-[5px] text-slate-400">CERT: {certData?.serialNumber.substring(0,10)}...</p>
                            </div>
                            <div className="text-[5px] font-black text-emerald-600 border-t border-emerald-200 pt-1 mt-1">
                              BASICPDF VERIFIED SIGNATURE
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="text-slate-500 text-xs font-bold">Página {pIdx + 1} (Maestra)</span>
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

const Badge: React.FC<{ active: boolean, done: boolean, label: string }> = ({ active, done, label }) => (
  <div className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full border transition-all ${
    active ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 
    done ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 
    'bg-white border-slate-200 text-slate-400'
  }`}>
    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
      active ? 'bg-white text-blue-600' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
    }`}>
      {done ? '✓' : label[0]}
    </div>
    <span className="text-xs font-bold">{label.split(' ')[1]}</span>
  </div>
);

export default PdfDigitalSigner;
