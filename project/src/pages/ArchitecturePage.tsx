import { useState, useMemo, useCallback, useEffect } from 'react';
import * as d3 from 'd3-force';
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
  return mockArchitectureNodes.map((n) => {
    // Initial random positions near center
    const x = 400 + (Math.random() - 0.5) * 400;
    const y = 300 + (Math.random() - 0.5) * 400;
    
    return {
      id: n.id,
      type: 'moduleNode',
      position: { x, y },
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
  const color = layerColors[data.layer] || layerColors.Service;
  return (
    <div className="flex flex-col items-center justify-center relative group">
      <div 
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all border-4 shadow-lg cursor-pointer"
        style={{
          backgroundColor: selected ? color + '40' : color + '20',
          borderColor: selected ? color : color + '80',
          boxShadow: selected ? `0 0 20px ${color}80` : `0 4px 12px ${color}30`,
        }}
      >
        <div className="w-6 h-6 rounded-full opacity-80" style={{ backgroundColor: color }} />
      </div>
      <div className="absolute top-16 mt-2 px-2.5 py-1 bg-[#111827] border border-[#21262D] rounded-lg text-xs font-semibold text-white whitespace-nowrap shadow-xl z-50">
        {data.label}
        <div className="text-[9px] text-gray-500 font-normal mt-0.5 text-center uppercase tracking-wider">{data.layer}</div>
      </div>
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
  const [nodes, setNodes] = useState<Node<ModuleNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [, setRfInstance] = useState<unknown>(null);

  useEffect(() => {
    const rawNodes = createNodes(mockArchitectureNodes);
    const rawEdges = createEdges(showExternal, mockArchitectureEdges);
    
    // Filter nodes first
    const fNodes = rawNodes.map((n) => {
      const matchesSearch = !search || n.data.label.toLowerCase().includes(search.toLowerCase());
      const matchesLayer = layerFilter === 'All' || n.data.layer === layerFilter;
      return {
        ...n,
        hidden: !matchesSearch || !matchesLayer,
        selected: n.id === selectedNode,
      };
    });

    const visibleNodes = fNodes.filter(n => !n.hidden);
    
    // Create D3 forces
    const d3Nodes = visibleNodes.map(n => ({ ...n, x: n.position.x, y: n.position.y }));
    const d3Links = rawEdges.map(e => ({ source: e.source, target: e.target, id: e.id }));

    const simulation = d3.forceSimulation(d3Nodes as any)
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(400, 300))
      .force('collide', d3.forceCollide().radius(70))
      .force('link', d3.forceLink(d3Links as any).id((d: any) => d.id).distance(200))
      .stop();

    // Run physics statically
    for (let i = 0; i < 200; i++) {
      simulation.tick();
    }

    // Apply computed positions back
    setNodes(fNodes.map(n => {
      if (n.hidden) return n;
      const computed = (d3Nodes as any).find((d: any) => d.id === n.id);
      if (computed) {
        return { ...n, position: { x: computed.x, y: computed.y } };
      }
      return n;
    }));
    
    setEdges(rawEdges);
  }, [mockArchitectureNodes, mockArchitectureEdges, search, layerFilter, showExternal, selectedNode]);

  const filteredNodes = nodes;
  const filteredEdges = edges;

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
