'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Plus, X, Eye, Hash, Lock, Copy } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => {
  const language = (lang && hljs.getLanguage(lang)) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.setOptions({
  gfm: true,
  breaks: false,
  renderer: renderer
});

const MarkdownViewer = ({ content }: { content: string }) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const src = typeof content === 'string' ? content : '';
    const rendered = marked.parse(src) as string;
    const withKatex = rendered
      .replace(/\$\$([\s\S]*?)\$\$/g, (_m, tex) => {
        const decodedTex = tex
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&#39;/g, "'");
        return katex.renderToString(decodedTex, { throwOnError: false, displayMode: true });
      })
      .replace(/\$([^$\n]+)\$/g, (_m, tex) => {
        const decodedTex = tex
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&#39;/g, "'");
        return katex.renderToString(decodedTex, { throwOnError: false, displayMode: false });
      });
    const sanitized = DOMPurify.sanitize(withKatex);
    setHtml(sanitized);
  }, [content]);

  return <div className="markdown max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
};

export default function Home() {
  const { toast } = useToast();
  const [viewOpen, setViewOpen] = useState(false);
  const [hashDialogOpen, setHashDialogOpen] = useState(false);
  const [mdInput, setMdInput] = useState('');
  const [hashValue, setHashValue] = useState('');
  const [hashInput, setHashInput] = useState('');
  const [fullUrl, setFullUrl] = useState('');
  const [fetchedContent, setFetchedContent] = useState('');
  const [viewMode, setViewMode] = useState('split');
  const [createPassword, setCreatePassword] = useState('');
  const [createAccessPassword, setCreateAccessPassword] = useState('');
  const router = useRouter();
  const [createFullscreen, setCreateFullscreen] = useState(false);
  const [viewFullscreen, setViewFullscreen] = useState(false);
  const [createViewMode, setCreateViewMode] = useState('split');
  const createTextRef = useRef<HTMLTextAreaElement | null>(null);
  const createPreviewRef = useRef<HTMLDivElement | null>(null);
  const viewTextRef = useRef<HTMLTextAreaElement | null>(null);
  const viewPreviewRef = useRef<HTMLDivElement | null>(null);

  const syncScroll = (source: HTMLElement, target: HTMLElement) => {
    const sMax = (source.scrollHeight - source.clientHeight) || 1;
    const tMax = target.scrollHeight - target.clientHeight;
    const ratio = source.scrollTop / sMax;
    target.scrollTop = ratio * tMax;
  };

  const handleSave = async () => {
    if (!createAccessPassword) {
      toast({ title: '错误', description: '安全密码是必填项。' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/clipboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: mdInput, password: createPassword, access: createAccessPassword }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }
      const data = await res.json();
      if (data === -1) {
        toast({ title: '提示', description: '该内容已被储存过。' });
        return;
      }
      setHashValue(data.hash);
      setFullUrl(`${window.location.origin}/${data.hash}`);
      setCreateFullscreen(false);
      setHashDialogOpen(true);
    } catch (error) {
      toast({ title: '错误', description: error.message });
    }
  };

  const handleFetch = () => {
    if (!/^[a-f0-9]{64}$/i.test(hashInput)) {
      toast({ title: '错误', description: 'SHA256 标识格式不正确。' });
      return;
    }
    router.push(`/${hashInput}`);
    setViewOpen(false);
  };

  const copyToClipboard = (text: string, message: string) => {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        toast({ title: '成功', description: message });
      }).catch(() => {
        // Fallback if clipboard API fails
        fallbackCopyToClipboard(text, message);
      });
    } else {
      // Use fallback method
      fallbackCopyToClipboard(text, message);
    }
  };

  const fallbackCopyToClipboard = (text: string, message: string) => {
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
  };

  return (
    <main className="container mx-auto px-6 pt-24 flex flex-col items-center justify-center min-h-screen">
      <h1 className="font-display text-6xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-800 bg-clip-text text-transparent select-none text-center">
        Shear
      </h1>
      <p className="mt-4 text-center text-muted-foreground">Markdown 公共剪贴板</p>

      <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button onClick={() => setCreateFullscreen(true)} size="lg" className="transition-all duration-300 ease-in-out hover:scale-105"><Plus className="mr-2 size-4" />新建剪贴</Button>
        <Button onClick={() => setViewOpen(true)} size="lg" variant="outline" className="transition-all duration-300 ease-in-out hover:scale-105"><Eye className="mr-2 size-4" />查看剪贴</Button>
      </div>

      {createFullscreen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <div className="flex items-center gap-3">
              <Select value={createViewMode} onValueChange={setCreateViewMode}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="显示模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">原文</SelectItem>
                  <SelectItem value="split">分屏</SelectItem>
                  <SelectItem value="rendered">渲染</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="留空表示不设密码" className="pl-8" />
              </div>
              <div className="relative w-64">
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={createAccessPassword} onChange={(e) => setCreateAccessPassword(e.target.value)} placeholder="安全密码(必填)" className="pl-8" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCreateFullscreen(false)}><X className="size-4" /></Button>
              <Button onClick={handleSave}>保存</Button>
            </div>
          </div>
          <div className="p-4 h-[calc(100vh-56px)]">
            <div className={`grid ${createViewMode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4 h-full`}>
              {(createViewMode === 'raw' || createViewMode === 'split') && (
                <Textarea ref={createTextRef as unknown as React.Ref<HTMLTextAreaElement>} value={mdInput} onChange={(e) => setMdInput(e.target.value)} onScroll={(e) => { if (createPreviewRef && createPreviewRef.current) syncScroll(e.currentTarget, createPreviewRef.current); }} className="w-full h-full resize-none" placeholder="在此输入 Markdown 内容..." />
              )}
              {(createViewMode === 'rendered' || createViewMode === 'split') && (
                <div ref={createPreviewRef as unknown as React.Ref<HTMLDivElement>} className="w-full h-full overflow-y-auto rounded-lg border p-4">
                  <MarkdownViewer content={mdInput} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={hashDialogOpen} onOpenChange={setHashDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>内容已保存</DialogTitle>
            <DialogDescription>内容标识（SHA256）</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={hashValue} />
            <Button size="icon" variant="outline" aria-label="复制 Hash" onClick={() => copyToClipboard(hashValue, 'Hash 已复制到剪贴板！')}>
              <Copy className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Input readOnly value={fullUrl} />
            <Button size="icon" variant="outline" aria-label="复制链接" onClick={() => copyToClipboard(fullUrl, '链接已复制到剪贴板！')}>
              <Copy className="size-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>查看剪贴</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Hash className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={hashInput} onChange={(e) => setHashInput(e.target.value)} placeholder="输入 SHA256 标识" className="pl-8" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleFetch}><Eye className="mr-2 size-4" />查看</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewFullscreen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between px-4 h-14 border-b">
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={setViewMode}>
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
              <Button variant="outline" onClick={() => { setViewFullscreen(false); setViewOpen(false); }}><X className="size-4" /></Button>
              <Button variant="outline" onClick={() => copyToClipboard(fetchedContent, '原文已复制到剪贴板！')}>复制原文</Button>
            </div>
          </div>
          <div className="p-4 h-[calc(100vh-56px)]">
            <div className={`grid ${viewMode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4 h-full`}>
              {(viewMode === 'raw' || viewMode === 'split') && (
                <Textarea ref={viewTextRef as unknown as React.Ref<HTMLTextAreaElement>} value={fetchedContent} readOnly onScroll={(e) => { if (viewPreviewRef && viewPreviewRef.current) syncScroll(e.currentTarget, viewPreviewRef.current); }} className="w-full h-full resize-none" />
              )}
              {(viewMode === 'rendered' || viewMode === 'split') && (
                <div ref={viewPreviewRef as unknown as React.Ref<HTMLDivElement>} className="w-full h-full overflow-y-auto rounded-lg border p-4">
                  <MarkdownViewer content={fetchedContent} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
