import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Github, Compass, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useApi } from '@/context/ApiContext';

const pipelineSteps = [
  'Connecting to GitHub',
  'Cloning repository',
  'Detecting languages',
  'Parsing source files',
  'Building dependency graph',
  'Discovering architecture',
  'Mining Git history',
  'Mapping code ownership',
  'Generating onboarding roadmap',
  'Preparing repository map',
];

export function AnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshData } = useApi();
  const repoUrl = location.state?.url || '';
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_BASE_URL = 'http://127.0.0.1:8000/api';
  
  // Ref to track if we've started the fetch so we don't duplicate it in StrictMode
  const fetchStarted = useRef(false);

  useEffect(() => {
    if (!repoUrl) {
      navigate('/');
      return;
    }

    if (!fetchStarted.current) {
      fetchStarted.current = true;
      
      fetch(`${API_BASE_URL}/repo/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl })
      })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || 'Failed to analyze repository');
        }
        return res.json();
      })
      .then(async () => {
        await refreshData();
        setDone(true);
        setCurrentStep(pipelineSteps.length);
        
        import('react-hot-toast').then(({ toast }) => {
          toast('Semantic Search is indexing in the background... AI answers may be limited for the next minute.', {
            icon: '🧠',
            duration: 10000,
          });
        });

        setTimeout(() => navigate('/app/overview'), 800);
      })
      .catch((err) => {
        setError(err.message);
      });
    }
  }, [repoUrl, navigate]);

  useEffect(() => {
    if (done || error) return;
    
    // Animate through steps while waiting for the backend
    if (currentStep < pipelineSteps.length - 1) {
      const delay = 800 + Math.random() * 1000;
      const timer = setTimeout(() => setCurrentStep((s) => s + 1), delay);
      return () => clearTimeout(timer);
    }
  }, [currentStep, done, error]);

  const progress = Math.min((currentStep / pipelineSteps.length) * 100, 100);
  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'unknown-repo';

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px]" />
      <div className="relative w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <Logo size="md" />
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Github size={14} /> {repoName}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="relative">
              <Compass size={24} className="text-primary-400 animate-pulse-soft" />
            </div>
            <h1 className="text-lg font-semibold text-white">Analyzing repository</h1>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-9">This usually takes a few seconds. We're mapping every module, dependency, and contributor.</p>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>{done ? 'Complete' : `${currentStep} / ${pipelineSteps.length} steps`}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-bg-base rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Pipeline steps or Error */}
          {!error ? (
            <div className="space-y-1">
              {pipelineSteps.map((step, i) => {
                const status = i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending';
                return (
                  <AnimatePresence key={step}>
                    <motion.div
                      initial={status === 'active' ? { opacity: 0, x: -10 } : false}
                      animate={{ opacity: status === 'pending' ? 0.4 : 1, x: 0 }}
                      className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
                        status === 'active' ? 'bg-primary-500/10' : ''
                      }`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        {status === 'done' && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <Check size={16} className="text-success-400" />
                          </motion.div>
                        )}
                        {status === 'active' && <Loader2 size={16} className="text-primary-400 animate-spin" />}
                        {status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-700" />}
                      </div>
                      <span className={`text-sm ${status === 'done' ? 'text-gray-400' : status === 'active' ? 'text-white font-medium' : 'text-gray-600'}`}>
                        {step}
                      </span>
                      {status === 'done' && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-auto text-xs text-success-400">
                          Done
                        </motion.span>
                      )}
                    </motion.div>
                  </AnimatePresence>
                );
              })}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-danger-500/10 border border-danger-500/20 rounded-lg flex items-start gap-3"
            >
              <AlertCircle size={20} className="text-danger-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-danger-400 mb-1">Analysis Failed</h3>
                <p className="text-xs text-gray-400">{error}</p>
                <button 
                  onClick={() => navigate('/')}
                  className="mt-3 text-xs bg-bg-surface hover:bg-bg-elevated text-white px-3 py-1.5 rounded transition-colors"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          )}

          {done && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-success-500/10 border border-success-500/20"
            >
              <Check size={16} className="text-success-400" />
              <span className="text-sm text-success-400 font-medium">Repository map ready — taking you to the dashboard...</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
