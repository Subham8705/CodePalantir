import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileCode, FunctionSquare, Boxes, Users, GitBranch, Clock, ArrowRight,
  Network, Map, Users as UsersIcon, Activity, FolderGit2, Sparkles, Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useApi } from '@/context/ApiContext';


const statCards = [
  { label: 'Files', value: '247', icon: FileCode, color: 'text-primary-400', bg: 'bg-primary-500/10' },
  { label: 'Functions', value: '1,482', icon: FunctionSquare, color: 'text-secondary-400', bg: 'bg-secondary-500/10' },
  { label: 'Modules', value: '32', icon: Boxes, color: 'text-accent-400', bg: 'bg-accent-500/10' },
  { label: 'Contributors', value: '14', icon: Users, color: 'text-success-400', bg: 'bg-success-500/10' },
];



export function OverviewPage() {
  const { mockRepository, mockModules, mockContributors, mockOnboardingSteps } = useApi();

  const navigate = useNavigate();
  const completedSteps = mockOnboardingSteps.filter((s) => s.completed).length;
  const totalSteps = 12;
  const onboardingPct = (completedSteps / totalSteps) * 100;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">{mockRepository.name}</h1>
            <Badge variant="success">
              <span className="w-1.5 h-1.5 rounded-full bg-success-400" /> Active
            </Badge>
          </div>
          <p className="text-sm text-gray-400">{mockRepository.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><GitBranch size={12} /> {mockRepository.branch}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> Last analyzed {mockRepository.lastAnalyzed}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={mockRepository.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
            <FolderGit2 size={15} /> GitHub
          </a>
          <button onClick={() => navigate('/app/onboarding')} className="btn-primary text-sm">
            <Map size={15} /> Start Onboarding
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Files', value: mockRepository.stats.files.toString(), icon: FileCode, color: 'text-primary-400', bg: 'bg-primary-500/10' },
          { label: 'Functions', value: mockRepository.stats.functions.toString(), icon: FunctionSquare, color: 'text-secondary-400', bg: 'bg-secondary-500/10' },
          { label: 'Modules', value: mockRepository.stats.modules.toString(), icon: Boxes, color: 'text-accent-400', bg: 'bg-accent-500/10' },
          { label: 'Contributors', value: mockRepository.stats.contributors.toString(), icon: Users, color: 'text-success-400', bg: 'bg-success-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
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

      {/* Languages + Frameworks */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">Language Distribution</h3>
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {mockRepository.languages.map((lang) => (
              <div
                key={lang.name}
                style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
                className="transition-all"
                title={`${lang.name} ${lang.percentage}%`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mockRepository.languages.map((lang) => (
              <div key={lang.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: lang.color }} />
                <span className="text-sm text-gray-300">{lang.name}</span>
                <span className="text-xs text-gray-500 ml-auto">{lang.percentage}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Framework Detection</h3>
          <div className="space-y-2.5">
            {mockRepository.frameworks.map((fw) => (
              <div key={fw} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-elevated border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Zap size={15} className="text-primary-400" />
                </div>
                <span className="text-sm font-medium text-white">{fw}</span>
                <Badge variant="success" className="ml-auto">Detected</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Network, title: 'Architecture', desc: '5 layers, 32 modules, 89 internal dependencies', path: '/app/architecture', color: 'primary' },
          { icon: Map, title: 'Developer Onboarding', desc: `${completedSteps}/${totalSteps} modules • ${onboardingPct.toFixed(0)}% complete`, path: '/app/onboarding', color: 'secondary' },
          { icon: UsersIcon, title: 'Code Ownership', desc: '14 contributors, 6 single-owner modules', path: '/app/ownership', color: 'accent' },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Card hover className="p-5 cursor-pointer" onClick={() => navigate(card.path)}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  card.color === 'primary' ? 'bg-primary-500/15 text-primary-400' :
                  card.color === 'secondary' ? 'bg-secondary-500/15 text-secondary-400' :
                  'bg-accent-500/15 text-accent-400'
                }`}>
                  <card.icon size={20} />
                </div>
                <ArrowRight size={16} className="text-gray-600" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">{card.title}</h4>
              <p className="text-xs text-gray-500">{card.desc}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Activity + Important modules */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Recent activity */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            <Activity size={16} className="text-gray-600" />
          </div>
          <div className="space-y-0.5">
            {mockRepository.recentActivity?.map((activity, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-bg-hover transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                  {activity.author?.split(' ').map((n: string) => n[0]).join('').substring(0,2) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">
                    <span className="font-medium text-white">{activity.author}</span>{' '}
                    {activity.type === 'merge' ? 'merged' : activity.type === 'review' ? 'approved' : 'committed'}{' '}
                    {activity.message}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="primary">{activity.module}</Badge>
                    <span className="text-xs text-gray-600">{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Important modules */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Important Modules</h3>
          <div className="space-y-2">
            {mockModules.slice(0, 5).map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/app/modules/${m.id}`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-bg-elevated border border-border hover:border-border-strong transition-colors text-left"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.fileCount} files • {m.layer}</div>
                </div>
                <ArrowRight size={14} className="text-gray-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Onboarding CTA */}
      {onboardingPct < 100 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/5" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={24} className="text-primary-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Start Your Onboarding</h3>
                  <p className="text-sm text-gray-400">Follow a guided path through this repository. {completedSteps} of {totalSteps} modules understood so far.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-32 h-1.5 bg-bg-base rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full" style={{ width: `${onboardingPct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{onboardingPct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <button onClick={() => navigate('/app/onboarding')} className="btn-primary whitespace-nowrap">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
