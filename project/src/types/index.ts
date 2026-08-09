export type Layer = 'Frontend' | 'API' | 'Service' | 'Data' | 'Database' | 'External';

export interface Contributor {
  id: string;
  name: string;
  avatar: string;
  role: string;
  commits: number;
  filesTouched: number;
  contributionPct: number;
  primaryAreas: string[];
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  type: 'commit' | 'review' | 'merge' | 'comment';
  message: string;
  module: string;
  timestamp: string;
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  lines?: number;
  contributors?: string[];
  lastModified?: string;
  imports?: string[];
  importedBy?: string[];
  content?: string;
  children?: FileNode[];
  moduleId?: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  layer: Layer;
  fileCount: number;
  dependencies: string[];
  dependents: string[];
  primaryContributors: string[];
  files: ModuleFile[];
  ownership: Record<string, number>;
  color: string;
  aiExplanation: string;
}

export interface ModuleFile {
  name: string;
  path: string;
  type: string;
  lines: number;
  contributors: string[];
  lastModified: string;
}

export interface OnboardingStep {
  id: string;
  order: number;
  moduleId: string;
  title: string;
  description: string;
  estimatedTime: string;
  estimatedMinutes: number;
  prerequisites: string[];
  whyNext: string;
  files: string[];
  learningObjective: string;
  beforeYouStart: string[];
  whyItMatters: string;
  aiExplanation: string;
  completed: boolean;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  layer: Layer;
  fileCount: number;
  dependencyCount: number;
  description: string;
  moduleId: string;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  type: 'internal' | 'external';
}

export interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  description: string;
  branch: string;
  branches: string[];
  lastAnalyzed: string;
  stats: {
    files: number;
    functions: number;
    modules: number;
    contributors: number;
  };
  languages: { name: string; percentage: number; color: string }[];
  frameworks: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  timestamp: string;
  streaming?: boolean;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  icon: string;
  timestamp: string;
  read: boolean;
}

export type SearchResult =
  | { type: 'file'; id: string; label: string; sublabel: string; path: string }
  | { type: 'module'; id: string; label: string; sublabel: string; path: string }
  | { type: 'contributor'; id: string; label: string; sublabel: string; path: string }
  | { type: 'architecture'; id: string; label: string; sublabel: string; path: string }
  | { type: 'onboarding'; id: string; label: string; sublabel: string; path: string };
