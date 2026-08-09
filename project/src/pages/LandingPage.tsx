import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Compass, ArrowRight, Github, Search, Network, Users, Bot, Sparkles,
  Boxes, FileCode, GitBranch, Map, Zap,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useApi } from '@/context/ApiContext';


export function LandingPage() {
  const { exampleRepositories } = useApi();

  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');

  const handleAnalyze = () => {
    if (repoUrl.trim()) {
      navigate('/analyze', { state: { url: repoUrl } });
    }
  };

  const handleExample = (url: string) => {
    setRepoUrl(url);
  };

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="md" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#product" className="text-sm text-gray-400 hover:text-white transition-colors">Product</a>
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How it Works</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
              <Github size={15} /> GitHub
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/app/overview')} className="btn-ghost text-sm hidden sm:flex">Sign In</button>
            <button onClick={() => navigate('/app/overview')} className="btn-primary text-sm">Get Started</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Hero content */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-xs font-medium text-primary-400 mb-6">
                  <Sparkles size={13} /> AI-powered repository intelligence
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-5">
                  Understand any codebase<br />before you change it.
                </h1>
                <p className="text-base text-gray-400 leading-relaxed mb-8 max-w-lg">
                  CodeCompass maps repository architecture, dependencies, ownership, and learning paths so developers can understand unfamiliar codebases faster.
                </p>

                {/* Repository input */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 relative">
                    <Github size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      className="w-full bg-bg-elevated border border-border rounded-lg pl-10 pr-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-colors"
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    />
                  </div>
                  <button onClick={handleAnalyze} className="btn-primary whitespace-nowrap">
                    Analyze Repository <ArrowRight size={16} />
                  </button>
                </div>

                {/* Example repos */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">Try an example:</span>
                  {exampleRepositories.map((repo) => (
                    <button
                      key={repo.label}
                      onClick={() => handleExample(repo.url)}
                      className="text-xs px-2.5 py-1 rounded-md bg-bg-hover border border-border text-gray-400 hover:text-white hover:border-border-strong transition-all"
                    >
                      {repo.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right: Dashboard preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="card p-1 shadow-elevated">
                <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border">
                  <div className="w-2.5 h-2.5 rounded-full bg-error-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success-500/60" />
                  <span className="ml-2 text-xs text-gray-500 font-mono">react-dashboard — Overview</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Files', value: '247', icon: FileCode },
                      { label: 'Functions', value: '1,482', icon: Boxes },
                      { label: 'Modules', value: '32', icon: Network },
                      { label: 'Contributors', value: '14', icon: Users },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-bg-elevated rounded-lg p-2.5 border border-border">
                        <stat.icon size={14} className="text-primary-400 mb-1.5" />
                        <div className="text-lg font-semibold text-white">{stat.value}</div>
                        <div className="text-[10px] text-gray-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-bg-elevated rounded-lg p-3 border border-border">
                    <div className="text-xs text-gray-500 mb-2">Architecture Map</div>
                    <div className="flex items-center justify-between gap-1">
                      {['Frontend', 'API', 'Service', 'Data', 'DB'].map((layer, i) => (
                        <div key={layer} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full h-8 rounded-md flex items-center justify-center text-[9px] font-medium"
                            style={{
                              background: ['#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4', '#6366F1'][i] + '20',
                              color: ['#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4', '#6366F1'][i],
                              border: `1px solid ${['#3B82F6', '#F59E0B', '#8B5CF6', '#06B6D4', '#6366F1'][i]}30`,
                            }}
                          >
                            {layer}
                          </div>
                          {i < 4 && <div className="text-gray-600 text-xs">↓</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-bg-elevated rounded-lg p-3 border border-border">
                    <div className="text-xs text-gray-500 mb-2">Onboarding Progress</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-bg-base rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '35%' }}
                          transition={{ duration: 1, delay: 0.8 }}
                          className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                        />
                      </div>
                      <span className="text-xs text-gray-400">5/12</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute -right-4 -bottom-4 card p-3 shadow-elevated hidden lg:block"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-success-500/20 flex items-center justify-center">
                    <Zap size={16} className="text-success-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">Analysis complete</div>
                    <div className="text-[10px] text-gray-500">12 modules mapped in 2.3s</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">Everything you need to understand a codebase</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">From architecture to ownership, CodeCompass gives you the map before you enter the territory.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { icon: Network, title: 'Architecture Discovery', desc: 'See how modules and services connect through interactive dependency graphs.', color: 'primary' },
            { icon: Map, title: 'Onboarding Roadmap', desc: 'Know exactly where to start with a guided, step-by-step learning path.', color: 'secondary' },
            { icon: Users, title: 'Code Ownership', desc: 'Understand who knows each part of the codebase and where knowledge is concentrated.', color: 'accent' },
            { icon: Bot, title: 'AI Repository Assistant', desc: 'Ask questions about the repository in natural language and get source-referenced answers.', color: 'success' },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="card card-hover p-6"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                feature.color === 'primary' ? 'bg-primary-500/15 text-primary-400' :
                feature.color === 'secondary' ? 'bg-secondary-500/15 text-secondary-400' :
                feature.color === 'accent' ? 'bg-accent-500/15 text-accent-400' :
                'bg-success-500/15 text-success-400'
              }`}>
                <feature.icon size={22} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">How it works</h2>
          <p className="text-gray-400">Five steps from URL to full repository understanding.</p>
        </motion.div>
        <div className="space-y-1">
          {[
            { icon: Github, title: 'Connect Repository', desc: 'Paste any GitHub URL to begin analysis.' },
            { icon: Search, title: 'Parse Codebase', desc: 'Source files are parsed and language detection runs automatically.' },
            { icon: Network, title: 'Build Repository Map', desc: 'Modules, dependencies, and architecture layers are identified.' },
            { icon: Sparkles, title: 'Generate Intelligence', desc: 'Ownership, onboarding paths, and AI explanations are created.' },
            { icon: Compass, title: 'Start Exploring', desc: 'Navigate architecture, follow the roadmap, and ask the AI assistant.' },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-center gap-5 group"
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-bg-card border border-border flex items-center justify-center group-hover:border-primary-500/50 transition-colors">
                  <step.icon size={20} className="text-primary-400" />
                </div>
                {i < 4 && <div className="w-px h-12 bg-border" />}
              </div>
              <div className="pb-12">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-600 font-mono">0{i + 1}</span>
                  <h3 className="text-base font-semibold text-white">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative card p-12 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary-500/10 to-transparent" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">Understand your codebase.</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">Start with any GitHub repository and get a complete map in seconds.</p>
            <button onClick={handleAnalyze} className="btn-primary text-base px-6 py-3">
              Analyze a Repository <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-xs text-gray-600">Understand any codebase before you change it.</p>
        </div>
      </footer>
    </div>
  );
}
