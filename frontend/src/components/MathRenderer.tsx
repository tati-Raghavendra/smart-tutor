import { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math: string;
  displayMode?: boolean;
}

export default function MathRenderer({ math, displayMode = false }: MathRendererProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch (err) {
      console.warn('KaTeX rendering error:', err);
      return null;
    }
  }, [math, displayMode]);

  if (!html) {
    return (
      <code className="font-mono text-xs px-1 py-0.5 rounded bg-gray-150 text-indigo-700">
        {math}
      </code>
    );
  }

  if (displayMode) {
    return (
      <div className="my-3 py-2 px-3 overflow-x-auto text-center rounded-xl bg-indigo-50/40 border border-indigo-100/80 shadow-2xs">
        <span
          className="inline-block text-gray-900"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  return (
    <span
      className="inline-block px-1 align-baseline text-gray-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
