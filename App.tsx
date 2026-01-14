
import React, { useState } from 'react';
import { 
  FileText, 
  Scissors, 
  PlusSquare, 
  PenTool, 
  ShieldCheck, 
  Info,
  ChevronLeft,
  LayoutDashboard
} from 'lucide-react';
import PdfSplitter from './components/PdfSplitter';
import PdfMerger from './components/PdfMerger';
import PdfSigner from './components/PdfSigner';

enum Tool {
  DASHBOARD = 'DASHBOARD',
  SPLIT = 'SPLIT',
  MERGE = 'MERGE',
  SIGN = 'SIGN'
}

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.DASHBOARD);

  const renderTool = () => {
    switch (activeTool) {
      case Tool.SPLIT:
        return <PdfSplitter onBack={() => setActiveTool(Tool.DASHBOARD)} />;
      case Tool.MERGE:
        return <PdfMerger onBack={() => setActiveTool(Tool.DASHBOARD)} />;
      case Tool.SIGN:
        return <PdfSigner onBack={() => setActiveTool(Tool.DASHBOARD)} />;
      default:
        return <Dashboard onSelectTool={setActiveTool} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setActiveTool(Tool.DASHBOARD)}
          >
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
              <FileText className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              PDF Master
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Procesamiento Local
            </span>
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-500" />
              Sin Almacenamiento
            </span>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        {renderTool()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} PDF Master Toolkit. Todos los archivos se procesan en tu navegador.</p>
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
      description: 'Extrae páginas específicas de un documento PDF en uno nuevo.',
      icon: Scissors,
      color: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'hover:border-orange-200'
    },
    {
      id: Tool.MERGE,
      title: 'Juntar PDFs',
      description: 'Combina múltiples archivos PDF en un único documento ordenado.',
      icon: PlusSquare,
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'hover:border-blue-200'
    },
    {
      id: Tool.SIGN,
      title: 'Firmar PDF',
      description: 'Dibuja tu firma y añádela a las páginas que elijas de tu PDF.',
      icon: PenTool,
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'hover:border-purple-200'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Gestión de PDF Segura y Rápida
        </h2>
        <p className="max-w-2xl mx-auto text-lg text-slate-500">
          Herramientas profesionales para tus documentos sin comprometer tu privacidad.
          Todo ocurre directamente en tu dispositivo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`group p-8 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 text-left flex flex-col ${tool.borderColor}`}
          >
            <div className={`${tool.color} ${tool.iconColor} p-4 rounded-xl w-fit mb-6`}>
              <tool.icon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              {tool.title}
            </h3>
            <p className="text-slate-500 leading-relaxed">
              {tool.description}
            </p>
            <div className="mt-8 flex items-center text-blue-600 font-semibold text-sm">
              Comenzar ahora
              <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default App;
