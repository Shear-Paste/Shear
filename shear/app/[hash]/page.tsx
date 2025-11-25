'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Copy, Hash } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => {
  const language = (lang && hljs.getLanguage(lang)) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.setOptions({ gfm: true, breaks: true, renderer });

function MarkdownViewer({ content }: { content: string }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    const src = typeof content === 'string' ? content : '';
    const rendered = marked.parse(src) as string;
    const withKatex = rendered
      .replace(/\$\$([\s\S]*?)\$\$/g, (_m, tex) => katex.renderToString(tex, { throwOnError: false, displayMode: true }))
      .replace(/\$([^$\n]+)\$/g, (_m, tex) => katex.renderToString(tex, { throwOnError: false, displayMode: false }));
    const sanitized = DOMPurify.sanitize(withKatex);
    setHtml(sanitized);
  }, [content]);
  return <div className="markdown max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function HashPage() {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('split');
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const params = useParams();
  const hash = typeof params.hash === 'string' ? params.hash : '';

  const syncScroll = (source: HTMLElement, target: HTMLElement) => {
    const sMax = (source.scrollHeight - source.clientHeight) || 1;
    const tMax = target.scrollHeight - target.clientHeight;
    const ratio = source.scrollTop / sMax;
    target.scrollTop = ratio * tMax;
  };

  useEffect(() => {
    const h = hash;
    if (!/^[a-f0-9]{64}$/i.test(h)) {
      toast({ title: '错误', description: 'SHA256 标识格式不正确。' });
      return;
    }
    fetch(`${API_BASE_URL}/clipboards/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: h, password: '' }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (data === -1) {
          setPasswordDialogOpen(true);
          return;
        }
        setContent(typeof data === 'string' ? data : data.content);
      })
      .catch(() => {
        toast({ title: '错误', description: '拉取失败' });
      });
  }, [hash, toast]);

  const submitPassword = () => {
    const h = hash;
    fetch(`${API_BASE_URL}/clipboards/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: h, password }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (data === -1) {
          toast({ title: '提示', description: '密码错误，访问被拒绝。' });
          return;
        }
        setContent(typeof data === 'string' ? data : data.content);
        setPasswordDialogOpen(false);
      })
      .catch(() => {
        toast({ title: '错误', description: '拉取失败' });
      });
  };

  const copyText = (text: string, message: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: '成功', description: message });
      }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        try {
          const ok = document.execCommand('copy');
          if (ok) {
            toast({ title: '成功', description: message });
          } else {
            toast({ title: '错误', description: '复制失败' });
          }
        } catch {
          toast({ title: '错误', description: '复制失败' });
        } finally {
          document.body.removeChild(textarea);
        }
      });
    }
  };

  return (
    <main className="container mx-auto px-6 pt-24 flex flex-col items-center justify-center min-h-screen">
      <h1 className="font-display text-6xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-800 bg-clip-text text-transparent select-none text-center">
        Shear
      </h1>
      <p className="mt-4 text-center text-muted-foreground">Markdown 公共剪贴板</p>

      {content && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <div className="flex items-center gap-2">
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="显示模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">原文</SelectItem>
                  <SelectItem value="split">分屏</SelectItem>
                  <SelectItem value="rendered">渲染</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => copyText(content, '原文已复制到剪贴板！')}>复制原文</Button>
            </div>
          </div>
          <div className="p-4 h-[calc(100vh-56px)]">
            <div className={`grid ${mode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4 h-full`}>
              {(mode === 'raw' || mode === 'split') && (
                <Textarea ref={textRef as unknown as React.Ref<HTMLTextAreaElement>} value={content} readOnly onScroll={(e) => { if (previewRef && previewRef.current) syncScroll(e.currentTarget, previewRef.current); }} className="w-full h-full resize-none" />
              )}
              {(mode === 'rendered' || mode === 'split') && (
                <div ref={previewRef as unknown as React.Ref<HTMLDivElement>} className="w-full h-full overflow-y-auto rounded-lg border p-4">
                  <MarkdownViewer content={content} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>访问受保护内容</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Hash className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={hash} readOnly className="pl-8" />
            </div>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
          </div>
          <DialogFooter>
            <Button onClick={submitPassword}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

