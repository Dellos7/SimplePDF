
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Scissors, 
  PlusSquare, 
  PenTool, 
  ShieldCheck, 
  Info,
  ChevronLeft,
  KeyRound,
  Sun,
  Moon
} from 'lucide-react';
import PdfSplitter from './components/PdfSplitter';
import PdfMerger from './components/PdfMerger';
import PdfSigner from './components/PdfSigner';
import PdfAutoFirma from './components/PdfAutoFirma';

enum Tool {
  DASHBOARD = 'DASHBOARD',
  SPLIT = 'SPLIT',
  MERGE = 'MERGE',
  SIGN_HANDWRITTEN = 'SIGN_HANDWRITTEN',
  SIGN_AUTOFIRMA = 'SIGN_AUTOFIRMA'
}

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.DASHBOARD);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Efecto para manejar el cambio de clases del tema
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // RESET DE SCROLL: Cuando cambia la herramienta activa, volvemos arriba
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTool]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const renderTool = () => {
    switch (activeTool) {
      case Tool.SPLIT:
        return <PdfSplitter onBack={() => setActiveTool(Tool.DASHBOARD)} />;
      case Tool.MERGE:
        return <PdfMerger onBack={() => setActiveTool(Tool.DASHBOARD)} />;
      case Tool.SIGN_HANDWRITTEN:
        return <PdfSigner onBack={() => setActiveTool(Tool.DASHBOARD)} />;
      case Tool.SIGN_AUTOFIRMA:
        return <PdfAutoFirma onBack={() => setActiveTool(Tool.DASHBOARD)} />;
      default:
        return <Dashboard onSelectTool={setActiveTool} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setActiveTool(Tool.DASHBOARD)}
          >
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors shadow-sm">
              <FileText className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              PrivacyPDF
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Privacidad
              </span>
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-500" />
                Local
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
              aria-label="Cambiar tema"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        {renderTool()}
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 dark:text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} PrivacyPDF Toolkit. Procesamiento 100% en local para máxima seguridad.</p>
        </div>
      </footer>
    </div>
  );
};

const Dashboard: React.FC<{ onSelectTool: (tool: Tool) => void }> = ({ onSelectTool }) => {
  const tools = [
    {
      id: Tool.SPLIT,
      title: 'Separar PDF',
      description: 'Extrae páginas o divide documentos grandes.',
      icon: Scissors,
      color: 'bg-orange-50 dark:bg-orange-950/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'hover:border-orange-200 dark:hover:border-orange-800'
    },
    {
      id: Tool.MERGE,
      title: 'Juntar PDFs',
      description: 'Combina varios archivos en uno solo.',
      icon: PlusSquare,
      color: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'hover:border-blue-200 dark:hover:border-blue-800'
    },
    {
      id: Tool.SIGN_HANDWRITTEN,
      title: 'Firma Manuscrita',
      description: 'Dibuja tu rúbrica y añádela visualmente.',
      icon: PenTool,
      color: 'bg-purple-50 dark:bg-purple-950/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'hover:border-purple-200 dark:hover:border-purple-800'
    },
    {
      id: Tool.SIGN_AUTOFIRMA,
      title: 'Firma con AutoFirma',
      description: 'Guía oficial para firma legal con certificado digital.',
      icon: KeyRound,
      color: 'bg-indigo-50 dark:bg-indigo-950/30',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      borderColor: 'hover:border-indigo-200 dark:hover:border-indigo-800'
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">
          Herramientas 100% privadas y seguras para tus PDF
        </h2>
        <p className="max-w-2xl mx-auto text-xl text-slate-500 dark:text-slate-400 leading-relaxed transition-colors">
          Totalmente privado y seguro. Tus PDF nunca salen de tu ordenador. No almacenamos ningún dato en nuestros servidores.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 text-left flex flex-col ${tool.borderColor}`}
          >
            <div className={`${tool.color} ${tool.iconColor} p-4 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform`}>
              <tool.icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {tool.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm flex-grow transition-colors">
              {tool.description}
            </p>
            <div className="mt-8 flex items-center text-blue-600 dark:text-blue-400 font-bold text-sm tracking-wide uppercase">
              Abrir
              <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-600 dark:bg-blue-700 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-blue-200 dark:shadow-none overflow-hidden relative">
        <div className="relative z-10 space-y-2">
          <h3 className="text-2xl font-bold">¿Por qué usar PrivacyPDF?</h3>
          <p className="text-blue-100 max-w-lg">
            A diferencia de otras webs, nosotros no procesamos tus archivos en servidores externos. 
            La seguridad de tus datos está garantizada por el aislamiento de tu propio navegador.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-blue-600 dark:border-blue-500 bg-blue-400 dark:bg-blue-500 flex items-center justify-center font-bold text-xs">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <span className="text-sm font-semibold text-blue-50">Privacidad garantizada</span>
        </div>
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500 dark:bg-blue-400 rounded-full opacity-50 blur-3xl"></div>
      </div>
    </div>
  );
};

export default App;
