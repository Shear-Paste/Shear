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
import { Copy, Hash, Pencil, Save, Trash2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => {
  const language = (lang && hljs.getLanguage(lang)) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

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

marked.setOptions({ gfm: true, breaks: false, renderer });

const MarkdownViewer = ({ content }: { content: string }) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    const src = typeof content === 'string' ? content : '';
    const rendered = marked.parse(src) as string;
    const sanitized = DOMPurify.sanitize(rendered);
    setHtml(sanitized);
  }, [content]);

  return <div className="markdown max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
};

export default function HashPage() {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [editAccessPassword, setEditAccessPassword] = useState('');
  const [editPasswordDialogOpen, setEditPasswordDialogOpen] = useState(false);
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
    if (!/^[a-zA-Z0-9-_]{8}$/.test(h)) {
      toast({ title: '错误', description: 'UID 格式不正确。' });
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

  const handleDelete = () => {
    const h = hash;
    fetch(`${API_BASE_URL}/clipboards/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: h, access: accessPassword }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (data === 1) {
          toast({ title: '成功', description: '成功删除该内容。' });
          setContent('');
          setDeleteDialogOpen(false);
        } else {
          toast({ title: '失败', description: '删除失败，请检查安全密码是否正确。' });
        }
      })
      .catch(() => {
        toast({ title: '错误', description: '删除失败' });
      });
  };

  const handleEdit = () => {
    const h = hash;
    fetch(`${API_BASE_URL}/clipboards/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: h, access: editAccessPassword }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (data === 1) {
          setEdit(true);
          setEditPasswordDialogOpen(false);
          toast({ title: '成功', description: '已进入编辑模式。' });
        } else {
          toast({ title: '失败', description: '安全密码错误。' });
        }
      })
      .catch(() => {
        toast({ title: '错误', description: '操作失败' });
      });
  };

  const handleSave = () => {
    const h = hash;
    fetch(`${API_BASE_URL}/clipboards/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: h, content, access: editAccessPassword }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (data === 1) {
          setEdit(false);
          toast({ title: '成功', description: '内容已保存。' });
        } else {
          toast({ title: '失败', description: '保存失败。' });
        }
      })
      .catch(() => {
        toast({ title: '错误', description: '操作失败' });
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
              {edit ? (
                <Button onClick={handleSave}><Save className="mr-2 size-4" />保存</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => copyText(content, '原文已复制到剪贴板！')}>复制原文</Button>
                  <Button variant="outline" onClick={() => setEditPasswordDialogOpen(true)}><Pencil className="mr-2 size-4" />修改内容</Button>
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="mr-2 size-4" />删除内容</Button>
                </>
              )}
            </div>
          </div>
          <div className="p-4 h-[calc(100vh-56px)]">
            <div className={`grid ${mode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'} gap-4 h-full`}>
              {(mode === 'raw' || mode === 'split') && (
                <Textarea ref={textRef as unknown as React.Ref<HTMLTextAreaElement>} value={content} readOnly={!edit} onChange={(e) => setContent(e.target.value)} onScroll={(e) => { if (previewRef && previewRef.current) syncScroll(e.currentTarget, previewRef.current); }} className="w-full h-full resize-none" />
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

      <Dialog open={editPasswordDialogOpen} onOpenChange={setEditPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修改内容</DialogTitle>
          </DialogHeader>
          <p>请输入安全密码以修改内容。</p>
          <div className="flex flex-col gap-3 mt-4">
            <Input value={editAccessPassword} onChange={(e) => setEditAccessPassword(e.target.value)} placeholder="请输入安全密码" />
          </div>
          <DialogFooter>
            <Button onClick={handleEdit}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除内容</DialogTitle>
          </DialogHeader>
          <p>你确定要删除该内容吗？该操作无法撤回。</p>
          <div className="flex flex-col gap-3 mt-4">
            <Input value={accessPassword} onChange={(e) => setAccessPassword(e.target.value)} placeholder="请输入安全密码" />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

