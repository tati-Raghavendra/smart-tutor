import React, { useRef, useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Trash2, 
  BookOpen, 
  Layers, 
  Sparkles, 
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import type { DocumentMeta } from '../types';

interface SidebarProps {
  documents: DocumentMeta[];
  totalChunks: number;
  isUploading: boolean;
  uploadError: string | null;
  onFileUpload: (files: FileList | File[]) => void;
  onDeleteDocument: (docId: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  documents,
  totalChunks,
  isUploading,
  uploadError,
  onFileUpload,
  onDeleteDocument,
  onClearAll,
  isOpen,
  onToggle,
}: SidebarProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = documents.reduce((sum, doc) => sum + doc.total_pages, 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onToggle}
          className="fixed inset-0 bg-black/30 z-20 md:hidden backdrop-blur-xs" 
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-80 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-80'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Lecture Materials</h2>
              <p className="text-[11px] text-gray-500">
                {documents.length > 0
                  ? `${documents.length} doc${documents.length > 1 ? 's' : ''} • ${totalPages} slides • ${totalChunks} chunks`
                  : 'RAG Knowledge Base'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="md:hidden p-1 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="p-4 border-b border-gray-100">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.md"
            multiple
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01]'
                : 'border-gray-200 bg-gray-50/60 hover:bg-indigo-50/40 hover:border-indigo-300'
            } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
          >
            <div
              className={`p-2.5 rounded-full ${
                isDragOver ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'
              } transition`}
            >
              {isUploading ? (
                <RefreshCw size={22} className="animate-spin text-indigo-600" />
              ) : (
                <UploadCloud size={22} />
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-800">
                {isUploading ? 'Extracting & chunking slides...' : 'Drop lecture PDF or slides'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                or <span className="text-indigo-600 font-medium underline">browse files</span> (.pdf, .txt, .md)
              </p>
            </div>
          </div>

          {/* Upload error banner if any */}
          {uploadError && (
            <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span className="leading-tight">{uploadError}</span>
            </div>
          )}
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {documents.length === 0 ? (
            <div className="text-center py-8 px-2 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <Layers size={22} />
              </div>
              <h3 className="text-xs font-semibold text-gray-700">No documents uploaded</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Upload your lecture slides or notes to ask slide-specific questions, generate flashcards, or get concept summaries.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1">
                <span>Loaded Slides ({documents.length})</span>
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-red-600 hover:text-red-700 hover:underline transition"
                >
                  Clear all
                </button>
              </div>

              {documents.map((doc) => (
                <div
                  key={doc.doc_id}
                  className="group bg-white border border-gray-200 hover:border-indigo-300 rounded-xl p-3 shadow-xs hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate" title={doc.filename}>
                          {doc.filename}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                            {doc.total_pages} {doc.total_pages === 1 ? 'slide' : 'slides'}
                          </span>
                          <span>•</span>
                          <span>{doc.total_chunks} chunks</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size_bytes)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.doc_id)}
                      title="Remove document"
                      className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition shrink-0 opacity-80 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Study Tip / Info Footer */}
        <div className="p-3.5 border-t border-gray-200 bg-gray-50/70">
          <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5">
            <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-gray-700 leading-snug">
              <strong className="font-semibold text-indigo-900">Smart RAG Active:</strong> Answers cite specific slide numbers and highlight passages from your notes.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
