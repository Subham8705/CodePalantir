import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ReactFlow, Controls, Background, MiniMap, addEdge,
  type Node, type Edge, type Connection, type NodeChange, applyNodeChanges,
  MarkerType, ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, RotateCcw, Maximize, Eye, EyeOff, X, ArrowRight,
  Bot, Network, FileCode, GitBranch, Users, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';

import type { Layer } from '@/types';
import { useApi } from '@/context/ApiContext';

const layerColors: Record<Layer, string> = {
  Frontend: '#3B82F6',
  API: '#F59E0B',
  Service: '#8B5CF6',
  Data: '#06B6D4',
  Database: '#6366F1',
  External: '#6B7280',
};

const layerOrder: Layer[] = ['Frontend', 'API', 'Service', 'Data', 'Database'];

const layers: (Layer | 'All')[] = ['All', 'Frontend', 'API', 'Service', 'Data', 'Database'];

interface ModuleNodeData {
  label: string;
  layer: Layer;
  fileCount: number;
  dependencyCount: number;
  moduleId: string;
  [key: string]: unknown;
}

function createNodes(mockArchitectureNodes: any[]): Node<ModuleNodeData>[] {
  const layerY: Record<string, number> = {};
  layerOrder.forEach((l, i) => { layerY[l] = i * 140 + 60; });
  const layerCounts: Record<string, number> = {};

  return mockArchitectureNodes.map((n) => {
    layerCounts[n.layer] = (layerCounts[n.layer] || 0) + 1;
    const idx = layerCounts[n.layer];
    const count = mockArchitectureNodes.filter((x) => x.layer === n.layer).length;
    const x = 200 + (idx - count / 2) * 200;
    return {
      id: n.id,
      type: 'moduleNode',
      position: { x, y: layerY[n.layer] },
      data: {
        label: n.label,
        layer: n.layer,
        fileCount: n.fileCount,
        dependencyCount: n.dependencyCount,
        moduleId: n.moduleId,
      },
    };
  });
}

function createEdges(showExternal: boolean, mockArchitectureEdges: any[]): Edge[] {
  return mockArchitectureEdges
    .filter((e) => showExternal || e.type === 'internal')
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: e.type === 'external',
      style: { stroke: e.type === 'external' ? '#F59E0B55' : '#30363D', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' },
    }));
}

function ModuleNode({ data, selected }: { data: ModuleNodeData; selected: boolean }) {
  const color = layerColors[data.layer];
  return (
    <div
      className="rounded-xl border-2 px-4 py-3 min-w-[140px] transition-all"
      style={{
        backgroundColor: selected ? color + '20' : '#111827',
        borderColor: selected ? color : '#21262D',
        boxShadow: selected ? `0 0 20px ${color}40` : '0 1px 3px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-white">{data.label}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><FileCode size={11} /> {data.fileCount}</span>
        <span className="flex items-center gap-1"><GitBranch size={11} /> {data.dependencyCount}</span>
      </div>
      <div className="text-[10px] text-gray-600 mt-1 uppercase tracking-wide">{data.layer}</div>
    </div>
  );
}

const nodeTypes = { moduleNode: ModuleNode };

function ArchitectureFlow({ search, layerFilter, showExternal, onNodeClick, selectedNode, mockArchitectureNodes, mockArchitectureEdges }: {
  search: string;
  layerFilter: Layer | 'All';
  showExternal: boolean;
  onNodeClick: (id: string) => void;
  selectedNode: string | null;
  mockArchitectureNodes: any[];
  mockArchitectureEdges: any[];
}) {
  const [nodes, setNodes] = useState<Node<ModuleNodeData>[]>(createNodes(mockArchitectureNodes));
  const [edges, setEdges] = useState<Edge[]>(createEdges(showExternal, mockArchitectureEdges));
  const [, setRfInstance] = useState<unknown>(null);

  const filteredNodes = useMemo(() => {
    return nodes.map((n) => {
      const matchesSearch = !search || n.data.label.toLowerCase().includes(search.toLowerCase());
      const matchesLayer = layerFilter === 'All' || n.data.layer === layerFilter;
      return {
        ...n,
        hidden: !matchesSearch || !matchesLayer,
        selected: n.id === selectedNode,
      };
    });
  }, [nodes, search, layerFilter, selectedNode]);

  const filteredEdges = useMemo(() => createEdges(showExternal, mockArchitectureEdges), [showExternal, mockArchitectureEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes.filter((c) => c.type !== 'select'), nds));
    },
    []
  );

  const onConnect = useCallback((conn: Connection) => setEdges((eds) => addEdge(conn, eds)), []);

  return (
    <ReactFlow
      nodes={filteredNodes}
      edges={filteredEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onInit={setRfInstance}
      onNodeClick={(_, node) => onNodeClick(node.id)}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
      minZoom={0.3}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1A1F27" gap={20} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => layerColors[(n.data as ModuleNodeData)?.layer || 'Frontend']}
        maskColor="rgba(8,11,18,0.7)"
      />
    </ReactFlow>
  );
}

export function ArchitecturePage() {
  const { mockArchitectureNodes, mockArchitectureEdges, mockModules, mockContributors } = useApi();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [layerFilter, setLayerFilter] = useState<Layer | 'All'>('All');
  const [showExternal, setShowExternal] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(searchParams.get('node'));

  const selectedModule = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = mockArchitectureNodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;
    return mockModules.find((m) => m.id === node.moduleId) || null;
  }, [selectedNodeId]);

  const handleNodeClick = (id: string) => {
    setSelectedNodeId(id);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="border-b border-border px-4 py-3 flex flex-wrap items-center gap-3 bg-bg-elevated/30">
        <div className="flex items-center gap-2">
          <Network size={18} className="text-primary-400" />
          <h1 className="text-sm font-semibold text-white">Architecture Explorer</h1>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules..."
            className="w-full bg-bg-elevated border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>

        {/* Layer filter */}
        <div className="flex items-center gap-1">
          <Filter size={14} className="text-gray-500" />
          <div className="flex items-center gap-1 bg-bg-elevated border border-border rounded-lg p-0.5">
            {layers.map((l) => (
              <button
                key={l}
                onClick={() => setLayerFilter(l)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  layerFilter === l ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowExternal(!showExternal)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-bg-elevated border border-border text-gray-400 hover:text-white transition-colors"
        >
          {showExternal ? <Eye size={13} /> : <EyeOff size={13} />}
          {showExternal ? 'External deps visible' : 'External deps hidden'}
        </button>

        <button
          onClick={() => { setSearch(''); setLayerFilter('All'); setShowExternal(true); setSelectedNodeId(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-bg-elevated border border-border text-gray-400 hover:text-white transition-colors"
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* Flow */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ArchitectureFlow
            search={search}
            layerFilter={layerFilter}
            showExternal={showExternal}
            onNodeClick={handleNodeClick}
            selectedNode={selectedNodeId}
            mockArchitectureNodes={mockArchitectureNodes}
            mockArchitectureEdges={mockArchitectureEdges}
          />
        </ReactFlowProvider>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 card p-3 space-y-1.5">
          <div className="text-xs text-gray-500 mb-1">Architecture Layers</div>
          {layerOrder.map((l) => (
            <div key={l} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: layerColors[l] }} />
              <span className="text-xs text-gray-300">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} width="max-w-lg">
        {selectedModule && (
          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedModule.color }} />
                <Badge variant="primary">{selectedModule.layer} Layer</Badge>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{selectedModule.name}</h2>
              <p className="text-sm text-gray-400">{selectedModule.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-elevated rounded-lg p-3 border border-border">
                <div className="text-xs text-gray-500">Files</div>
                <div className="text-lg font-semibold text-white">{selectedModule.fileCount}</div>
              </div>
              <div className="bg-bg-elevated rounded-lg p-3 border border-border">
                <div className="text-xs text-gray-500">Dependencies</div>
                <div className="text-lg font-semibold text-white">{selectedModule.dependencies.length}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dependencies</h4>
              <div className="flex flex-wrap gap-2">
                {selectedModule.dependencies.map((depId) => {
                  const dep = mockModules.find((m) => m.id === depId);
                  return dep ? (
                    <button key={depId} onClick={() => setSelectedNodeId(depId)} className="text-xs px-2.5 py-1 rounded-md bg-bg-elevated border border-border text-gray-300 hover:border-primary-500/50 transition-colors">
                      {dep.name}
                    </button>
                  ) : null;
                })}
                {selectedModule.dependencies.length === 0 && <span className="text-xs text-gray-600">No dependencies</span>}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Dependents</h4>
              <div className="flex flex-wrap gap-2">
                {selectedModule.dependents.map((depId) => {
                  const dep = mockModules.find((m) => m.id === depId);
                  return dep ? (
                    <button key={depId} onClick={() => setSelectedNodeId(depId)} className="text-xs px-2.5 py-1 rounded-md bg-bg-elevated border border-border text-gray-300 hover:border-primary-500/50 transition-colors">
                      {dep.name}
                    </button>
                  ) : null;
                })}
                {selectedModule.dependents.length === 0 && <span className="text-xs text-gray-600">No dependents</span>}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Primary Contributors</h4>
              <div className="space-y-2">
                {selectedModule.primaryContributors.map((cid) => {
                  const c = mockContributors.find((x) => x.id === cid);
                  if (!c) return null;
                  return (
                    <div key={cid} className="flex items-center gap-3 p-2 rounded-lg bg-bg-elevated border border-border">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-xs font-semibold text-white">
                        {c.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{c.name}</div>
                        <div className="text-xs text-gray-500">{selectedModule.ownership[c.id] || 0}% ownership</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">AI Explanation</h4>
              <div className="p-3 rounded-lg bg-secondary-500/5 border border-secondary-500/20">
                <div className="flex items-start gap-2">
                  <Bot size={16} className="text-secondary-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedModule.aiExplanation}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button onClick={() => navigate(`/app/modules/${selectedModule.id}`)} size="sm" className="flex-1">
                Explore Module <ArrowRight size={14} />
              </Button>
              <Button variant="secondary" size="sm">
                <GitBranch size={14} /> Dependencies
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate('/app/assistant')}>
                <Bot size={14} /> Ask AI
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
