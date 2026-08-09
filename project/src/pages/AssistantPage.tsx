import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Copy, RefreshCw, ExternalLink, Sparkles, User, FileCode,
  Check, MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ChatMessage } from '@/types';

// Temporarily mock the AI response until the FastAPI backend endpoint is implemented
const getAiResponse = (question: string) => {
  return {
    content: "The backend AI service is not connected yet. Please implement Phase 6 to enable chat functionality.",
    sources: []
  };
};

const suggestedQuestions = [
  'Explain this repository',
  'Where should I start?',
  'Explain the architecture',
  'Explain authentication',
  'Which modules are most important?',
  'What depends on the payment service?',
  'Who mainly works on authentication?',
];

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      "Hello! I'm your repository assistant. I've analyzed the react-dashboard codebase and can answer questions about its architecture, dependencies, ownership, and onboarding path.\n\nTry asking me something, or pick a suggested question below to get started.",
    timestamp: new Date().toISOString(),
  },
];

export function AssistantPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (question?: string) => {
    const text = question || input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const response = getAiResponse(text);
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      sources: response.sources,
      timestamp: new Date().toISOString(),
      streaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const words = response.content.split(' ');
    let wordIndex = 0;
    const interval = setInterval(() => {
      if (wordIndex >= words.length) {
        clearInterval(interval);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
        );
        setStreaming(false);
        return;
      }
      const chunk = words.slice(0, wordIndex + 1).join(' ');
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: chunk } : m)),
      );
      wordIndex++;
    }, 30);
  };

  const handleRegenerate = (msgId: string) => {
    const userMsg = messages.find((m, i) => m.id === msgId && i > 0);
    const prevUser = messages[messages.findIndex((m) => m.id === msgId) - 1];
    if (prevUser) {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      handleSend(prevUser.content);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-bg-elevated/30">
        <div className="flex items-center gap-2 mb-1">
          <Bot size={20} className="text-secondary-400" />
          <h1 className="text-lg font-semibold text-white">Repository Assistant</h1>
        </div>
        <p className="text-sm text-gray-400">Ask questions about this codebase.</p>
      </div>

      {/* Chat */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
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
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-secondary-400" />}
                </div>

                {/* Message */}
                <div className={`flex-1 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  <div className={`inline-block max-w-full ${msg.role === 'user' ? '' : 'w-full'}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-bg-card border border-border'
                    }`}>
                      <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                        {msg.streaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-secondary-400 animate-pulse rounded-sm" />}
                      </p>
                    </div>

                    {/* Sources + actions */}
                    {msg.role === 'assistant' && !msg.streaming && msg.content && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-2 space-y-2"
                      >
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <FileCode size={11} /> Sources:
                            </span>
                            {msg.sources.map((src) => (
                              <button
                                key={src}
                                onClick={() => navigate(`/app/explorer?file=${src}`)}
                                className="text-xs px-2 py-0.5 rounded-md bg-bg-elevated border border-border text-primary-400 hover:border-primary-500/50 transition-colors font-mono"
                              >
                                {src}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
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
                          {msg.sources && msg.sources[0] && (
                            <button
                              onClick={() => navigate(`/app/explorer?file=${msg.sources![0]}`)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white px-2 py-1 rounded-md hover:bg-bg-hover transition-colors"
                            >
                              <ExternalLink size={12} /> Open Source
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Suggested questions (when only welcome message) */}
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
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || streaming}
              size="md"
              className="!rounded-xl h-12 px-4"
            >
              <Send size={16} />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-600">Powered by Qwen 2.5 via Ollama Local — responses are simulated with mock data.</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary"><Bot size={10} /> AI Assistant</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
