import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map, Clock, ArrowRight, Check, Bot, Lock, BookOpen, ChevronRight,
  Play, CheckCircle, Circle, GraduationCap, Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/context/ApiContext';


export function OnboardingPage() {
  const { mockOnboardingSteps, mockModules } = useApi();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [steps, setSteps] = useState(mockOnboardingSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(searchParams.get('step'));
  const [roleFilter, setRoleFilter] = useState<string>('All');

  // Filter steps based on selected role
  const displayedSteps = steps.filter(step => {
    if (roleFilter === 'All') return true;
    const module = mockModules.find(m => m.id === step.moduleId);
    return module?.layer === roleFilter;
  });

  // Calculate unique available roles
  const availableRoles = ['All', ...new Set(mockModules.map(m => m.layer))].filter(Boolean);

  const completedCount = displayedSteps.filter((s) => s.completed).length;
  const totalCount = displayedSteps.length;
  const pct = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;
  const totalMinutes = displayedSteps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const toggleComplete = (stepId: string) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, completed: !s.completed } : s)));
  };

  const selectedStep = steps.find((s) => s.id === selectedStepId);

  return (
    <div className="p-6 max-w-7xl mx-auto pb-20 lg:pb-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Map size={20} className="text-primary-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Your First Day</h1>
          </div>
          <p className="text-sm text-gray-400">A guided path through this repository.</p>
        </div>

        {/* Role Selector */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm text-gray-400 mr-1">Role:</span>
          <div className="flex flex-wrap gap-1 bg-bg-elevated border border-border p-1 rounded-lg">
            {availableRoles.map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  roleFilter === role 
                    ? 'bg-primary-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white hover:bg-bg-hover'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Roadmap */}
        <div className="lg:col-span-2 space-y-3">
          {displayedSteps.length === 0 ? (
            <div className="text-center py-12 text-gray-500 border border-dashed border-border rounded-lg">
              No modules found for this role.
            </div>
          ) : (
            displayedSteps.map((step, i) => {
              const prevCompleted = i === 0 || displayedSteps[i - 1]?.completed;
              const isLocked = !prevCompleted && !step.completed;
            const module = mockModules.find((m) => m.id === step.moduleId);

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  hover
                  className={`p-5 ${step.completed ? 'border-success-500/30' : ''} ${isLocked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Order number */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                          step.completed
                            ? 'bg-success-500/20 text-success-400 border border-success-500/30'
                            : isLocked
                            ? 'bg-bg-hover text-gray-600 border border-border'
                            : 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                        }`}
                      >
                        {step.completed ? <Check size={18} /> : isLocked ? <Lock size={14} /> : String(i + 1).padStart(2, '0')}
                      </div>
                      {i < displayedSteps.length - 1 && (
                        <div className={`w-px h-8 mt-2 ${step.completed ? 'bg-success-500/30' : 'bg-border'}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="text-base font-semibold text-white">{step.title}</h3>
                          <p className="text-sm text-gray-400 mt-0.5">{step.description}</p>
                        </div>
                        {step.completed && <Badge variant="success"><Check size={11} /> Complete</Badge>}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                        <span className="flex items-center gap-1 text-gray-500"><Clock size={12} /> {step.estimatedTime}</span>
                        {step.prerequisites && step.prerequisites.length > 0 && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <BookOpen size={12} /> Prerequisite: {step.prerequisites.join(', ')}
                          </span>
                        )}
                        {module && (
                          <span className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: module.color }} />
                            <span className="text-gray-500">{module.name}</span>
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-bg-base rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${step.completed ? 'bg-success-500' : 'bg-primary-500'}`}
                            style={{ width: step.completed ? '100%' : '0%' }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{step.completed ? 'Done' : 'Not started'}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        <Button
                          size="sm"
                          disabled={isLocked}
                          onClick={() => setSelectedStepId(step.id)}
                        >
                          <Play size={13} /> {step.completed ? 'Review Module' : 'Start Module'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => toggleComplete(step.id)}
                        >
                          {step.completed ? <><Circle size={13} /> Mark Incomplete</> : <><CheckCircle size={13} /> Mark Complete</>}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/app/assistant')}>
                          <Bot size={13} /> Explain with AI
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          }))}
        </div>

        {/* Progress sidebar */}
        <div className="space-y-4">
          <Card className="p-5 sticky top-20">
            <h3 className="text-sm font-semibold text-white mb-4">Onboarding Progress</h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Overall progress</span>
                  <span className="text-sm font-semibold text-white">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-elevated rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Clock size={12} /> Est. time
                  </div>
                  <div className="text-sm font-semibold text-white">{totalHours}h {remainingMinutes}m</div>
                </div>
                <div className="bg-bg-elevated rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <GraduationCap size={12} /> Modules
                  </div>
                  <div className="text-sm font-semibold text-white">{completedCount} / {totalCount}</div>
                </div>
              </div>

              <div className="space-y-2">
                {displayedSteps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => setSelectedStepId(step.id)}
                    className="w-full flex items-center gap-2 text-left"
                  >
                    {step.completed ? (
                      <CheckCircle size={14} className="text-success-400 flex-shrink-0" />
                    ) : (
                      <Circle size={14} className="text-gray-600 flex-shrink-0" />
                    )}
                    <span className={`text-xs truncate ${step.completed ? 'text-gray-400' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Module Learning View Modal */}
      <AnimatePresence>
        {selectedStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedStepId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-bg-card border border-border rounded-xl shadow-elevated max-w-3xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/15 text-primary-400 flex items-center justify-center font-bold text-sm">
                    {String(selectedStep.order).padStart(2, '0')}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">{selectedStep.title}</h2>
                    <p className="text-xs text-gray-500 flex items-center gap-2"><Clock size={11} /> {selectedStep.estimatedTime}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStepId(null)} className="text-gray-500 hover:text-white">
                  <ChevronRight size={20} className="rotate-180" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Learning Objective</h3>
                  <p className="text-sm text-gray-200">{selectedStep.learningObjective}</p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Before You Start</h3>
                  <ul className="space-y-1.5">
                    {selectedStep.beforeYouStart?.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-gray-300">
                        <Check size={14} className="text-success-400 flex-shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Files to Read</h3>
                  <div className="space-y-2">
                    {selectedStep.files?.map((file, idx) => (
                      <button
                        key={file}
                        onClick={() => { setSelectedStepId(null); navigate(`/app/explorer?file=${file}`); }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-elevated border border-border hover:border-primary-500/50 transition-colors text-left"
                      >
                        <span className="text-xs font-mono text-gray-600 w-5">{idx + 1}</span>
                        <BookOpen size={14} className="text-primary-400" />
                        <span className="text-sm font-mono text-gray-200 flex-1 truncate">{file}</span>
                        <ChevronRight size={14} className="text-gray-600" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-secondary-500/5 border border-secondary-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={16} className="text-secondary-400" />
                    <h3 className="text-sm font-semibold text-white">Why This Matters</h3>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedStep.whyItMatters}</p>
                </div>

                <div className="p-4 rounded-lg bg-primary-500/5 border border-primary-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={16} className="text-primary-400" />
                    <h3 className="text-sm font-semibold text-white">AI Explanation</h3>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedStep.aiExplanation}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selectedStep.order === 1}
                    onClick={() => {
                      const prev = steps.find((s) => s.order === selectedStep.order - 1);
                      if (prev) setSelectedStepId(prev.id);
                    }}
                  >
                    <ChevronRight size={14} className="rotate-180" /> Previous
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => toggleComplete(selectedStep.id)}
                  >
                    {selectedStep.completed ? <><Check size={14} /> Completed</> : <><CheckCircle size={14} /> Mark Complete</>}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selectedStep.order === steps.length}
                    onClick={() => {
                      const next = steps.find((s) => s.order === selectedStep.order + 1);
                      if (next) setSelectedStepId(next.id);
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
