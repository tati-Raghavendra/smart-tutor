import React from 'react';
import MathRenderer from './MathRenderer';
import CodeBlock from './CodeBlock';

interface FormattedMessageProps {
  content: string;
}

interface Block {
  type: 'p' | 'heading' | 'ul' | 'ol' | 'code' | 'quote' | 'hr' | 'math' | 'table';
  level?: number;
  lang?: string;
  code?: string;
  text?: string;
  math?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export default function FormattedMessage({ content }: FormattedMessageProps) {
  if (!content) return null;

  // Clean raw dividers
  const cleanContent = content
    .replace(/^={4,}\s*$/gm, '')
    .trim();

  const blocks = parseBlocks(cleanContent);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-850">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'code':
            return (
              <CodeBlock
                key={index}
                code={block.code || ''}
                lang={block.lang || ''}
              />
            );

          case 'math':
            return (
              <MathRenderer
                key={index}
                math={block.math || ''}
                displayMode={true}
              />
            );

          case 'table':
            return (
              <div key={index} className="my-3 overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                  {block.headers && block.headers.length > 0 && (
                    <thead className="bg-gray-50/90 font-semibold text-gray-900">
                      <tr>
                        {block.headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-3.5 py-2.5">
                            {renderInline(h)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {block.rows?.map((row, rIdx) => (
                      <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3.5 py-2 text-gray-800">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'heading': {
            const level = block.level || 2;
            if (level === 1) {
              return (
                <h2
                  key={index}
                  className="text-base sm:text-lg font-bold text-gray-900 mt-4 mb-2 pb-1 border-b border-gray-100"
                >
                  {renderInline(block.text || '')}
                </h2>
              );
            }
            if (level === 2) {
              return (
                <h3
                  key={index}
                  className="text-sm sm:text-base font-bold text-gray-900 mt-3.5 mb-1.5 flex items-center gap-2"
                >
                  {renderInline(block.text || '')}
                </h3>
              );
            }
            return (
              <h4 key={index} className="text-xs sm:text-sm font-bold text-indigo-950 mt-3 mb-1">
                {renderInline(block.text || '')}
              </h4>
            );
          }

          case 'ul':
            return (
              <ul key={index} className="space-y-2 my-2 pl-0.5">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-gray-800 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    <span className="flex-1">{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={index} className="space-y-2 my-2 pl-0.5">
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-gray-800 leading-relaxed">
                    <span className="text-xs font-semibold font-mono text-indigo-600 mt-0.5 shrink-0 min-w-[20px]">
                      {itemIdx + 1}.
                    </span>
                    <span className="flex-1">{renderInline(item)}</span>
                  </li>
                ))}
              </ol>
            );

          case 'quote':
            return (
              <blockquote
                key={index}
                className="border-l-3 border-indigo-400 bg-indigo-50/50 rounded-r-xl px-3.5 py-2 my-2.5 text-gray-700 italic text-xs sm:text-sm"
              >
                {renderInline(block.text || '')}
              </blockquote>
            );

          case 'hr':
            return <hr key={index} className="my-3 border-gray-200" />;

          case 'p':
          default:
            return (
              <p key={index} className="text-gray-800 leading-relaxed">
                {renderInline(block.text || '')}
              </p>
            );
        }
      })}
    </div>
  );
}

/**
 * Parses markdown text into structured semantic blocks (paragraphs, headings, math, code, lists, tables).
 */
function parseBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced Code block (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      continue;
    }

    // Display / Block Math ($$ ... $$ or \[ ... \])
    if (trimmed.startsWith('$$') || trimmed.startsWith('\\[')) {
      const isBracket = trimmed.startsWith('\\[');
      const closeMarker = isBracket ? '\\]' : '$$';

      // Single line block math: $$math$$
      if (trimmed.length > 2 && trimmed.endsWith(closeMarker) && trimmed !== closeMarker) {
        const math = trimmed.slice(isBracket ? 2 : 2, isBracket ? -2 : -2).trim();
        blocks.push({ type: 'math', math });
        i++;
        continue;
      }

      // Multi-line block math
      const mathLines: string[] = [];
      if (trimmed !== '$$' && trimmed !== '\\[') {
        mathLines.push(trimmed.replace(/^(\$\$|\\\[)/, ''));
      }
      i++;
      while (i < lines.length && !lines[i].trim().includes(closeMarker)) {
        mathLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        const last = lines[i].trim().replace(/(\$\$|\\\])$/, '');
        if (last) mathLines.push(last);
        i++; // skip closing
      }
      blocks.push({ type: 'math', math: mathLines.join('\n').trim() });
      continue;
    }

    // Markdown Table: starts with | and next line has |-
    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+[-| :]*$/.test(lines[i + 1])) {
      const headerLine = trimmed;
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowCells = lines[i]
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
        rows.push(rowCells);
        i++;
      }
      const headers = headerLine
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Heading (# to ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Horizontal Rule (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    // Unordered List (- item, * item, + item)
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered List (1. item, 2. item)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Regular Paragraph (consume lines until blank line or another block)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('$$') &&
      !lines[i].trim().startsWith('\\[') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !(lines[i].trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*[-:]+[-| :]*$/.test(lines[i + 1])) &&
      !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', text: paraLines.join(' ') });
  }

  return blocks;
}

/**
 * Tokenizes inline formatting:
 * - $$math$$ or $math$ or \(math\)
 * - ***bold italic***
 * - **bold**
 * - *italic*
 * - `code`
 * - [Slide X] or [Page X] or (Slide X)
 */
function renderInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Match inline tokens
  const tokenRegex =
    /(`[^`]+`|\$\$[^$]+\$\$|\$(?!\s)([^$\n]+?)(?<!\s)\$|\\\([^)]+\\\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\[(?:Slide|Page|Slide\/Page)\s*\d+\]|\((?:Slide|Page)\s*\d+\))/gi;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(cleanTextFragment(text.substring(lastIndex, match.index), nodes.length));
    }

    const token = match[0];
    const key = `token-${nodes.length}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      // Inline code
      nodes.push(
        <code
          key={key}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-gray-100 text-indigo-700 font-mono text-xs border border-gray-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('$$') && token.endsWith('$$')) {
      // Inline block-math wrapper
      nodes.push(
        <MathRenderer key={key} math={token.slice(2, -2)} displayMode={true} />
      );
    } else if (token.startsWith('$') && token.endsWith('$')) {
      // Inline math ($...$)
      nodes.push(
        <MathRenderer key={key} math={token.slice(1, -1)} displayMode={false} />
      );
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      // Inline math (\(...\))
      nodes.push(
        <MathRenderer key={key} math={token.slice(2, -2)} displayMode={false} />
      );
    } else if (token.startsWith('***') && token.endsWith('***')) {
      // Bold + Italic
      nodes.push(
        <strong key={key} className="font-bold italic text-gray-950">
          {token.slice(3, -3)}
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      // Bold
      nodes.push(
        <strong key={key} className="font-semibold text-gray-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      // Italic
      nodes.push(
        <em key={key} className="italic text-gray-800">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') || token.startsWith('(')) {
      // Slide or Page Citation Badge
      nodes.push(
        <span
          key={key}
          className="inline-flex items-center px-1.5 py-0.2 mx-0.5 rounded-md font-semibold text-[11px] bg-indigo-100 text-indigo-800 border border-indigo-200"
        >
          {token}
        </span>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(cleanTextFragment(text.substring(lastIndex), nodes.length));
  }

  return nodes;
}

/**
 * Cleans any remaining unclosed markdown markers from text fragments without damaging mathematical multiplication.
 */
function cleanTextFragment(fragment: string, keyIdx: number): React.ReactNode {
  const cleaned = fragment.replace(/(^|\s)\*{1,2}(\s|$)/g, '$1$2');
  return <React.Fragment key={`txt-${keyIdx}`}>{cleaned}</React.Fragment>;
}
