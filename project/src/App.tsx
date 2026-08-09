import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { ApiProvider } from '@/context/ApiContext';
import { AppLayout } from '@/components/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ArchitecturePage } from '@/pages/ArchitecturePage';
import { ModuleDetailPage } from '@/pages/ModuleDetailPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { OwnershipPage } from '@/pages/OwnershipPage';
import { ExplorerPage } from '@/pages/ExplorerPage';
import { AssistantPage } from '@/pages/AssistantPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { SettingsPage } from '@/pages/SettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <ApiProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyze" element={<AnalysisPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="architecture" element={<ArchitecturePage />} />
            <Route path="modules/:moduleId" element={<ModuleDetailPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="ownership" element={<OwnershipPage />} />
            <Route path="explorer" element={<ExplorerPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </ApiProvider>
    </ThemeProvider>
  );
}
