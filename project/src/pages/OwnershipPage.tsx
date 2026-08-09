import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Boxes, User, GitCommit, FileCode, ArrowRight, Bot, Clock, GitBranch,
  ChevronRight, X, BarChart3,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { useApi } from '@/context/ApiContext';


export function OwnershipPage() {
  const { mockModules, mockContributors } = useApi();

  const singleOwnerCount = mockModules.filter(m => Object.keys(m.ownership || {}).length === 1).length;

  const topCards = [
    { label: 'Contributors', value: mockContributors.length.toString(), icon: Users, color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { label: 'Modules', value: mockModules.length.toString(), icon: Boxes, color: 'text-secondary-400', bg: 'bg-secondary-500/10' },
    { label: 'Single-owner modules', value: singleOwnerCount.toString(), icon: User, color: 'text-warning-400', bg: 'bg-warning-500/10' },
    { label: 'Shared ownership', value: (mockModules.length - singleOwnerCount).toString(), icon: Users, color: 'text-success-400', bg: 'bg-success-500/10' },
  ];

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [contributorDrawer, setContributorDrawer] = useState<string | null>(searchParams.get('contributor'));
  const [moduleDrawer, setModuleDrawer] = useState<string | null>(null);

  const heatmapData = useMemo(() => {
    return mockModules.map((module) => {
      return { name: module.name, moduleId: module.id, contributions: module.ownership || {} };
    });
  }, [mockModules]);

  const getIntensity = (pct: number) => {
    if (pct >= 60) return 'bg-primary-500';
    if (pct >= 30) return 'bg-primary-500/60';
    if (pct >= 15) return 'bg-primary-500/35';
    if (pct > 0) return 'bg-primary-500/15';
    return 'bg-bg-hover';
  };

  const selectedContributor = mockContributors.find((c) => c.id === contributorDrawer);
  const selectedModule = mockModules.find((m) => m.id === moduleDrawer);

  return (
    <div className="p-6 max-w-7xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users size={20} className="text-primary-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Code Ownership</h1>
        </div>
        <p className="text-sm text-gray-400">Understand who has contributed knowledge to each part of the repository.</p>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {topCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card hover className="p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.bg}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Heatmap */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Ownership Heatmap</h3>
            <Badge variant="primary"><BarChart3 size={11} /> Contribution intensity</Badge>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[500px]">
              {/* Contributor headers */}
              <div className="flex items-center gap-1 mb-2 pl-32">
                {mockContributors.map((c) => (
                  <div key={c.id} className="flex-1 text-center">
                    <div className="w-7 h-7 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-[10px] font-semibold text-white">
                      {c.avatar}
                    </div>
                    <div className="text-[9px] text-gray-500 mt-1 truncate">{c.name.split(' ')[0]}</div>
                  </div>
                ))}
              </div>
              {/* Rows */}
              {heatmapData.map((row) => (
                <div key={row.name} className="flex items-center gap-1 mb-1 group">
                  <button
                    onClick={() => row.moduleId && setModuleDrawer(row.moduleId)}
                    className="w-32 text-right pr-3 text-xs text-gray-300 hover:text-primary-400 transition-colors truncate"
                  >
                    {row.name}
                  </button>
                  {mockContributors.map((c) => {
                    const pct = row.contributions[c.id] || 0;
                    return (
                      <div
                        key={c.id}
                        className={`flex-1 h-9 rounded-md ${getIntensity(pct)} flex items-center justify-center text-[10px] font-medium transition-all hover:ring-2 hover:ring-primary-400/50 cursor-pointer ${pct > 0 ? 'text-white' : 'text-gray-700'}`}
                        title={`${row.name} - ${c.name}: ${pct}%`}
                      >
                        {pct > 0 ? `${pct}%` : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-bg-hover" />
              <div className="w-4 h-4 rounded bg-primary-500/15" />
              <div className="w-4 h-4 rounded bg-primary-500/35" />
              <div className="w-4 h-4 rounded bg-primary-500/60" />
              <div className="w-4 h-4 rounded bg-primary-500" />
            </div>
            <span>More</span>
          </div>
        </Card>

        {/* Contributors */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top Contributors</h3>
          <div className="space-y-2">
            {mockContributors.map((c) => (
              <button
                key={c.id}
                onClick={() => setContributorDrawer(c.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-bg-elevated border border-border hover:border-border-strong transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                  {c.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{c.name}</div>
                  <div className="text-xs text-gray-500 truncate">{c.primaryAreas?.join(', ') || 'No primary areas'}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-white">{c.contributionPct}%</div>
                  <div className="text-[10px] text-gray-500">{c.commits} commits</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Contributor Drawer */}
      <Drawer open={!!selectedContributor} onClose={() => setContributorDrawer(null)} width="max-w-md">
        {selectedContributor && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-lg font-semibold text-white">
                {selectedContributor.avatar}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{selectedContributor.name}</h2>
                <p className="text-sm text-gray-400">{selectedContributor.role}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-elevated rounded-lg p-3 border border-border text-center">
                <GitCommit size={16} className="text-primary-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-white">{selectedContributor.commits}</div>
                <div className="text-[10px] text-gray-500">Commits</div>
              </div>
              <div className="bg-bg-elevated rounded-lg p-3 border border-border text-center">
                <FileCode size={16} className="text-secondary-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-white">{selectedContributor.filesTouched}</div>
                <div className="text-[10px] text-gray-500">Files</div>
              </div>
              <div className="bg-bg-elevated rounded-lg p-3 border border-border text-center">
                <BarChart3 size={16} className="text-accent-400 mx-auto mb-1" />
                <div className="text-lg font-semibold text-white">{selectedContributor.contributionPct}%</div>
                <div className="text-[10px] text-gray-500">Contribution</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Primary Areas</h4>
              <div className="flex flex-wrap gap-2">
                {selectedContributor.primaryAreas?.map((area) => {
                  const m = mockModules.find((mm) => mm.name === area);
                  return (
                    <button
                      key={area}
                      onClick={() => m && setModuleDrawer(m.id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-bg-elevated border border-border text-gray-300 hover:border-primary-500/50 transition-colors"
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Contribution Distribution</h4>
              <div className="space-y-2">
                {selectedContributor.primaryAreas?.map((area) => {
                  const m = mockModules.find((mm) => mm.name === area);
                  const pct = m?.ownership[selectedContributor.id] || 0;
                  return (
                    <div key={area}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">{area}</span>
                        <span className="text-white font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-bg-base rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Activity</h4>
              <div className="space-y-2">
                {selectedContributor.recentActivity?.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-bg-elevated border border-border">
                    <div className="w-6 h-6 rounded-md bg-bg-hover flex items-center justify-center flex-shrink-0">
                      {a.type === 'commit' && <GitCommit size={12} className="text-primary-400" />}
                      {a.type === 'review' && <FileCode size={12} className="text-secondary-400" />}
                      {a.type === 'merge' && <GitBranch size={12} className="text-success-400" />}
                      {a.type === 'comment' && <Bot size={12} className="text-accent-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-200">{a.message}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="primary" className="text-[10px]">{a.module}</Badge>
                        <span className="text-[10px] text-gray-600">{a.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Module Ownership Drawer */}
      <Drawer open={!!selectedModule} onClose={() => setModuleDrawer(null)} width="max-w-md">
        {selectedModule && (
          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedModule.color }} />
                <Badge variant="primary">{selectedModule.layer}</Badge>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">{selectedModule.name}</h2>
              <p className="text-sm text-gray-400">{selectedModule.description}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Knowledge Distribution</h4>
              <div className="space-y-3">
                {Object.entries(selectedModule.ownership).map(([cid, pct]) => {
                  const c = mockContributors.find((x) => x.id === cid);
                  if (!c) return null;
                  const isPrimary = pct === Math.max(...Object.values(selectedModule.ownership));
                  return (
                    <div key={cid}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-[10px] font-semibold text-white">
                          {c.avatar}
                        </div>
                        <span className="text-sm text-gray-200">{c.name}</span>
                        {isPrimary && <Badge variant="primary" className="text-[10px]">Primary</Badge>}
                        <span className="text-sm font-semibold text-white ml-auto">{pct}%</span>
                      </div>
                      <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: selectedModule.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent Contributors</h4>
              <div className="space-y-2">
                {selectedModule.primaryContributors?.map((cid) => {
                  const c = mockContributors.find((x) => x.id === cid);
                  if (!c) return null;
                  return (
                    <div key={cid} className="flex items-center gap-3 p-2 rounded-lg bg-bg-elevated border border-border">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-xs font-semibold text-white">
                        {c.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.recentActivity?.[0]?.message || 'No recent activity'}</div>
                      </div>
                      <span className="text-xs text-gray-500">{c.recentActivity?.[0]?.timestamp || ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button onClick={() => navigate(`/app/modules/${selectedModule.id}`)} size="sm" className="flex-1">
                View Module <ArrowRight size={14} />
              </Button>
              <Button variant="secondary" size="sm">
                <GitBranch size={14} /> Git History
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
