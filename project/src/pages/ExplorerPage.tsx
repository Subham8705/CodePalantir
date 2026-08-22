import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import {
  ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, Search, GitBranch,
  Bot, BookPlus, Network, ArrowRight, X, FileText, Clock, Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { FileNode } from '@/types';
import { useApi } from '@/context/ApiContext';
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  type Node, type Edge, MarkerType,
} from 'reactflow';

function findFileById(node: FileNode, id: string): FileNode | null {
  if (node.id === id) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findFileById(child, id);
      if (found) return found;
    }
  }
  return null;
}

function findFileByPath(node: FileNode, path: string): FileNode | null {
  if (node.path === path) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findFileByPath(child, path);
      if (found) return found;
    }
  }
  return null;
}

function getLanguageFromFilename(filename: string): string {
  if (filename.endsWith('.tsx')) return 'typescript';
  if (filename.endsWith('.ts')) return 'typescript';
  if (filename.endsWith('.py')) return 'python';
  if (filename.endsWith('.css')) return 'css';
  if (filename.endsWith('.json')) return 'json';
  if (filename.endsWith('.md')) return 'markdown';
  return 'plaintext';
}

function FileTreeNode({ node, depth, selectedId, onSelect, expandedIds, toggleExpand }: {
  node: FileNode;
  depth: number;
  selectedId: string | null;
  onSelect: (node: FileNode) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const isDir = node.type === 'directory';
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <>
      <button
        onClick={() => (isDir ? toggleExpand(node.id) : onSelect(node))}
        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors ${
          isSelected ? 'bg-primary-600/15 text-white' : 'text-gray-400 hover:text-white hover:bg-bg-hover'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isDir ? (
          <>
            {isExpanded ? <ChevronDown size={14} className="flex-shrink-0 text-gray-600" /> : <ChevronRight size={14} className="flex-shrink-0 text-gray-600" />}
            {isExpanded ? <FolderOpen size={14} className="flex-shrink-0 text-primary-400" /> : <Folder size={14} className="flex-shrink-0 text-primary-400" />}
          </>
        ) : (
          <>
            <span className="w-3.5 flex-shrink-0" />
            <FileCode size={14} className="flex-shrink-0 text-gray-500" />
          </>
        )}
        <span className="truncate text-xs">{node.name}</span>
      </button>
      {isDir && isExpanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
}

export function ExplorerPage() {
  const { mockFileTree, mockModules, mockContributors } = useApi();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['root', 'src', 'backend', 'components', 'services', 'controllers', 'db']));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [depModalOpen, setDepModalOpen] = useState(false);

  useEffect(() => {
    const fileParam = searchParams.get('file');
    if (fileParam) {
      const file = fileParam.startsWith('src/') || fileParam.startsWith('backend/') || fileParam.startsWith('tests/')
        ? findFileByPath(mockFileTree, fileParam)
        : findFileById(mockFileTree, fileParam);
      if (file && file.type === 'file') {
        setSelectedFile(file);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedFile) return;
    setLoading(true);
    
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    // Fetch file content from backend
    fetch(`${API_BASE_URL}/files/content?path=${encodeURIComponent(selectedFile.path)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.text();
      })
      .then(content => {
        setFileContent(content);
        setLoading(false);
      })
      .catch(() => {
        setFileContent('// File content not available or backend not connected.');
        setLoading(false);
      });
  }, [selectedFile]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectFile = (node: FileNode) => {
    setSelectedFile(node);
    setSearchParams({ file: node.path });
  };

  // File dependency graph
  const depGraphNodes = useMemo<Node[]>(() => {
    if (!selectedFile) return [];
    const nodes: Node[] = [
      {
        id: selectedFile.id,
        position: { x: 300, y: 200 },
        data: { label: selectedFile.name },
        style: { background: '#3B82F620', border: '2px solid #3B82F6', color: '#fff', fontSize: 12, borderRadius: 8, padding: 8 },
      },
    ];
    
    // Dependencies (imports from)
    const deps = (selectedFile.imports || []).slice(0, 10);
    deps.forEach((depStr: string, i: number) => {
      const depName = depStr.split('/').pop() || depStr;
      const angle = (i / Math.max(deps.length, 1)) * Math.PI * 2;
      nodes.push({
        id: `dep-${i}`,
        position: { x: 300 + Math.cos(angle) * 180, y: 200 + Math.sin(angle) * 140 },
        data: { label: depName },
        style: { background: '#111827', border: '1px solid #21262D', color: '#8B949E', fontSize: 11, borderRadius: 8, padding: 6 },
      });
    });
    
    // Dependents (imported by)
    const dependents = (selectedFile.importedBy || []).slice(0, 10);
    dependents.forEach((depStr: string, i: number) => {
      const depName = depStr.split('/').pop() || depStr;
      const angle = (i / Math.max(dependents.length, 1)) * Math.PI * 2 + Math.PI;
      nodes.push({
        id: `dependent-${i}`,
        position: { x: 300 + Math.cos(angle) * 220, y: 200 + Math.sin(angle) * 100 },
        data: { label: depName },
        style: { background: '#111827', border: '1px solid #8B5CF640', color: '#8B949E', fontSize: 11, borderRadius: 8, padding: 6 },
      });
    });
    
    return nodes;
  }, [selectedFile]);

  const depGraphEdges = useMemo<Edge[]>(() => {
    if (!selectedFile) return [];
    const edges: Edge[] = [];
    const depsCount = Math.min((selectedFile.imports || []).length, 10);
    const dependentsCount = Math.min((selectedFile.importedBy || []).length, 10);
    
    for (let i = 0; i < depsCount; i++) {
      edges.push({
        id: `dep-edge-${i}`,
        source: `dep-${i}`,
        target: selectedFile.id,
        type: 'smoothstep',
        style: { stroke: '#3B82F655' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' },
      });
    }
    for (let i = 0; i < dependentsCount; i++) {
      edges.push({
        id: `dependent-edge-${i}`,
        source: selectedFile.id,
        target: `dependent-${i}`,
        type: 'smoothstep',
        style: { stroke: '#8B5CF655', strokeDasharray: '5 5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' },
      });
    }
    return edges;
  }, [selectedFile]);


  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* File tree */}
      <div className="w-64 border-r border-border bg-bg-elevated/30 flex flex-col flex-shrink-0 hidden md:flex">
        <div className="px-3 py-3 border-b border-border">
          <div className="text-xs font-semibold text-white mb-2">Explorer</div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter files..."
              className="w-full bg-bg-elevated border border-border rounded-md pl-8 pr-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-1">
          {mockFileTree.children?.map((child) => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={0}
              selectedId={selectedFile?.id || null}
              onSelect={handleSelectFile}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      </div>

      {/* Code viewer */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-elevated/30">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <FileText size={13} />
            <span className="font-mono">{selectedFile?.path || 'No file selected'}</span>
          </div>
          {selectedFile && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDepModalOpen(true)}>
                <Network size={13} /> Dependencies
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const prompt = `Please explain the file ${selectedFile.name} in detail. What is its purpose?`;
                  navigate('/app/assistant', { state: { initialPrompt: prompt } });
                }}
              >
                <Bot size={13} /> Explain
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 monaco-container overflow-hidden">
          {selectedFile ? (
            <Editor
              height="100%"
              language={getLanguageFromFilename(selectedFile.name)}
              value={fileContent}
              theme="vs-dark"
              options={{
                readOnly: true,
                fontSize: 13,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                lineNumbers: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'all',
                padding: { top: 12 },
                smoothScrolling: true,
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              Select a file from the explorer to view its source code.
            </div>
          )}
        </div>
      </div>

      {/* File info panel */}
      {selectedFile && (
        <div className="w-72 border-l border-border bg-bg-elevated p-4 space-y-4 overflow-y-auto hidden lg:block flex-shrink-0 z-10 relative">
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">File Information</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">File name</span>
                <span className="text-gray-200 font-mono truncate max-w-[150px]">{selectedFile.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Language</span>
                <Badge variant="primary">{selectedFile.language || '—'}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Lines</span>
                <span className="text-gray-200">{selectedFile.lines || '—'}</span>
              </div>
            </div>
          </div>

          {selectedFile.contributors && selectedFile.contributors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contributors</h4>
              <div className="space-y-2">
                {selectedFile.contributors.map((c) => (
                  <div key={c} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-[10px] font-semibold text-white">
                      {c.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-300">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedFile.imports && selectedFile.imports.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Imports ({selectedFile.imports.length})</h4>
              <div className="space-y-1">
                {selectedFile.imports.slice(0, 10).map((imp: string) => (
                  <div key={imp} className="text-xs font-mono text-gray-400 truncate" title={imp}>{imp}</div>
                ))}
                {selectedFile.imports.length > 10 && <div className="text-xs text-gray-500">+{selectedFile.imports.length - 10} more</div>}
              </div>
            </div>
          )}

          {selectedFile.importedBy && selectedFile.importedBy.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Imported By ({selectedFile.importedBy.length})</h4>
              <div className="space-y-1">
                {selectedFile.importedBy.slice(0, 10).map((imp: string) => (
                  <div key={imp} className="text-xs font-mono text-gray-400 truncate" title={imp}>{imp}</div>
                ))}
                {selectedFile.importedBy.length > 10 && <div className="text-xs text-gray-500">+{selectedFile.importedBy.length - 10} more</div>}
              </div>
            </div>
          )}

          <Button variant="secondary" size="sm" className="w-full" onClick={() => setDepModalOpen(true)}>
            <Network size={14} /> Show Dependencies
          </Button>
        </div>
      )}

      {/* Dependency Modal */}
      <Modal open={depModalOpen} onClose={() => setDepModalOpen(false)} title="File Dependencies" className="max-w-2xl">
        {selectedFile && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Visualizing dependencies for <span className="font-mono text-primary-400">{selectedFile.name}</span>
            </p>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }} /> Dependencies (imports from)</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border border-dashed" style={{ borderColor: '#8B5CF6' }} /> Dependents (imported by)</div>
            </div>
            <div className="h-80 rounded-lg bg-bg-base border border-border overflow-hidden">
              <ReactFlowProvider>
                <ReactFlow nodes={depGraphNodes} edges={depGraphEdges} fitView fitViewOptions={{ padding: 0.2 }} proOptions={{ hideAttribution: true }}>
                  <Background color="#1A1F27" gap={20} />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </ReactFlowProvider>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dependencies</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                  {(selectedFile.imports || []).length === 0 ? (
                    <span className="text-xs text-gray-600">No dependencies</span>
                  ) : (
                    (selectedFile.imports || []).map((imp: string) => (
                      <div key={imp} className="w-full flex items-center gap-2 text-xs text-gray-400">
                        <ArrowRight size={12} className="flex-shrink-0" /> <span className="font-mono truncate" title={imp}>{imp}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dependents</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                  {(selectedFile.importedBy || []).length === 0 ? (
                    <span className="text-xs text-gray-600">No dependents</span>
                  ) : (
                    (selectedFile.importedBy || []).map((imp: string) => (
                      <div key={imp} className="w-full flex items-center gap-2 text-xs text-gray-400">
                        <ArrowRight size={12} className="rotate-180 flex-shrink-0" /> <span className="font-mono truncate" title={imp}>{imp}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
