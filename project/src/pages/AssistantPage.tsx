import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Copy, RefreshCw, Sparkles, User, FileCode,
  Check, MessageSquare, AlertCircle, Zap, ChevronDown,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/context/ApiContext';

const API_BASE = 'http://127.0.0.1:8000/api/ai';

const MODELS = [
  { id: 'qwen2.5-coder:1.5b', label: 'Qwen 2.5 Coder 1.5B', badge: 'Default' },
  { id: 'llama3.2:3b', label: 'Llama 3.2 3B', badge: 'Fast' },
  { id: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B', badge: 'Code' },
  { id: 'deepseek-r1:latest', label: 'DeepSeek R1 8B', badge: 'Best' },
  { id: 'llama3:latest', label: 'Llama 3 8B', badge: null },
  { id: 'mistral:latest', label: 'Mistral 7B', badge: null },
  { id: 'llama2:latest', label: 'Llama 2 7B', badge: null },
];

const suggestedQuestions = [
  'Explain this repository in simple terms',
  'Where should a new developer start?',
  'What is the overall architecture?',
  'Which module handles the core parsing logic?',
  'What are the most important files?',
  'Who should I talk to about the backend?',
  'Explain the dependency structure',
  'What are potential areas of technical debt?',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  streaming?: boolean;
  error?: boolean;
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown renderer for common patterns
  const lines = content.split('\n');
  return (
    <div className="text-sm text-gray-200 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-white font-semibold text-base mt-3 mb-1">{line.replace('### ', '')}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-white font-bold text-base mt-3 mb-1">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-white font-bold text-lg mt-3 mb-1">{line.replace('# ', '')}</h1>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-primary-400 mt-0.5 flex-shrink-0">•</span>
              <span>{renderInline(line.replace(/^[-*] /, ''))}</span>
            </div>
          );
        }
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1];
          return (
            <div key={i} className="flex gap-2">
              <span className="text-primary-400 flex-shrink-0 font-mono text-xs mt-0.5">{num}.</span>
              <span>{renderInline(line.replace(/^\d+\. /, ''))}</span>
            </div>
          );
        }
        if (line.startsWith('```')) {
          return null; // handled below in block
        }
        if (line === '') return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  // Handle backtick code spans and **bold**
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="bg-bg-elevated text-primary-300 px-1.5 py-0.5 rounded font-mono text-xs border border-border">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function AssistantPage() {
  const navigate = useNavigate();
  const { mockRepository } = useApi();
  const repoName = mockRepository?.name || 'your repository';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your CodePalantir AI, powered by **DeepSeek R1** running locally via Ollama.\n\nI have full knowledge of **${repoName}** — its modules, architecture, dependencies, and ownership data. Ask me anything about the codebase!`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('qwen2.5-coder:1.5b');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Track whether user is near the bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 100; // px from bottom
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  // Smart auto-scroll: only scroll if user is already at bottom
  useEffect(() => {
    if (isAtBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Always scroll to bottom when a new user message is sent
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isAtBottomRef.current = true;
    }
  };

  // Check Ollama status on mount
  useEffect(() => {
    fetch(`${API_BASE}/models`)
      .then(r => r.json())
      .then(data => setOllamaStatus(data.error ? 'error' : 'ok'))
      .catch(() => setOllamaStatus('error'));
  }, []);

  const handleSend = async (question?: string) => {
    const text = question || input.trim();
    if (!text || streaming) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);
    scrollToBottom(); // always jump to bottom when user sends

    // Build conversation history for the API
    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const resp = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model: selectedModel }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || 'Backend error');
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              fullContent += parsed.content;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m)
              );
            }
          } catch (e: any) {
            if (e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)
      );
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: `⚠️ Error: ${err.message}`, streaming: false, error: true }
            : m
        )
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  // Handle initial prompt from navigation state
  const location = useLocation();
  const initialPromptProcessed = useRef(false);
  useEffect(() => {
    if (location.state?.initialPrompt && !initialPromptProcessed.current) {
      initialPromptProcessed.current = true;
      handleSend(location.state.initialPrompt);
      // clear state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages(prev =>
      prev.map(m => m.streaming ? { ...m, streaming: false } : m)
    );
  };

  const handleRegenerate = (msgId: string) => {
    const idx = messages.findIndex(m => m.id === msgId);
    if (idx > 0 && messages[idx - 1].role === 'user') {
      const userContent = messages[idx - 1].content;
      setMessages(prev => prev.filter(m => m.id !== msgId));
      handleSend(userContent);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-bg-elevated/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bot size={20} className="text-secondary-400" />
              <h1 className="text-lg font-semibold text-white">Repository Assistant</h1>
              <div className={`w-2 h-2 rounded-full ml-1 ${ollamaStatus === 'ok' ? 'bg-green-500' : ollamaStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
            </div>
            <p className="text-sm text-gray-400">
              Ask anything about <span className="text-white font-medium">{repoName}</span>
            </p>
          </div>

          {/* Model Picker */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-elevated border border-border hover:border-border-strong text-sm text-gray-300 transition-colors"
            >
              <Zap size={13} className="text-secondary-400" />
              <span>{currentModel.label}</span>
              {currentModel.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-500/20 text-secondary-400 font-semibold">
                  {currentModel.badge}
                </span>
              )}
              <ChevronDown size={13} className="text-gray-500" />
            </button>

            <AnimatePresence>
              {showModelPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 w-52 bg-bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-bg-hover transition-colors ${selectedModel === m.id ? 'text-white bg-bg-elevated' : 'text-gray-400'}`}
                    >
                      <span>{m.label}</span>
                      {m.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-500/20 text-secondary-400 font-semibold">
                          {m.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Ollama offline warning */}
        {ollamaStatus === 'error' && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            <AlertCircle size={13} />
            <span>Ollama is not running. Start it with: <code className="font-mono bg-red-500/10 px-1 rounded">ollama serve</code></span>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-primary-500 to-secondary-500'
                    : 'bg-secondary-500/15 border border-secondary-500/30'
                }`}>
                  {msg.role === 'user'
                    ? <User size={16} className="text-white" />
                    : <Bot size={16} className="text-secondary-400" />}
                </div>

                {/* Bubble */}
                <div className={`flex-1 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  <div className={`inline-block max-w-full ${msg.role === 'user' ? '' : 'w-full'}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : msg.error
                          ? 'bg-red-500/10 border border-red-500/30'
                          : 'bg-bg-card border border-border'
                    }`}>
                      {msg.role === 'assistant' && !msg.error
                        ? <MarkdownContent content={msg.content || '...'} />
                        : <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      }
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-4 ml-1 bg-secondary-400 animate-pulse rounded-sm" />
                      )}
                    </div>

                    {/* Actions */}
                    {msg.role === 'assistant' && !msg.streaming && msg.content && !msg.error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-2 flex items-center gap-1"
                      >
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-white px-2 py-1 rounded-md hover:bg-bg-hover transition-colors"
                        >
                          {copiedId === msg.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                        </button>
                        <button
                          onClick={() => handleRegenerate(msg.id)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-white px-2 py-1 rounded-md hover:bg-bg-hover transition-colors"
                        >
                          <RefreshCw size={12} /> Regenerate
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Suggested questions */}
          {messages.length === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="text-xs text-gray-500 mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-secondary-400" /> Suggested questions
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="flex items-center gap-2 p-3 rounded-lg bg-bg-card border border-border hover:border-secondary-500/40 transition-colors text-left group"
                  >
                    <MessageSquare size={14} className="text-gray-600 group-hover:text-secondary-400 transition-colors flex-shrink-0" />
                    <span className="text-sm text-gray-300">{q}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4 bg-bg-elevated/30">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask a question about this repository..."
                rows={1}
                className="w-full bg-bg-elevated border border-border rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500/30 transition-colors resize-none"
                style={{ minHeight: '48px', maxHeight: '160px' }}
              />
            </div>
            {streaming ? (
              <button
                onClick={handleStop}
                className="h-12 px-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
              >
                Stop
              </button>
            ) : (
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || streaming}
                size="md"
                className="!rounded-xl h-12 px-4"
              >
                <Send size={16} />
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-600">
              Powered by <span className="text-secondary-400">{currentModel.label}</span> via Ollama · Local & private
            </p>
            <Badge variant="secondary"><Bot size={10} /> AI Assistant</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
