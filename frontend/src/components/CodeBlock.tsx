import { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import Prism from 'prismjs';

// Import core language definitions
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export default function CodeBlock({ code, lang = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const cleanLang = lang.trim().toLowerCase();

  const highlightedHtml = useMemo(() => {
    try {
      // Map aliases
      let grammarLang = cleanLang;
      if (cleanLang === 'js') grammarLang = 'javascript';
      if (cleanLang === 'ts') grammarLang = 'typescript';
      if (cleanLang === 'py') grammarLang = 'python';
      if (cleanLang === 'sh' || cleanLang === 'shell' || cleanLang === 'zsh') grammarLang = 'bash';
      if (cleanLang === 'cpp' || cleanLang === 'c++') grammarLang = 'cpp';

      const grammar = Prism.languages[grammarLang] || Prism.languages.javascript || Prism.languages.clike;
      if (grammar) {
        return Prism.highlight(code, grammar, grammarLang || 'clike');
      }
    } catch (e) {
      console.warn('Prism highlighting error:', e);
    }
    return null;
  }, [code, cleanLang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="my-3.5 rounded-2xl overflow-hidden border border-gray-800 bg-[#1d1f21] text-gray-100 shadow-md">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#141517] border-b border-gray-800/80 text-xs">
        <span className="font-mono text-gray-400 font-semibold tracking-wider uppercase text-[11px]">
          {cleanLang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium text-gray-400 hover:text-white hover:bg-gray-800/80 transition cursor-pointer"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <pre className="p-4 overflow-x-auto text-xs sm:text-[13px] font-mono leading-relaxed scrollbar-thin">
        {highlightedHtml ? (
          <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
}
