'use client';

import { useEffect, useState, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Check } from 'lucide-react';
import { createRoot } from 'react-dom/client';

// Latex Extension
const latexExtension = {
  name: 'latex',
  level: 'inline',
  start(src: string) { return src.match(/\$/)?.index; },
  tokenizer(src: string, tokens: any) {
    const displayRule = /^\$\$([\s\S]*?)\$\$/;
    const inlineRule = /^\$([^$\n]+)\$/;
    let match;
    if (match = displayRule.exec(src)) {
      return {
        type: 'latex',
        raw: match[0],
        text: match[1],
        displayMode: true
      };
    }
    if (match = inlineRule.exec(src)) {
      return {
        type: 'latex',
        raw: match[0],
        text: match[1],
        displayMode: false
      };
    }
  },
  renderer(token: any) {
    return katex.renderToString(token.text, { throwOnError: false, displayMode: token.displayMode });
  }
};

marked.use({ extensions: [latexExtension] });

// Helper to split HLJS HTML into lines safely
function splitHtmlIntoLines(html: string): string[] {
  const lines: string[] = [];
  const openTags: { name: string, full: string }[] = [];
  let currentLine = '';
  
  const regex = /<(\/?)(\w+)([^>]*)>|([^<]+)/g;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const [fullMatch, isClosing, tagName, attrs, text] = match;
    
    if (text) {
      const parts = text.split('\n');
      parts.forEach((part, index) => {
        if (index > 0) {
          // Close tags for current line
          const closingTags = openTags.slice().reverse().map(tag => `</${tag.name}>`).join('');
          lines.push(currentLine + closingTags);
          
          // Start new line, reopen tags
          const openingTags = openTags.map(tag => tag.full).join('');
          currentLine = openingTags + part;
        } else {
          currentLine += part;
        }
      });
    } else {
      if (isClosing) {
        openTags.pop();
        currentLine += fullMatch;
      } else {
        const voidTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
        if (!voidTags.includes(tagName.toLowerCase()) && !fullMatch.endsWith('/>')) {
          openTags.push({ name: tagName, full: fullMatch });
        }
        currentLine += fullMatch;
      }
    }
  }
  lines.push(currentLine);
  // Remove empty last line if it's just from trailing newline
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

const renderer = new marked.Renderer();

renderer.code = (codeOrToken: any, langStr?: string) => {
  let text = '';
  let lang = '';
  
  if (typeof codeOrToken === 'object' && codeOrToken !== null && 'text' in codeOrToken) {
    text = codeOrToken.text || '';
    lang = codeOrToken.lang || '';
  } else {
    text = String(codeOrToken);
    lang = langStr || '';
  }
  
  if (!lang) lang = 'plaintext';
  
  // Parse language and attributes
  // Format: "cpp line-numbers lines=1-5"
  const parts = lang.split(/\s+/);
  const languageCandidate = parts[0];
  const language = (languageCandidate && hljs.getLanguage(languageCandidate)) ? languageCandidate : 'plaintext';
  const attributes = parts.slice(1);
  
  const showLineNumbers = attributes.includes('line-numbers');
  const highlightRanges: number[][] = [];
  
  attributes.forEach(attr => {
    if (attr.startsWith('lines=')) {
      const rangeStr = attr.split('=')[1];
      // Handle single line or range? User example: lines=6-9 or lines=5-6
      // Assuming simple range for now. If comma separated, need more logic.
      // User didn't specify comma, just range.
      const [start, end] = rangeStr.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        highlightRanges.push([start, end]);
      }
    }
  });

  const highlighted = hljs.highlight(text, { language }).value;
  
  // If no special features, return standard output (but wrapped for consistency)
  // Actually, to support copy button everywhere, we should wrap everywhere.
  
  const lines = splitHtmlIntoLines(highlighted);
  
  let codeContent = '';
  
  lines.forEach((lineHtml, index) => {
    const lineNumber = index + 1;
    const isHighlighted = highlightRanges.some(([start, end]) => lineNumber >= start && lineNumber <= end);
    
    codeContent += `<div class="code-line ${isHighlighted ? 'bg-neutral-200/50 dark:bg-neutral-700/50' : ''}">`;
    if (showLineNumbers) {
      codeContent += `<span class="line-number text-muted-foreground/50 select-none mr-4 text-right w-8 inline-block text-sm">${lineNumber}</span>`;
    }
    codeContent += `<span class="line-content">${lineHtml || '&nbsp;'}</span></div>`;
  });

  // Copy button container (will be hydrated by React)
  const copyButtonHtml = `<div class="copy-btn-placeholder" data-code="${encodeURIComponent(text)}"></div>`;

  return `<div class="code-block-wrapper relative group rounded-lg overflow-hidden my-4 border bg-muted/30">
            ${copyButtonHtml}
            <pre class="!m-0 !p-4 !bg-transparent overflow-x-auto font-mono text-sm"><code class="language-${language} block w-max min-w-full">${codeContent}</code></pre>
          </div>`;
};

marked.setOptions({
  gfm: true,
  breaks: false,
  renderer
});

const MarkdownViewer = ({ content }: { content: string }) => {
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const src = typeof content === 'string' ? content : '';
    const rendered = marked.parse(src) as string;
    const sanitized = DOMPurify.sanitize(rendered, {
      ADD_TAGS: ['div', 'span', 'pre', 'code', 'button'],
      ADD_ATTR: ['class', 'data-code', 'style']
    });
    setHtml(sanitized);
  }, [content]);

  // Hydrate copy buttons
  useEffect(() => {
    if (!containerRef.current) return;
    
    const placeholders = containerRef.current.querySelectorAll('.copy-btn-placeholder');
    placeholders.forEach(placeholder => {
      const code = decodeURIComponent(placeholder.getAttribute('data-code') || '');
      
      // Render React component into the placeholder
      // Note: This is a bit "hacky" but effective for mixing static HTML and React interactivity
      // Alternatively, we could use portal or just event listeners.
      // Let's use a simple React root.
      
      // Wait, creating roots repeatedly might be heavy. 
      // Simpler: just replace placeholder with a button and attach listener.
      
      // Clean up previous roots? No, this runs on content change.
      // Let's try a simpler approach: standard DOM manipulation.
      
      const button = document.createElement('button');
      button.className = "absolute top-2 right-2 p-2 rounded-md transition-colors hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100";
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
      
      button.onclick = () => {
        navigator.clipboard.writeText(code).then(() => {
            // Show check icon
            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check text-green-500"><path d="M20 6 9 17l-5-5"/></svg>';
            setTimeout(() => {
                button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
            }, 2000);
        });
      };
      
      placeholder.replaceWith(button);
    });
    
  }, [html]);

  return <div ref={containerRef} className="markdown max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MarkdownViewer;
