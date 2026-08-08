import React, { useMemo } from 'react';
import katex from 'katex';

interface MathProps {
  math: string;
  block?: boolean;
}

export function MathComponent({ math, block = false }: MathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch (e) {
      console.error(e);
      return `<span class="text-red-500">${math}</span>`;
    }
  }, [math, block]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// Simple text-to-math renderer that parses text and renders $...$ as inline math and $$...$$ as block math!
export function LatexText({ text }: { text: string }) {
  const parts = useMemo(() => {
    if (!text) return [];
    
    const result: Array<{ type: 'text' | 'inline' | 'block'; content: string }> = [];
    let currentIdx = 0;
    
    while (currentIdx < text.length) {
      // Look for block math $$
      const blockStart = text.indexOf('$$', currentIdx);
      // Look for inline math $
      const inlineStart = text.indexOf('$', currentIdx);
      
      // If we have both, choose the closer one
      if (blockStart !== -1 && (inlineStart === -1 || blockStart <= inlineStart)) {
        // Push preceding plain text
        if (blockStart > currentIdx) {
          result.push({ type: 'text', content: text.substring(currentIdx, blockStart) });
        }
        
        // Find closing $$
        const blockEnd = text.indexOf('$$', blockStart + 2);
        if (blockEnd !== -1) {
          result.push({ type: 'block', content: text.substring(blockStart + 2, blockEnd) });
          currentIdx = blockEnd + 2;
        } else {
          // Unclosed block, treat rest as text
          result.push({ type: 'text', content: text.substring(blockStart) });
          break;
        }
      } else if (inlineStart !== -1) {
        // Push preceding plain text
        if (inlineStart > currentIdx) {
          result.push({ type: 'text', content: text.substring(currentIdx, inlineStart) });
        }
        
        // Find closing $
        const inlineEnd = text.indexOf('$', inlineStart + 1);
        if (inlineEnd !== -1) {
          result.push({ type: 'inline', content: text.substring(inlineStart + 1, inlineEnd) });
          currentIdx = inlineEnd + 1;
        } else {
          // Unclosed inline, treat rest as text
          result.push({ type: 'text', content: text.substring(inlineStart) });
          break;
        }
      } else {
        // No more math blocks
        result.push({ type: 'text', content: text.substring(currentIdx) });
        break;
      }
    }
    
    return result;
  }, [text]);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.type === 'block') {
          return (
            <div key={idx} className="my-2 py-1 overflow-x-auto max-w-full text-center">
              <MathComponent math={part.content} block={true} />
            </div>
          );
        } else if (part.type === 'inline') {
          return (
            <span key={idx}>
              <MathComponent math={part.content} block={false} />
            </span>
          );
        } else {
          return <span key={idx}>{part.content}</span>;
        }
      })}
    </>
  );
}
