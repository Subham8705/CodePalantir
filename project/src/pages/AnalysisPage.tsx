import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Github, Compass } from 'lucide-react';
import { Logo } from '@/components/Logo';

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
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (currentStep >= pipelineSteps.length) {
      setDone(true);
      const timer = setTimeout(() => navigate('/app/overview'), 800);
      return () => clearTimeout(timer);
    }
    const delay = 400 + Math.random() * 500;
    const timer = setTimeout(() => setCurrentStep((s) => s + 1), delay);
    return () => clearTimeout(timer);
  }, [currentStep, navigate]);

  const progress = Math.min((currentStep / pipelineSteps.length) * 100, 100);

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px]" />
      <div className="relative w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <Logo size="md" />
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Github size={14} /> alex-morgan/react-dashboard
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

          {/* Pipeline steps */}
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
