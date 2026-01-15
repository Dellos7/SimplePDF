
import React, { useState, useRef } from 'react';
import { ChevronLeft, Upload, FileText, Download, Trash2, GripVertical, Plus } from 'lucide-react';
import { mergePdfs } from '../services/pdfService';

interface PdfMergerProps {
  onBack: () => void;
}

interface FileEntry {
  id: string;
  name: string;
  data: ArrayBuffer;
}

const PdfMerger: React.FC<PdfMergerProps> = ({ onBack }) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const newEntries: FileEntry[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file.type === 'application/pdf') {
          const buffer = await file.arrayBuffer();
          newEntries.push({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            data: buffer
          });
        }
      }
      setFiles(prev => [...prev, ...newEntries]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...files];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFiles.length) {
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      setFiles(newFiles);
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    try {
      const result = await mergePdfs(files.map(f => f.data));
      const blob = new Blob([result], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `combinado_pdfmaster.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error merging PDFs:', err);
      alert('Hubo un error al combinar los PDFs.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Volver al Panel
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Juntar PDFs</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Añade varios archivos y ordénalos antes de generar el nuevo PDF.</p>
          </div>
          {files.length > 0 && (
            <button 
              onClick={() => setFiles([])}
              className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 text-sm font-semibold transition-colors"
            >
              Limpiar todo
            </button>
          )}
        </div>

        {files.length === 0 ? (
          <div className="p-12 text-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 cursor-pointer hover:border-blue-400 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all group"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFilesChange} 
                className="hidden" 
                accept=".pdf"
                multiple
              />
              <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-4 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8" />
              </div>
              <p className="text-slate-700 dark:text-slate-200 font-semibold text-lg transition-colors">Haz clic para añadir archivos PDF</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1 transition-colors">Puedes seleccionar varios a la vez</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              {files.map((file, index) => (
                <div 
                  key={file.id} 
                  className="flex items-center gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                >
                  <GripVertical className="text-slate-300 dark:text-slate-600 w-5 h-5 cursor-grab active:cursor-grabbing" />
                  <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg text-blue-500 dark:text-blue-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate transition-colors">{file.name}</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider">Orden: {index + 1}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => moveFile(index, 'up')}
                      disabled={index === 0}
                      className="p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-20 transition-colors"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                    <button 
                      onClick={() => removeFile(file.id)}
                      className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 font-medium hover:bg-slate-50 dark:hover:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFilesChange} 
                  className="hidden" 
                  accept=".pdf"
                  multiple
                />
                <Plus className="w-5 h-5" />
                Añadir más archivos
              </button>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleMerge}
                disabled={files.length < 2 || isProcessing}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-lg ${
                  files.length < 2 || isProcessing
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200 dark:hover:shadow-none'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Combinar {files.length} archivos
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

export default PdfMerger;
