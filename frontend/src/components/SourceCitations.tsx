import { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from 'lucide-react';
import type { DocumentSource } from '../types';

interface SourceCitationsProps {
  sources: DocumentSource[];
}

export default function SourceCitations({ sources }: SourceCitationsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-indigo-100/70 pt-2.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition py-1 px-2 rounded-lg hover:bg-indigo-50/80 -ml-1 cursor-pointer"
      >
        <BookOpen size={14} className="text-indigo-600" />
        <span>
          {sources.length} Lecture Excerpt{sources.length > 1 ? 's' : ''} Cited
        </span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2.5 animate-fadeIn">
          {sources.map((src, idx) => (
            <div
              key={src.chunk_id || idx}
              className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 text-xs text-gray-700 hover:bg-indigo-50/70 transition"
            >
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-indigo-100/60">
                <div className="flex items-center gap-1.5 font-medium text-indigo-900 truncate">
                  <ExternalLink size={12} className="shrink-0 text-indigo-600" />
                  <span className="truncate max-w-[200px]" title={src.filename}>
                    {src.filename}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/80 text-indigo-800">
                    Slide / Page {src.page_num}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-indigo-500 bg-white px-1.5 py-0.5 rounded border border-indigo-100">
                  match {Math.round(src.score * 10) / 10}
                </span>
              </div>
              <p className="font-mono text-[11px] leading-relaxed text-gray-800 bg-white/80 p-2 rounded-lg border border-indigo-50 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {src.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
