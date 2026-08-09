import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, File, Box, User, Network, Route, CornerDownLeft, ArrowUp, ArrowDown,
} from 'lucide-react';

import type { SearchResult, FileNode } from '@/types';
import { useApi } from '@/context/ApiContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

function flattenFiles(node: FileNode, acc: SearchResult[] = []): SearchResult[] {
  if (node.type === 'file') {
    acc.push({
      type: 'file',
      id: node.id,
      label: node.name,
      sublabel: node.path,
      path: `/explorer?file=${node.id}`,
    });
  }
  if (node.children) {
    for (const child of node.children) flattenFiles(child, acc);
  }
  return acc;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { mockModules, mockContributors, mockFileTree, mockOnboardingSteps, mockArchitectureNodes } = useApi();

  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];
    mockArchitectureNodes.forEach((n) =>
      results.push({ type: 'architecture', id: n.id, label: n.label, sublabel: `${n.layer} Layer`, path: `/architecture?node=${n.id}` }),
    );
    mockModules.forEach((m) =>
      results.push({ type: 'module', id: m.id, label: m.name, sublabel: m.description.slice(0, 60), path: `/modules/${m.id}` }),
    );
    mockContributors.forEach((c) =>
      results.push({ type: 'contributor', id: c.id, label: c.name, sublabel: c.role, path: `/ownership?contributor=${c.id}` }),
    );
    flattenFiles(mockFileTree).forEach((f) => results.push(f));
    mockOnboardingSteps.forEach((s) =>
      results.push({ type: 'onboarding', id: s.id, label: s.title, sublabel: `Step ${s.order}`, path: `/onboarding?step=${s.id}` }),
    );
    return results;
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return allResults.slice(0, 8);
    const q = query.toLowerCase();
    return allResults
      .filter((r) => r.label.toLowerCase().includes(q) || r.sublabel.toLowerCase().includes(q))
      .slice(0, 12);
  }, [query, allResults]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        navigate(filtered[selectedIndex].path);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selectedIndex, navigate, onClose]);

  const icons = {
    file: File,
    module: Box,
    contributor: User,
    architecture: Network,
    onboarding: Route,
  };

  const typeLabels = {
    file: 'File',
    module: 'Module',
    contributor: 'Contributor',
    architecture: 'Architecture',
    onboarding: 'Onboarding',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="w-full max-w-xl bg-bg-card border border-border rounded-xl shadow-elevated overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search size={18} className="text-gray-500" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search files, modules, contributors, architecture..."
                className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
              />
              <kbd className="text-xs text-gray-500 border border-border rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">No results found for "{query}"</div>
              ) : (
                filtered.map((result, i) => {
                  const Icon = icons[result.type];
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        navigate(result.path);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        i === selectedIndex ? 'bg-primary-600/15' : 'hover:bg-bg-hover'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        i === selectedIndex ? 'bg-primary-500/20 text-primary-400' : 'bg-bg-hover text-gray-400'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 truncate">{result.label}</div>
                        <div className="text-xs text-gray-500 truncate">{result.sublabel}</div>
                      </div>
                      <span className="text-xs text-gray-600 uppercase tracking-wide">{typeLabels[result.type]}</span>
                      {i === selectedIndex && <CornerDownLeft size={14} className="text-gray-500" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-xs text-gray-500">
              <span className="flex items-center gap-1"><ArrowUp size={12} /><ArrowDown size={12} /> navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft size={12} /> select</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
