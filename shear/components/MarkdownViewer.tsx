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


const latexExtension = {
  name: 'latex',
  level: 'inline' as const,
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


const admonitionExtension = {
  name: 'admonition',
  level: 'block' as const,
  start(src: string) { return src.match(/^:{3,}/)?.index; },
  tokenizer(this: any, src: string, tokens: any) {
    const rule = /^(:{3,})(info|success|warning|error)(?:\[(.*?)\])?(\{open\})?/;
    const match = rule.exec(src);
    if (match) {
      const fence = match[1];
      const type = match[2];
      const title = match[3];
      const open = match[4];

      
      let endIndex = -1;
      const lines = src.split('\n');
      let currentPos = 0;
      
      
      currentPos += lines[0].length + 1;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim() === fence) {
          endIndex = currentPos + line.length;
          
          
          
          
          break;
        }
        currentPos += line.length + 1; 
      }
      
      
      const closeFenceIndex = src.indexOf(`\n${fence}`);
      if (closeFenceIndex !== -1) {
          
          
          
      }
      
      
      
      const fullRule = new RegExp(`^(${fence})(info|success|warning|error)(?:\\[(.*?)\\])?({open})?\\n([\\s\\S]*?)\\n\\1(?:\\n|$)`);
      const fullMatch = fullRule.exec(src);
      
      if (fullMatch) {
          const token = {
            type: 'admonition',
            raw: fullMatch[0],
            admonitionType: fullMatch[2],
            title: fullMatch[3],
            isOpen: !!fullMatch[4],
            text: fullMatch[5],
            tokens: [],
            titleTokens: []
          };
          this.lexer.blockTokens(token.text, token.tokens);
          if (token.title) {
              this.lexer.inline(token.title, token.titleTokens);
          }
          return token;
      }
    }
  },
  renderer(this: any, token: any) {
    const titleHtml = token.title ? this.parser.parseInline(token.titleTokens) : token.admonitionType.toUpperCase();
    const contentHtml = this.parser.parse(token.tokens);
    
    let icon = '';
    switch (token.admonitionType) {
      case 'info':
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
        break;
      case 'success':
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
        break;
      case 'warning':
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
        break;
      case 'error':
        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
        break;
    }

    return `<details class="admonition admonition-${token.admonitionType}" ${token.isOpen ? 'open' : ''}>
      <summary class="admonition-title">
        <div class="flex items-center gap-2">
          ${icon}
          <span>${titleHtml}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right admonition-chevron"><path d="m9 18 6-6-6-6"/></svg>
      </summary>
      <div class="admonition-content">${contentHtml}</div>
    </details>`;
  }
};


const cuteTableExtension = {
  name: 'cuteTable',
  level: 'block' as const,
  start(src: string) { return src.match(/^:{2,}cute-table/)?.index; },
  tokenizer(this: any, src: string, tokens: any) {
    const rule = /^(:{2,})cute-table(?:\{tuack\})?\n([\s\S]*?)\n\1(?:$|\n)/;
    const match = rule.exec(src);
    if (match) {
      const token = {
        type: 'cuteTable',
        raw: match[0],
        text: match[2],
        tokens: []
      };
      this.lexer.blockTokens(token.text, token.tokens);
      return token;
    }
  },
  renderer(this: any, token: any) {
    const contentHtml = this.parser.parse(token.tokens);
    return `<div class="cute-table-wrapper cute-table-tuack">${contentHtml}</div>`;
  }
};


const advancedTableExtension = {
  name: 'advancedTable',
  renderer(this: any, token: any) {
    let html = '<table>';
    
    
    html += '<thead><tr>';
    token.header.forEach((cell: any, index: number) => {
        if (!cell.hidden) {
            const align = token.align[index];
            const attr = [];
            if (align) attr.push(`align="${align}"`);
            if (cell.rowspan > 1) attr.push(`rowspan="${cell.rowspan}"`);
            if (cell.colspan > 1) attr.push(`colspan="${cell.colspan}"`);
            
            html += `<th ${attr.join(' ')}>${this.parser.parseInline(cell.tokens)}</th>`;
        }
    });
    html += '</tr></thead>';
    
    
    html += '<tbody>';
    token.rows.forEach((row: any) => {
        html += '<tr>';
        row.forEach((cell: any, index: number) => {
            if (!cell.hidden) {
                const align = token.align[index];
                const attr = [];
                if (align) attr.push(`align="${align}"`);
                if (cell.rowspan > 1) attr.push(`rowspan="${cell.rowspan}"`);
                if (cell.colspan > 1) attr.push(`colspan="${cell.colspan}"`);
                
                html += `<td ${attr.join(' ')}>${this.parser.parseInline(cell.tokens)}</td>`;
            }
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }
};

marked.use({ 
  extensions: [latexExtension, admonitionExtension, cuteTableExtension, advancedTableExtension],
  walkTokens(token: any) {
    if (token.type === 'table') {
        token.type = 'advancedTable';
        
        const rowCount = token.rows.length + 1; 
        const colCount = token.header.length;
        
        
        const getCell = (r: number, c: number) => {
            if (r === 0) return token.header[c];
            return token.rows[r-1][c];
        };
        
        
        const rootMatrix: any[][] = [];
        
        
        for(let r=0; r<rowCount; r++) {
            const row = [];
            for(let c=0; c<colCount; c++) {
                const cell = getCell(r,c);
                if (cell) {
                    cell.rowspan = 1;
                    cell.colspan = 1;
                    cell.hidden = false;
                    row.push(cell);
                } else {
                    row.push(null);
                }
            }
            rootMatrix.push(row);
        }
        
        
        for(let r=0; r<rowCount; r++) {
            for(let c=0; c<colCount; c++) {
                const cell = getCell(r,c);
                if(!cell) continue;
                
                const content = cell.text.trim();
                
                if (content === '^' && r > 0) {
                    const root = rootMatrix[r-1][c];
                    if (root) {
                        root.rowspan += 1;
                        rootMatrix[r][c] = root;
                        cell.hidden = true;
                    }
                } else if (content === '<' && c > 0) {
                    const root = rootMatrix[r][c-1];
                    if (root) {
                        root.colspan += 1;
                        rootMatrix[r][c] = root;
                        cell.hidden = true;
                    }
                }
            }
        }
    }
  }
});


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
          
          const closingTags = openTags.slice().reverse().map(tag => `</${tag.name}>`).join('');
          lines.push(currentLine + closingTags);
          
          
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
  
  
  
  const parts = lang.split(/\s+/);
  const languageCandidate = parts[0];
  const language = (languageCandidate && hljs.getLanguage(languageCandidate)) ? languageCandidate : 'plaintext';
  const attributes = parts.slice(1);
  
  const showLineNumbers = attributes.includes('line-numbers');
  const highlightRanges: number[][] = [];
  
  attributes.forEach(attr => {
    if (attr.startsWith('lines=')) {
      const rangeStr = attr.split('=')[1];
      
      
      
      const [start, end] = rangeStr.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        highlightRanges.push([start, end]);
      }
    }
  });

  const highlighted = hljs.highlight(text, { language }).value;
  
  
  
  
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

  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const placeholders = containerRef.current.querySelectorAll('.copy-btn-placeholder');
    placeholders.forEach(placeholder => {
      const code = decodeURIComponent(placeholder.getAttribute('data-code') || '');
      
      
      
      
      
      
      
      
      
      
      
      
      const button = document.createElement('button');
      button.className = "absolute top-2 right-2 p-2 rounded-md transition-colors hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100";
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
      
      button.onclick = () => {
        navigator.clipboard.writeText(code).then(() => {
            
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
