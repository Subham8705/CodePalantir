import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Contributor,
  Repository,
  Module,
  OnboardingStep,
  FileNode,
  Notification,
  ArchitectureNode,
  ArchitectureEdge,
} from '@/types';

interface ApiContextType {
  mockRepository: Repository;
  exampleRepositories: any[];
  mockContributors: Contributor[];
  mockNotifications: Notification[];
  mockArchitectureNodes: ArchitectureNode[];
  mockArchitectureEdges: ArchitectureEdge[];
  mockModules: Module[];
  mockOnboardingSteps: OnboardingStep[];
  mockFileTree: FileNode;
  loading: boolean;
  error: string | null;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const defaultRepository: Repository = {
  id: '', name: 'Loading...', owner: '', url: '', description: '', branch: '', branches: [], lastAnalyzed: '',
  stats: { files: 0, functions: 0, modules: 0, contributors: 0 },
  languages: [], frameworks: [], recentActivity: []
};

const defaultFileTree: FileNode = {
  id: 'root', name: 'root', path: '', type: 'directory', children: []
};

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Omit<ApiContextType, 'loading' | 'error'>>({
    mockRepository: defaultRepository,
    exampleRepositories: [],
    mockContributors: [],
    mockNotifications: [],
    mockArchitectureNodes: [],
    mockArchitectureEdges: [],
    mockModules: [],
    mockOnboardingSteps: [],
    mockFileTree: defaultFileTree,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [
          repoRes, modulesRes, contributorsRes, notificationsRes,
          archNodesRes, archEdgesRes, onboardingRes, fileTreeRes
        ] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/repo/overview`),
          fetch(`${API_BASE_URL}/modules`),
          fetch(`${API_BASE_URL}/contributors`),
          fetch(`${API_BASE_URL}/notifications`),
          fetch(`${API_BASE_URL}/architecture/nodes`),
          fetch(`${API_BASE_URL}/architecture/edges`),
          fetch(`${API_BASE_URL}/onboarding`),
          fetch(`${API_BASE_URL}/files/tree`)
        ]);

        const extractData = async (res: PromiseSettledResult<Response>, defaultVal: any) => {
          if (res.status === 'fulfilled' && res.value.ok) {
            try { return await res.value.json(); } catch (e) { return defaultVal; }
          }
          return defaultVal;
        };

        setData({
          mockRepository: await extractData(repoRes, defaultRepository),
          exampleRepositories: [],
          mockModules: await extractData(modulesRes, []),
          mockContributors: await extractData(contributorsRes, []),
          mockNotifications: await extractData(notificationsRes, []),
          mockArchitectureNodes: await extractData(archNodesRes, []),
          mockArchitectureEdges: await extractData(archEdgesRes, []),
          mockOnboardingSteps: await extractData(onboardingRes, []),
          mockFileTree: await extractData(fileTreeRes, defaultFileTree),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <ApiContext.Provider value={{ ...data, loading, error }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
