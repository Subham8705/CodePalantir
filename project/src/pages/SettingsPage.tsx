import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, Palette, Bot, Bell, FolderGit2, Sun, Moon,
  Check, Thermometer, MessageSquare, GitBranch, RefreshCw, FileCode,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import { useEffect } from 'react';

function useStickyState<T>(defaultValue: T, key: string): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

const sections = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'repository', label: 'Repository', icon: FolderGit2 },
  { id: 'ai', label: 'AI Assistant', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

type SectionId = (typeof sections)[number]['id'];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary-600' : 'bg-bg-hover border border-border'}`}
    >
      <motion.div
        layout
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm ${checked ? 'left-[18px]' : 'left-0.5'}`}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </button>
  );
}

export function SettingsPage() {
  const { theme, toggleTheme, accentColor, setAccentColor } = useTheme();
  const [activeSection, setActiveSection] = useState<SectionId>('general');
  const [temperature, setTemperature] = useState(0.7);
  const [responseStyle, setResponseStyle] = useState<'concise' | 'detailed'>('detailed');
  
  // General
  const [displayName, setDisplayName] = useStickyState('Alex Morgan', 'settings_displayName');
  const [email, setEmail] = useStickyState('alex@codecompass.dev', 'settings_email');
  const [landingPage, setLandingPage] = useStickyState('Overview', 'settings_landingPage');

  // Appearance
  const [reduceAnimations, setReduceAnimations] = useStickyState(false, 'settings_reduceAnimations');

  // Repository
  const [defaultBranch, setDefaultBranch] = useStickyState('main', 'settings_defaultBranch');
  const [autoRefresh, setAutoRefresh] = useStickyState(true, 'settings_autoRefresh');
  const [includeTests, setIncludeTests] = useStickyState(true, 'settings_includeTests');
  const [includeGenerated, setIncludeGenerated] = useStickyState(false, 'settings_includeGenerated');
  
  // Notifications
  const [notifAnalysis, setNotifAnalysis] = useStickyState(true, 'settings_notifAnalysis');
  const [notifOwnership, setNotifOwnership] = useStickyState(true, 'settings_notifOwnership');
  const [notifContributor, setNotifContributor] = useStickyState(true, 'settings_notifContributor');
  const [notifOnboarding, setNotifOnboarding] = useStickyState(false, 'settings_notifOnboarding');

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <SettingsIcon size={20} className="text-primary-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-gray-400">Configure your CodeCompass experience.</p>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-6">
        {/* Section nav */}
        <div className="space-y-1 lg:sticky lg:top-20 lg:self-start">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`nav-item w-full ${activeSection === s.id ? 'nav-item-active' : ''}`}
            >
              <s.icon size={16} />
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeSection === 'general' && (
            <Card className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">General</h3>
                <p className="text-xs text-gray-500 mb-4">Basic application preferences.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div>
                    <div className="text-sm text-white">Display name</div>
                    <div className="text-xs text-gray-500">Shown in comments and activity</div>
                  </div>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input max-w-[200px] text-sm" />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div>
                    <div className="text-sm text-white">Email</div>
                    <div className="text-xs text-gray-500">For notifications</div>
                  </div>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} className="input max-w-[220px] text-sm" />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm text-white">Default landing page</div>
                    <div className="text-xs text-gray-500">Where to go after analysis</div>
                  </div>
                  <select value={landingPage} onChange={(e) => setLandingPage(e.target.value)} className="input max-w-[160px] text-sm">
                    <option value="Overview">Overview</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Onboarding">Onboarding</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'appearance' && (
            <Card className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Appearance</h3>
                <p className="text-xs text-gray-500 mb-4">Customize how CodeCompass looks.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-bg-hover flex items-center justify-center">
                      {theme === 'dark' ? <Moon size={18} className="text-primary-400" /> : <Sun size={18} className="text-warning-400" />}
                    </div>
                    <div>
                      <div className="text-sm text-white">Theme</div>
                      <div className="text-xs text-gray-500">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</div>
                    </div>
                  </div>
                  <Toggle checked={theme === 'dark'} onChange={toggleTheme} />
                </div>
                <div className="py-3 border-b border-border-subtle">
                  <div className="text-sm text-white mb-3">Accent color</div>
                  <div className="flex items-center gap-2">
                    {['#3B82F6', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'].map((color, i) => (
                      <button
                        key={color}
                        onClick={() => setAccentColor(color)}
                        className={`w-8 h-8 rounded-lg transition-all ${accentColor === color ? 'ring-2 ring-offset-2 ring-offset-bg-card ring-primary-500' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      >
                        {accentColor === color && <Check size={14} className="text-white mx-auto" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm text-white">Reduce animations</div>
                    <div className="text-xs text-gray-500">Minimize motion for accessibility</div>
                  </div>
                  <Toggle checked={reduceAnimations} onChange={() => setReduceAnimations(!reduceAnimations)} />
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'repository' && (
            <Card className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Repository</h3>
                <p className="text-xs text-gray-500 mb-4">Analysis and scanning preferences.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <GitBranch size={18} className="text-gray-400" />
                    <div>
                      <div className="text-sm text-white">Default branch</div>
                      <div className="text-xs text-gray-500">Branch to analyze by default</div>
                    </div>
                  </div>
                  <select value={defaultBranch} onChange={(e) => setDefaultBranch(e.target.value)} className="input max-w-[160px] text-sm">
                    <option value="main">main</option>
                    <option value="develop">develop</option>
                    <option value="release/v2.4">release/v2.4</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={18} className="text-gray-400" />
                    <div>
                      <div className="text-sm text-white">Auto refresh</div>
                      <div className="text-xs text-gray-500">Re-analyze on push</div>
                    </div>
                  </div>
                  <Toggle checked={autoRefresh} onChange={() => setAutoRefresh(!autoRefresh)} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <FileCode size={18} className="text-gray-400" />
                    <div>
                      <div className="text-sm text-white">Include tests</div>
                      <div className="text-xs text-gray-500">Scan test files for dependencies</div>
                    </div>
                  </div>
                  <Toggle checked={includeTests} onChange={() => setIncludeTests(!includeTests)} />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileCode size={18} className="text-gray-400" />
                    <div>
                      <div className="text-sm text-white">Include generated files</div>
                      <div className="text-xs text-gray-500">Include auto-generated code in analysis</div>
                    </div>
                  </div>
                  <Toggle checked={includeGenerated} onChange={() => setIncludeGenerated(!includeGenerated)} />
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'ai' && (
            <Card className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">AI Assistant</h3>
                <p className="text-xs text-gray-500 mb-4">Configure the repository assistant model.</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <Bot size={18} className="text-secondary-400" />
                    <div>
                      <div className="text-sm text-white">Model</div>
                      <div className="text-xs text-gray-500">LLM used for explanations</div>
                    </div>
                  </div>
                  <select className="input max-w-[160px] text-sm">
                    <option>Qwen 2.5</option>
                    <option>Llama 3.1</option>
                    <option>Mistral 7B</option>
                    <option>GPT-4o</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <Bot size={18} className="text-secondary-400" />
                    <div>
                      <div className="text-sm text-white">Provider</div>
                      <div className="text-xs text-gray-500">Where the model runs</div>
                    </div>
                  </div>
                  <select className="input max-w-[160px] text-sm">
                    <option>Ollama Local</option>
                    <option>OpenAI API</option>
                    <option>Anthropic API</option>
                  </select>
                </div>
                <div className="py-4 border-b border-border-subtle">
                  <div className="flex items-center gap-3 mb-3">
                    <Thermometer size={18} className="text-secondary-400" />
                    <div className="flex-1">
                      <div className="text-sm text-white">Temperature</div>
                      <div className="text-xs text-gray-500">Controls response creativity</div>
                    </div>
                    <Badge variant="secondary">{temperature.toFixed(1)}</Badge>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-secondary-500"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div className="py-3">
                  <div className="flex items-center gap-3 mb-3">
                    <MessageSquare size={18} className="text-secondary-400" />
                    <div>
                      <div className="text-sm text-white">Response style</div>
                      <div className="text-xs text-gray-500">How detailed responses should be</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-7">
                    <button
                      onClick={() => setResponseStyle('concise')}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                        responseStyle === 'concise' ? 'bg-secondary-500/15 text-secondary-400 border border-secondary-500/30' : 'bg-bg-hover text-gray-400 border border-border'
                      }`}
                    >
                      Concise
                      <div className="text-xs text-gray-500 mt-0.5">Short, to-the-point answers</div>
                    </button>
                    <button
                      onClick={() => setResponseStyle('detailed')}
                      className={`flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                        responseStyle === 'detailed' ? 'bg-secondary-500/15 text-secondary-400 border border-secondary-500/30' : 'bg-bg-hover text-gray-400 border border-border'
                      }`}
                    >
                      Detailed
                      <div className="text-xs text-gray-500 mt-0.5">Thorough explanations with context</div>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card className="p-6 space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Notifications</h3>
                <p className="text-xs text-gray-500 mb-4">Choose what you want to be notified about.</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Analysis completed', desc: 'When a repository finishes analyzing', value: notifAnalysis, setter: setNotifAnalysis },
                  { label: 'Ownership data updated', desc: 'When code ownership map is refreshed', value: notifOwnership, setter: setNotifOwnership },
                  { label: 'New contributor detected', desc: 'When a new contributor joins a module', value: notifContributor, setter: setNotifContributor },
                  { label: 'Onboarding roadmap generated', desc: 'When a new learning path is created', value: notifOnboarding, setter: setNotifOnboarding },
                ].map((notif) => (
                  <div key={notif.label} className="flex items-center justify-between py-3 border-b border-border-subtle last:border-0">
                    <div>
                      <div className="text-sm text-white">{notif.label}</div>
                      <div className="text-xs text-gray-500">{notif.desc}</div>
                    </div>
                    <Toggle checked={notif.value} onChange={() => notif.setter(!notif.value)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Save button */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="secondary" size="sm">Cancel</Button>
            <Button size="sm" onClick={handleSave}>
              <Check size={14} /> {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
