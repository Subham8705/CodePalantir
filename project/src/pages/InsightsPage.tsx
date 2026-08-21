import { motion } from 'framer-motion';
import {
  BarChart3, Layers, Network, Users, Map, FileCode, GitBranch,
  Boxes, Clock, CheckCircle,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadialBarChart, RadialBar, AreaChart, Area,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useApi } from '@/context/ApiContext';


const chartTooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid #21262D',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#E5E7EB',
};

export function InsightsPage() {
  const { mockRepository, mockModules, mockContributors, mockArchitectureNodes, mockArchitectureEdges, mockOnboardingSteps } = useApi();

  const completedSteps = mockOnboardingSteps.filter((s) => s.completed).length;
  const onboardingPct = (completedSteps / 12) * 100;

  const commitActivity = [
    { day: 'Mon', commits: 12 },
    { day: 'Tue', commits: 19 },
    { day: 'Wed', commits: 15 },
    { day: 'Thu', commits: 24 },
    { day: 'Fri', commits: 28 },
    { day: 'Sat', commits: 8 },
    { day: 'Sun', commits: 5 },
  ];

  const moduleSizeData = mockModules.map((m) => ({
    name: m.name,
    files: m.fileCount,
    color: m.color,
  }));

  const dependencyData = mockModules.map((m) => ({
    name: m.name,
    dependencies: m.dependencies.length,
    dependents: m.dependents.length,
  }));

  const ownershipData = mockContributors.map((c, idx) => ({
    name: c.name.split(' ')[0],
    contribution: c.contributionPct,
    fill: ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'][idx % 5],
  }));

  const totalFiles = mockRepository?.files?.length || 0;
  const numDirs = new Set((mockRepository?.files || []).map(f => f.path.split('/').slice(0, -1).join('/'))).size;
  const uniqueLayers = new Set(mockModules.map(m => m.layer)).size;
  const totalModules = mockModules.length;
  const moduleDependenciesCount = mockModules.reduce((acc, m) => acc + (m.dependencies?.length || 0), 0);
  const activeContributors = mockContributors.length;
  const sharedOwnershipModules = mockModules.filter(m => Object.keys(m.ownership || {}).length > 1).length;
  const singleOwnershipModules = mockModules.filter(m => Object.keys(m.ownership || {}).length === 1).length;
  const totalOnboardingSteps = mockOnboardingSteps.length || totalModules;

  const sections = [
    {
      title: 'Repository Structure',
      icon: FileCode,
      stats: [
        { label: 'Total files', value: totalFiles.toString(), sub: `across ${numDirs || 1} directories` },
        { label: 'Modules by layer', value: `${uniqueLayers} layers`, sub: 'Organized hierarchy' },
        { label: 'Module dependencies', value: moduleDependenciesCount.toString(), sub: 'inter-module connections' },
      ],
    },
    {
      title: 'Architecture',
      icon: Network,
      stats: [
        { label: 'Number of layers', value: uniqueLayers.toString(), sub: 'clear separation' },
        { label: 'Number of modules', value: totalModules.toString(), sub: 'major components' },
        { label: 'Total dependencies', value: moduleDependenciesCount.toString(), sub: 'within the codebase' },
      ],
    },
    {
      title: 'Ownership',
      icon: Users,
      stats: [
        { label: 'Contributors', value: activeContributors.toString(), sub: 'active members' },
        { label: 'Shared ownership', value: sharedOwnershipModules.toString(), sub: 'multi-contributor modules' },
        { label: 'Single-contributor modules', value: singleOwnershipModules.toString(), sub: 'knowledge concentrated' },
      ],
    },
    {
      title: 'Onboarding',
      icon: Map,
      stats: [
        { label: 'Total modules', value: totalModules.toString(), sub: 'in learning path' },
        { label: 'Estimated onboarding time', value: `${Math.max(1, Math.round(totalModules * 1.2))}h`, sub: 'for full path' },
        { label: 'Completed modules', value: `${completedSteps} / ${totalOnboardingSteps}`, sub: 'in progress' },
      ],
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 size={20} className="text-primary-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Insights</h1>
        </div>
        <p className="text-sm text-gray-400">Repository intelligence — architecture, ownership, and onboarding at a glance.</p>
      </div>

      {/* Summary sections */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {sections.map((section, si) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.05 }}>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <section.icon size={16} className="text-primary-400" />
                <h3 className="text-sm font-semibold text-white">{section.title}</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {section.stats.map((stat) => (
                  <div key={stat.label} className="bg-bg-elevated rounded-lg p-3 border border-border">
                    <div className="text-lg font-bold text-white">{stat.value}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{stat.label}</div>
                    <div className="text-[9px] text-gray-600 mt-0.5">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Language distribution */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Language Distribution</h3>
          <div className="flex items-center gap-4">
            <div className="w-40 h-40 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockRepository.languages}
                    dataKey="percentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {mockRepository.languages.map((lang) => (
                      <Cell key={lang.name} fill={lang.color} stroke="#0D1117" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {mockRepository.languages.map((lang) => (
                <div key={lang.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: lang.color }} />
                  <span className="text-sm text-gray-300 flex-1">{lang.name}</span>
                  <span className="text-sm font-semibold text-white">{lang.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Commit activity */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Commit Activity (Last 7 Days)</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={commitActivity}>
                <defs>
                  <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1F27" />
                <XAxis dataKey="day" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="commits" stroke="#3B82F6" strokeWidth={2} fill="url(#commitGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Module size distribution */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Module Size Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleSizeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1F27" horizontal={false} />
                <XAxis type="number" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: '#1C2230' }} />
                <Bar dataKey="files" radius={[0, 4, 4, 0]}>
                  {moduleSizeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Dependency count */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Dependency Count by Module</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dependencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1F27" />
                <XAxis dataKey="name" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={60} />
                <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: '#1C2230' }} />
                <Bar dataKey="dependencies" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Dependencies" />
                <Bar dataKey="dependents" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Dependents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }} /> Dependencies</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#8B5CF6' }} /> Dependents</div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Contributor distribution */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Contributor Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="20%" outerRadius="100%" data={ownershipData} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="contribution" cornerRadius={6} />
                <Tooltip contentStyle={chartTooltipStyle} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {mockContributors.map((c, i) => (
              <div key={c.id} className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white" style={{ backgroundColor: ['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'][i] }}>
                  {c.avatar}
                </div>
                <span className="text-[10px] text-gray-500 mt-1">{c.contributionPct}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Onboarding progress */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Onboarding Progress</h3>
          <div className="flex items-center justify-center py-4">
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: completedSteps, fill: '#10B981' },
                      { name: 'Remaining', value: 12 - completedSteps, fill: '#1A1F27' },
                    ]}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill="#10B981" stroke="#0D1117" strokeWidth={2} />
                    <Cell fill="#1A1F27" stroke="#0D1117" strokeWidth={2} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold text-white">{onboardingPct.toFixed(0)}%</div>
                <div className="text-xs text-gray-500">{completedSteps}/12</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1"><Boxes size={11} /> Total</div>
              <div className="text-sm font-semibold text-white">12</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1"><Clock size={11} /> Est. Time</div>
              <div className="text-sm font-semibold text-white">2h 35m</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1"><CheckCircle size={11} /> Done</div>
              <div className="text-sm font-semibold text-white">{completedSteps}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
