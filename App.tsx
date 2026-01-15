
import React, { useState } from 'react';
import { 
  FileText, 
  Scissors, 
  PlusSquare, 
  PenTool, 
  ShieldCheck, 
  Info,
  ChevronLeft,
  KeyRound,
  ExternalLink
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setActiveTool(Tool.DASHBOARD)}
          >
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors shadow-sm">
              <FileText className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              BasicPDF
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Privacidad Total
            </span>
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-500" />
              Sin Servidores
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        {renderTool()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} BasicPDF Toolkit. Procesamiento 100% en local para máxima seguridad.</p>
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
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'hover:border-orange-200'
    },
    {
      id: Tool.MERGE,
      title: 'Juntar PDFs',
      description: 'Combina varios archivos en uno solo.',
      icon: PlusSquare,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'hover:border-blue-200'
    },
    {
      id: Tool.SIGN_HANDWRITTEN,
      title: 'Firma Manuscrita',
      description: 'Dibuja tu rúbrica y añádela visualmente.',
      icon: PenTool,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'hover:border-purple-200'
    },
    {
      id: Tool.SIGN_AUTOFIRMA,
      title: 'Firma con AutoFirma',
      description: 'Usa el software oficial para firma legal con certificado.',
      icon: KeyRound,
      color: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      borderColor: 'hover:border-indigo-200'
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Herramientas privadas para tus PDF
        </h2>
        <p className="max-w-2xl mx-auto text-xl text-slate-500 leading-relaxed">
          Herramientas potentes que se ejecutan en tu navegador. Tus documentos nunca suben a la nube.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group p-8 rounded-3xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 text-left flex flex-col ${tool.borderColor}`}
          >
            <div className={`${tool.color} ${tool.iconColor} p-4 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform`}>
              <tool.icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              {tool.title}
            </h3>
            <p className="text-slate-500 leading-relaxed text-sm flex-grow">
              {tool.description}
            </p>
            <div className="mt-8 flex items-center text-blue-600 font-bold text-sm tracking-wide uppercase">
              Abrir
              <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
            </div>
          </button>
        ))}
      </div>

      <div className="bg-blue-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-blue-200 overflow-hidden relative">
        <div className="relative z-10 space-y-2">
          <h3 className="text-2xl font-bold">¿Por qué usar BasicPDF?</h3>
          <p className="text-blue-100 max-w-lg">
            A diferencia de otras webs, nosotros no procesamos tus archivos en servidores externos. 
            La seguridad de tus datos está garantizada por el aislamiento de tu propio navegador.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-blue-600 bg-blue-400 flex items-center justify-center font-bold text-xs">
                {String.fromCharCode(64 + i)}
              </div>
            ))}
          </div>
          <span className="text-sm font-semibold text-blue-50">Privacidad garantizada</span>
        </div>
        {/* Decorative circle */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-3xl"></div>
      </div>
    </div>
  );
};

export default App;
