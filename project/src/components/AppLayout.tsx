import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Network, Map, Users, FolderTree, Bot, BarChart3, Settings as SettingsIcon,
  Search, Bell, Github, Menu, X, ChevronDown, Compass, Sun, Moon, Check, UserPlus, Route,
  CircleAlert, RotateCcw,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { CommandPalette } from '@/components/CommandPalette';
import { useTheme } from '@/context/ThemeContext';

import { Tooltip } from '@/components/ui/Tooltip';
import { useApi } from '@/context/ApiContext';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '/app/overview' },
  { label: 'Architecture', icon: Network, path: '/app/architecture' },
  { label: 'Onboarding', icon: Map, path: '/app/onboarding' },
  { label: 'Ownership', icon: Users, path: '/app/ownership' },
  { label: 'Explorer', icon: FolderTree, path: '/app/explorer' },
  { label: 'AI Assistant', icon: Bot, path: '/app/assistant' },
  { label: 'Insights', icon: BarChart3, path: '/app/insights' },
];

const notificationIcons: Record<string, typeof Check> = {
  check: Check,
  route: Route,
  users: Users,
  'user-plus': UserPlus,
};

export function AppLayout() {
  const { mockRepository, mockNotifications, refreshData } = useApi();

  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  const SidebarContent = () => (
    <>
      {/* Repo selector */}
      <div className="px-3 mb-4">
        <button
          onClick={() => setRepoOpen(!repoOpen)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-bg-elevated border border-border hover:border-border-strong transition-colors"
        >
          <div className="w-7 h-7 rounded-md bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Github size={14} className="text-primary-400" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-xs text-gray-500">Repository</div>
            <div className="text-sm font-medium text-white truncate">{mockRepository.name}</div>
          </div>
          <ChevronDown size={14} className={`text-gray-500 transition-transform ${repoOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {repoOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1.5 ml-0 p-1 bg-bg-elevated border border-border rounded-lg overflow-hidden"
            >
              <div className="px-2.5 py-1.5 text-xs text-gray-500">Switch repository</div>
              {[
                { name: 'react-dashboard', owner: 'alex-morgan', active: true },
                { name: 'fastapi-backend', owner: 'sam-lee', active: false },
                { name: 'ts-notification-service', owner: 'jordan-patel', active: false },
              ].map((repo) => (
                <button
                  key={repo.name}
                  onClick={() => setRepoOpen(false)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors ${
                    repo.active ? 'bg-primary-600/15 text-white' : 'text-gray-400 hover:bg-bg-hover'
                  }`}
                >
                  <Github size={12} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{repo.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{repo.owner}</div>
                  </div>
                  {repo.active && <Check size={12} className="text-primary-400" />}
                </button>
              ))}
              <button onClick={() => { setRepoOpen(false); navigate('/'); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-primary-400 hover:bg-bg-hover transition-colors mt-1 border-t border-border pt-2">
                <Compass size={12} /> Analyze new repository
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path || (item.path !== '/app/overview' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`nav-item w-full ${active ? 'nav-item-active' : ''}`}
            >
              <item.icon size={16} className="flex-shrink-0" />
              <span>{item.label}</span>
              {active && <motion.div layoutId="sidebar-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border space-y-0.5">
        <button
          onClick={() => navigate('/app/settings')}
          className={`nav-item w-full ${location.pathname === '/app/settings' ? 'nav-item-active' : ''}`}
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
        <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg bg-bg-elevated/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
            AM
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">Alex Morgan</div>
            <div className="text-[10px] text-gray-500 truncate">Tech Lead</div>
          </div>
          <button onClick={toggleTheme} className="text-gray-500 hover:text-white transition-colors">
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-bg-elevated/30 fixed inset-y-0 z-40">
        <div className="px-4 h-14 flex items-center border-b border-border">
          <button onClick={() => navigate('/')} className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </button>
        </div>
        <div className="flex-1 flex flex-col py-4 overflow-hidden">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-bg-elevated border-r border-border flex flex-col lg:hidden"
            >
              <div className="px-4 h-14 flex items-center justify-between border-b border-border">
                <Logo size="sm" />
                <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 flex flex-col py-4 overflow-hidden">
                <SidebarContent />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-bg-elevated/30 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-white truncate">{mockRepository.name}</span>
            <span className="text-gray-600 hidden sm:inline">/</span>
            <span className="text-sm text-gray-500 hidden sm:inline truncate">{mockRepository.description}</span>
          </div>

          {/* Branch selector */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setBranchOpen(!branchOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-bg-hover border border-border text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Compass size={12} className="text-gray-500" />
              <span>{mockRepository.branch}</span>
              <ChevronDown size={12} className={`transition-transform ${branchOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {branchOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBranchOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 mt-1.5 w-48 bg-bg-card border border-border rounded-lg shadow-elevated z-20 p-1"
                  >
                    <div className="px-2.5 py-1.5 text-xs text-gray-500">Branches</div>
                    {mockRepository.branches.map((b) => (
                      <button
                        key={b}
                        onClick={() => setBranchOpen(false)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition-colors ${
                          b === mockRepository.branch ? 'bg-primary-600/15 text-white' : 'text-gray-400 hover:bg-bg-hover'
                        }`}
                      >
                        <Compass size={12} />
                        <span className="truncate">{b}</span>
                        {b === mockRepository.branch && <Check size={12} className="ml-auto text-primary-400" />}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1" />

          {/* Search / Command */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-bg-hover border border-border text-xs text-gray-500 hover:text-gray-400 transition-colors hidden sm:flex"
          >
            <Search size={13} />
            <span>Search...</span>
            <kbd className="text-[10px] text-gray-600 border border-border rounded px-1 py-0.5 ml-2">⌘K</kbd>
          </button>
          
          <Tooltip content="Pull latest from GitHub and re-analyze">
            <button
              onClick={async () => {
                const btn = document.getElementById('sync-btn-icon');
                if (btn) btn.classList.add('animate-spin');
                try {
                  const res = await fetch('http://127.0.0.1:8000/api/repo/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: mockRepository.url || 'https://github.com/Subham8705/CodePalantir.git' })
                  });
                  if (res.ok) {
                    await refreshData();
                  }
                } finally {
                  if (btn) btn.classList.remove('animate-spin');
                }
              }}
              className="flex items-center justify-center w-8 h-8 rounded-md bg-bg-hover border border-border text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw id="sync-btn-icon" size={14} />
            </button>
          </Tooltip>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-bg-hover transition-colors"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-bg-elevated" />
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full right-0 mt-1.5 w-80 bg-bg-card border border-border rounded-lg shadow-elevated z-20 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      <span className="text-xs text-primary-400">{unreadCount} new</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {mockNotifications.map((n) => {
                        const Icon = notificationIcons[n.icon] || CircleAlert;
                        return (
                          <div
                            key={n.id}
                            className={`px-4 py-3 border-b border-border-subtle hover:bg-bg-hover transition-colors cursor-pointer ${!n.read ? 'bg-primary-500/5' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                n.read ? 'bg-bg-hover text-gray-500' : 'bg-primary-500/15 text-primary-400'
                              }`}>
                                <Icon size={15} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white">{n.title}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{n.description}</div>
                                <div className="text-[10px] text-gray-600 mt-1">{n.timestamp}</div>
                              </div>
                              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button className="w-full px-4 py-2.5 text-xs text-gray-500 hover:text-white border-t border-border transition-colors">
                      Mark all as read
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* GitHub */}
          <Tooltip content="Open on GitHub" side="bottom">
            <a
              href={mockRepository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-bg-hover transition-colors"
            >
              <Github size={17} />
            </a>
          </Tooltip>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-xs font-semibold text-white hover:ring-2 hover:ring-primary-500/30 transition-all"
            >
              AM
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full right-0 mt-1.5 w-52 bg-bg-card border border-border rounded-lg shadow-elevated z-20 p-1"
                  >
                    <div className="px-2.5 py-2 border-b border-border mb-1">
                      <div className="text-sm font-medium text-white">Alex Morgan</div>
                      <div className="text-xs text-gray-500">alex@codecompass.dev</div>
                    </div>
                    <button onClick={() => { setUserMenuOpen(false); navigate('/app/settings'); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-bg-hover transition-colors">
                      <SettingsIcon size={14} /> Settings
                    </button>
                    <button onClick={toggleTheme} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-bg-hover transition-colors">
                      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>
                    <button onClick={() => navigate('/')} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-bg-hover transition-colors border-t border-border mt-1 pt-2">
                      <Compass size={14} /> Back to home
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page content with transitions */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-elevated border-t border-border flex items-center justify-around px-2 py-1.5">
        {navItems.slice(0, 5).map((item) => {
          const active = location.pathname === item.path || (item.path !== '/app/overview' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors ${active ? 'text-primary-400' : 'text-gray-500'}`}
            >
              <item.icon size={18} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
