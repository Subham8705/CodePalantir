import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as d3Force from 'd3-force';
import * as d3Zoom from 'd3-zoom';
import * as d3Drag from 'd3-drag';
import * as d3Selection from 'd3-selection';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, RotateCcw, Eye, EyeOff, X, ArrowRight,
  Bot, Network, FileCode, GitBranch, Users, Layers,
  ZoomIn, ZoomOut, Maximize,
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

// ─── D3 Force Graph Component ───────────────────────────────────────────────
interface D3Node {
  id: string;
  label: string;
  layer: Layer;
  fileCount: number;
  dependencyCount: number;
  moduleId: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface D3Link {
  source: string | D3Node;
  target: string | D3Node;
  type: string;
}

function ForceGraph({
  nodes: rawNodes,
  edges: rawEdges,
  search,
  layerFilter,
  showExternal,
  onNodeClick,
  selectedNode,
}: {
  nodes: any[];
  edges: any[];
  search: string;
  layerFilter: Layer | 'All';
  showExternal: boolean;
  onNodeClick: (id: string) => void;
  selectedNode: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const simulationRef = useRef<d3Force.Simulation<D3Node, D3Link> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Filter nodes
  const filteredNodes = useMemo(() => {
    return rawNodes.filter((n: any) => {
      const matchesSearch = !search || n.label.toLowerCase().includes(search.toLowerCase());
      const matchesLayer = layerFilter === 'All' || n.layer === layerFilter;
      return matchesSearch && matchesLayer;
    });
  }, [rawNodes, search, layerFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n: any) => n.id)), [filteredNodes]);

  // Filter edges
  const filteredEdges = useMemo(() => {
    return rawEdges
      .filter((e: any) => showExternal || e.type === 'internal')
      .filter((e: any) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [rawEdges, showExternal, filteredNodeIds]);

  // Connected nodes for hover highlighting
  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const connected = new Set<string>([hoveredNode]);
    filteredEdges.forEach((e: any) => {
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      if (src === hoveredNode) connected.add(tgt);
      if (tgt === hoveredNode) connected.add(src);
    });
    return connected;
  }, [hoveredNode, filteredEdges]);

  // Resize observer
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(svg.parentElement!);
    return () => observer.disconnect();
  }, []);

  // Main D3 effect
  useEffect(() => {
    const svg = d3Selection.select(svgRef.current);
    const g = d3Selection.select(gRef.current);
    if (!svgRef.current || !gRef.current) return;

    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const { width, height } = dimensions;

    // Create node data
    const d3Nodes: D3Node[] = filteredNodes.map((n: any) => ({
      id: n.id,
      label: n.label,
      layer: n.layer,
      fileCount: n.fileCount,
      dependencyCount: n.dependencyCount,
      moduleId: n.moduleId,
      x: width / 2 + (Math.random() - 0.5) * 300,
      y: height / 2 + (Math.random() - 0.5) * 300,
    }));

    const d3Links: D3Link[] = filteredEdges.map((e: any) => ({
      source: e.source,
      target: e.target,
      type: e.type || 'internal',
    }));

    // Create simulation
    const simulation = d3Force.forceSimulation<D3Node>(d3Nodes)
      .force('charge', d3Force.forceManyBody().strength(-600))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force('collide', d3Force.forceCollide().radius(55))
      .force('link', d3Force.forceLink<D3Node, D3Link>(d3Links)
        .id((d) => d.id)
        .distance(160)
        .strength(0.4)
      )
      .force('x', d3Force.forceX(width / 2).strength(0.03))
      .force('y', d3Force.forceY(height / 2).strength(0.03))
      .alphaDecay(0.02);

    simulationRef.current = simulation;

    // ── Draw Links ──
    g.selectAll('.link').remove();
    const links = g.selectAll('.link')
      .data(d3Links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', (d: D3Link) => d.type === 'external' ? '#F59E0B55' : 'rgba(148, 163, 184, 0.35)')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', (d: D3Link) => d.type === 'external' ? '4,4' : 'none');

    // ── Draw Arrow markers ──
    svg.select('defs').remove();
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#3B82F680');

    links.attr('marker-end', 'url(#arrowhead)');

    // ── Draw Node groups ──
    g.selectAll('.node-group').remove();
    const nodeGroups = g.selectAll('.node-group')
      .data(d3Nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer');

    // Outer glow circle
    nodeGroups.append('circle')
      .attr('r', 28)
      .attr('fill', (d: D3Node) => (layerColors[d.layer] || '#8B5CF6') + '15')
      .attr('stroke', (d: D3Node) => (layerColors[d.layer] || '#8B5CF6') + '50')
      .attr('stroke-width', 2)
      .attr('class', 'node-outer');

    // Inner circle
    nodeGroups.append('circle')
      .attr('r', 12)
      .attr('fill', (d: D3Node) => (layerColors[d.layer] || '#8B5CF6') + '90')
      .attr('class', 'node-inner');

    // Label
    nodeGroups.append('text')
      .text((d: D3Node) => d.label)
      .attr('dy', 45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#E5E7EB')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('font-family', 'Inter, system-ui, sans-serif');

    // Sub-label (layer)
    nodeGroups.append('text')
      .text((d: D3Node) => d.layer.toUpperCase())
      .attr('dy', 58)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6B7280')
      .attr('font-size', '8px')
      .attr('letter-spacing', '1px')
      .attr('font-family', 'Inter, system-ui, sans-serif');

    // ── Interactions ──
    nodeGroups
      .on('click', (_event: any, d: D3Node) => {
        onNodeClick(d.id);
      })
      .on('mouseenter', (_event: any, d: D3Node) => {
        setHoveredNode(d.id);
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
      });

    // ── Drag behavior ──
    const dragBehavior = d3Drag.drag<SVGGElement, D3Node>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroups.call(dragBehavior as any);

    // ── Zoom behavior ──
    const zoomBehavior = d3Zoom.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior as any);

    // Store zoom behavior on svg element for external controls
    (svgRef.current as any).__zoom_behavior = zoomBehavior;

    // Initial fit
    svg.call(zoomBehavior.transform as any, d3Zoom.zoomIdentity.translate(0, 0).scale(0.9));

    // ── Tick ──
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroups.attr('transform', (d: D3Node) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredEdges, dimensions, onNodeClick]);

  // Update visuals on hover/selection changes (without restarting simulation)
  useEffect(() => {
    const g = d3Selection.select(gRef.current);
    if (!g.node()) return;

    g.selectAll<SVGGElement, D3Node>('.node-group')
      .each(function(d) {
        const group = d3Selection.select(this);
        const isHovered = hoveredNode === d.id;
        const isSelected = selectedNode === d.id;
        const isConnected = hoveredNode ? connectedNodes.has(d.id) : true;
        const color = layerColors[d.layer] || '#8B5CF6';

        group.select('.node-outer')
          .transition().duration(200)
          .attr('r', isHovered || isSelected ? 32 : 28)
          .attr('fill', isSelected ? color + '40' : isHovered ? color + '30' : color + '15')
          .attr('stroke', isSelected ? color : isHovered ? color + '90' : color + '50')
          .attr('stroke-width', isSelected || isHovered ? 3 : 2)
          .style('opacity', isConnected ? 1 : 0.2);

        group.select('.node-inner')
          .transition().duration(200)
          .attr('r', isHovered || isSelected ? 14 : 12)
          .style('opacity', isConnected ? 1 : 0.2);

        group.selectAll('text')
          .transition().duration(200)
          .style('opacity', isConnected ? 1 : 0.15);
      });

    // Update link opacity
    g.selectAll<SVGLineElement, D3Link>('.link')
      .transition().duration(200)
      .attr('stroke', (d: any) => {
        if (!hoveredNode) return d.type === 'external' ? '#F59E0B55' : 'rgba(148, 163, 184, 0.35)';
        const src = typeof d.source === 'object' ? d.source.id : d.source;
        const tgt = typeof d.target === 'object' ? d.target.id : d.target;
        if (src === hoveredNode || tgt === hoveredNode) {
          return layerColors[(d.source as D3Node).layer] || '#3B82F6';
        }
        return 'rgba(148, 163, 184, 0.08)';
      })
      .attr('stroke-width', (d: any) => {
        if (!hoveredNode) return 1.5;
        const src = typeof d.source === 'object' ? d.source.id : d.source;
        const tgt = typeof d.target === 'object' ? d.target.id : d.target;
        return (src === hoveredNode || tgt === hoveredNode) ? 2.5 : 0.5;
      });

  }, [hoveredNode, selectedNode, connectedNodes]);

  // Zoom controls
  const handleZoomIn = () => {
    const svg = d3Selection.select(svgRef.current);
    const zoomBehavior = (svgRef.current as any)?.__zoom_behavior;
    if (zoomBehavior) svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.3);
  };
  const handleZoomOut = () => {
    const svg = d3Selection.select(svgRef.current);
    const zoomBehavior = (svgRef.current as any)?.__zoom_behavior;
    if (zoomBehavior) svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
  };
  const handleFitView = () => {
    const svg = d3Selection.select(svgRef.current);
    const zoomBehavior = (svgRef.current as any)?.__zoom_behavior;
    if (zoomBehavior) {
      svg.transition().duration(500).call(
        zoomBehavior.transform,
        d3Zoom.zoomIdentity.translate(dimensions.width * 0.05, dimensions.height * 0.05).scale(0.9)
      );
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      >
        <g ref={gRef} />
      </svg>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-1">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center bg-bg-elevated/90 border border-border rounded-lg text-gray-400 hover:text-white hover:border-primary-500/50 transition-all backdrop-blur-sm"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center bg-bg-elevated/90 border border-border rounded-lg text-gray-400 hover:text-white hover:border-primary-500/50 transition-all backdrop-blur-sm"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleFitView}
          className="w-8 h-8 flex items-center justify-center bg-bg-elevated/90 border border-border rounded-lg text-gray-400 hover:text-white hover:border-primary-500/50 transition-all backdrop-blur-sm"
          title="Fit to View"
        >
          <Maximize size={14} />
        </button>
      </div>

      {/* Node count */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-600 bg-bg-elevated/60 px-2 py-1 rounded backdrop-blur-sm">
        {filteredNodes.length} modules · {filteredEdges.length} connections
      </div>
    </div>
  );
}


// ─── Main Page ──────────────────────────────────────────────────────────────
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
  }, [selectedNodeId, mockArchitectureNodes, mockModules]);

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

      {/* Graph */}
      <div className="flex-1 relative">
        <ForceGraph
          nodes={mockArchitectureNodes}
          edges={mockArchitectureEdges}
          search={search}
          layerFilter={layerFilter}
          showExternal={showExternal}
          onNodeClick={handleNodeClick}
          selectedNode={selectedNodeId}
        />

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
