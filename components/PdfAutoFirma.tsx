
import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  KeyRound, 
  Download, 
  Monitor, 
  Smartphone, 
  Info, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Apple,
  Play
} from 'lucide-react';

interface PdfAutoFirmaProps {
  onBack: () => void;
}

const PdfAutoFirma: React.FC<PdfAutoFirmaProps> = ({ onBack }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent)) {
      setIsMobile(true);
    }
  }, []);

  const desktopUrl = "https://sede.serviciosmin.gob.es/es-es/firmaelectronica/paginas/autofirma.aspx";
  const androidUrl = "https://play.google.com/store/apps/details?id=es.gob.afirma";
  const iosUrl = "https://apps.apple.com/es/app/cliente-afirma/id943714652";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12 transition-colors">
      <button 
        onClick={onBack} 
        className="flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium"
      >
        <ChevronLeft className="w-5 h-5 mr-1" /> Volver al Panel
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-colors">
        {/* Hero Section */}
        <div className="bg-indigo-600 dark:bg-indigo-700 px-8 py-12 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Software AutoFirma</h2>
            </div>
            <h3 className="text-xl font-bold mb-4">Firma con Certificado Digital (DNIe / FNMT)</h3>
            <p className="text-indigo-100 text-lg leading-relaxed">
              AutoFirma es la herramienta oficial del Gobierno de España para realizar firmas electrónicas con validez legal. Debido a requisitos de seguridad, esta acción debe realizarse desde su aplicación dedicada.
            </p>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 dark:bg-white/5 rounded-full blur-3xl"></div>
        </div>

        <div className="p-8 md:p-12 space-y-12 transition-colors">
          {/* Platform Specific Content */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-grow space-y-6">
              <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 transition-colors">
                {isMobile ? <Smartphone className="w-6 h-6 text-indigo-500" /> : <Monitor className="w-6 h-6 text-indigo-500" />}
                Instalar en tu dispositivo
              </h4>
              
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed transition-colors">
                {isMobile 
                  ? "Detectamos que estás en un dispositivo móvil. Para firmar PDFs con tu certificado, necesitas descargar la App oficial 'Cliente @firma'."
                  : "Para firmar documentos desde tu ordenador con Windows, macOS o Linux, debes instalar la versión de escritorio de AutoFirma."
                }
              </p>

              {isMobile ? (
                <div className="flex flex-wrap gap-4 pt-2">
                  <a 
                    href={androidUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-slate-900 dark:bg-black text-white px-6 py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-900 transition-all shadow-lg"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-black opacity-60">Descargar en</p>
                      <p className="text-lg font-bold leading-none">Google Play</p>
                    </div>
                  </a>
                  <a 
                    href={iosUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-slate-900 dark:bg-black text-white px-6 py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-slate-900 transition-all shadow-lg"
                  >
                    <Apple className="w-6 h-6 fill-current" />
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-black opacity-60">Consíguelo en</p>
                      <p className="text-lg font-bold leading-none">App Store</p>
                    </div>
                  </a>
                </div>
              ) : (
                <a 
                  href={desktopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-indigo-600 dark:bg-indigo-700 text-white px-8 py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 dark:hover:bg-indigo-800 hover:-translate-y-1 transition-all shadow-xl shadow-indigo-100 dark:shadow-none"
                >
                  <Download className="w-6 h-6" />
                  DESCARGAR PARA ESCRITORIO
                  <ExternalLink className="w-5 h-5 opacity-50" />
                </a>
              )}
            </div>

            <div className="md:w-72 shrink-0 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 transition-colors">
              <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-widest transition-colors">¿Por qué usarla?</h5>
              <ul className="space-y-3">
                {[
                  "Validez legal plena",
                  "Privacidad garantizada",
                  "Compatible con DNIe",
                  "Sin subir archivos"
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-8 pt-8 border-t border-slate-100 dark:border-slate-800 transition-colors">
            <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3 transition-colors">
              <Info className="w-6 h-6 text-indigo-500" />
              ¿Cómo funciona?
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "1. Descarga",
                  desc: "Instala la herramienta oficial en tu equipo o móvil."
                },
                {
                  title: "2. Selecciona",
                  desc: "Abre la App y carga el PDF que quieras firmar."
                },
                {
                  title: "3. Firma",
                  desc: "Usa tu certificado para generar el archivo firmado legalmente."
                }
              ].map((item, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2 transition-colors">
                  <p className="font-bold text-slate-900 dark:text-slate-100 transition-colors">{item.title}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed transition-colors">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security Banner */}
          <div className="bg-emerald-600 dark:bg-emerald-700 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center gap-6 transition-colors">
            <div className="bg-white/20 p-4 rounded-2xl">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold">Seguridad Total</p>
              <p className="text-emerald-50 opacity-90 text-sm">
                Al procesar la firma fuera del navegador, tu certificado digital nunca sale de tu dispositivo, cumpliendo con los estándares de seguridad más exigentes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfAutoFirma;
