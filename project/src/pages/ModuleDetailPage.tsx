import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileCode, GitBranch, Users, Bot, Clock, Layers, Network,
  FileText, ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

import { useApi } from '@/context/ApiContext';
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  type Node, type Edge, MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

const tabs = ['Overview', 'Files', 'Dependencies', 'Contributors', 'History'] as const;
type Tab = (typeof tabs)[number];


export function ModuleDetailPage() {
  const { mockModules, mockContributors } = useApi();

  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'Overview');

  const module = mockModules.find((m) => m.id === moduleId);

  if (!module) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center">
          <p className="text-gray-400">Module not found.</p>
          <Button onClick={() => navigate('/app/architecture')} className="mt-4">Back to Architecture</Button>
        </Card>
      </div>
    );
  }

  // Mini dependency graph
  const depNodes: Node[] = [
    { id: module.id, position: { x: 200, y: 150 }, data: { label: module.name }, type: 'input', style: { background: module.color + '20', border: `2px solid ${module.color}`, color: '#fff', fontSize: 12, borderRadius: 8 } },
    ...module.dependencies.map((depId, i) => {
      const dep = mockModules.find((m) => m.id === depId);
      return {
        id: depId,
        position: { x: 50 + i * 120, y: 300 },
        data: { label: dep?.name || depId },
        style: { background: '#111827', border: '1px solid #21262D', color: '#8B949E', fontSize: 11, borderRadius: 8 },
      };
    }),
  ];
  const depEdges: Edge[] = module.dependencies.map((depId) => ({
    id: `${module.id}-${depId}`,
    source: module.id,
    target: depId,
    type: 'smoothstep',
    style: { stroke: '#30363D' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3B82F6' },
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto pb-20 lg:pb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
        <button onClick={() => navigate('/app/architecture')} className="hover:text-white transition-colors">Architecture</button>
        <ChevronRight size={12} />
        <span className="text-gray-300">{module.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: module.color }} />
            <Badge variant="primary"><Layers size={11} /> {module.layer} Layer</Badge>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">{module.name}</h1>
          <p className="text-sm text-gray-400 max-w-2xl">{module.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><FileCode size={12} /> {module.fileCount} files</span>
            <span className="flex items-center gap-1"><GitBranch size={12} /> {module.dependencies.length} dependencies</span>
            <span className="flex items-center gap-1"><Network size={12} /> {module.dependents.length} dependents</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/app/assistant')}>
            <Bot size={14} /> Explain Module
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate('/app/explorer')}>
            <FileText size={14} /> View Files
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="module-tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'Overview' && (
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-white mb-3">AI Explanation</h3>
              <div className="p-4 rounded-lg bg-secondary-500/5 border border-secondary-500/20">
                <div className="flex items-start gap-2">
                  <Bot size={18} className="text-secondary-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-300 leading-relaxed">{module.aiExplanation}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Module Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Files</span><span className="text-sm font-semibold text-white">{module.fileCount}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Dependencies</span><span className="text-sm font-semibold text-white">{module.dependencies.length}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Dependents</span><span className="text-sm font-semibold text-white">{module.dependents.length}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Contributors</span><span className="text-sm font-semibold text-white">{Object.keys(module.ownership).length}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Layer</span><Badge variant="primary">{module.layer}</Badge></div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'Files' && (
          <div className="space-y-2">
            {module.files.map((file) => (
              <Card key={file.path} hover className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/app/explorer?file=${file.path}`)}>
                <div className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">
                  <FileCode size={16} className="text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{file.name}</div>
                  <div className="text-xs text-gray-500 font-mono truncate">{file.path}</div>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                  <span>{file.lines} lines</span>
                  <span>{file.type}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {file.lastModified}</span>
                </div>
                <ChevronRight size={16} className="text-gray-600" />
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'Dependencies' && (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Dependencies (imports from)</h3>
              <div className="space-y-2">
                {module.dependencies.map((depId) => {
                  const dep = mockModules.find((m) => m.id === depId);
                  if (!dep) return null;
                  return (
                    <button key={depId} onClick={() => navigate(`/app/modules/${depId}`)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-elevated border border-border hover:border-border-strong transition-colors text-left">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dep.color }} />
                      <span className="text-sm font-medium text-white flex-1">{dep.name}</span>
                      <Badge>{dep.layer}</Badge>
                    </button>
                  );
                })}
                {module.dependencies.length === 0 && <p className="text-xs text-gray-600">No dependencies</p>}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Dependents (imported by)</h3>
              <div className="space-y-2">
                {module.dependents.map((depId) => {
                  const dep = mockModules.find((m) => m.id === depId);
                  if (!dep) return null;
                  return (
                    <button key={depId} onClick={() => navigate(`/app/modules/${depId}`)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-elevated border border-border hover:border-border-strong transition-colors text-left">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dep.color }} />
                      <span className="text-sm font-medium text-white flex-1">{dep.name}</span>
 <Badge>{dep.layer}</Badge>
                    </button>
                  );
                })}
                {module.dependents.length === 0 && <p className="text-xs text-gray-600">No dependents</p>}
              </div>
            </Card>
            <Card className="p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-white mb-3">Dependency Graph</h3>
              <div className="h-72 rounded-lg bg-bg-base border border-border overflow-hidden">
                <ReactFlowProvider>
                  <ReactFlow nodes={depNodes} edges={depEdges} fitView fitViewOptions={{ padding: 0.3 }} proOptions={{ hideAttribution: true }}>
                    <Background color="#1A1F27" gap={20} />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'Contributors' && (
          <div className="space-y-3">
            {Object.entries(module.ownership).map(([cid, pct]) => {
              const c = mockContributors.find((x) => x.id === cid);
              if (!c) return null;
              return (
                <Card key={cid} hover className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-sm font-semibold text-white">
                    {c.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.role} • {c.commits} commits</div>
                  </div>
                  <div className="w-32">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Ownership</span>
                      <span className="text-white font-medium">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-bg-base rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: module.color }} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === 'History' && (
          <div className="space-y-4">
            {(!module.history || module.history.length === 0) ? (
              <p className="text-gray-500 text-sm p-4 text-center">No recent commit history found for this module.</p>
            ) : (
              module.history.map((commit: any, i: number) => (
                <div key={commit.commit || i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-semibold text-primary-400">
                      {commit.author.substring(0, 2).toUpperCase()}
                    </div>
                    {i < module.history.length - 1 && <div className="w-px h-full bg-border mt-2" />}
                  </div>
                  <div className="flex-1 pb-6 pt-1">
                    <div className="text-sm font-medium text-white mb-1">{commit.message}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-mono text-gray-400">{commit.commit}</span>
                      <span>{commit.author}</span>
                      <span>{commit.date}</span>
                      {commit.additions !== undefined && (
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-green-400">+{commit.additions}</span>
                          <span className="text-red-400">-{commit.deletions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
