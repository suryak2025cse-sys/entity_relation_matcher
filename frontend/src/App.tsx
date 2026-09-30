import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './pages/DashboardView';
import { TrainingDatasetSetupView } from './pages/TrainingDatasetSetupView';
import { UploadDataView } from './pages/UploadDataView';
import { ValidationView } from './pages/ValidationView';
import { PreprocessingView } from './pages/PreprocessingView';
import { CandidatesView } from './pages/CandidatesView';
import { FeaturesView } from './pages/FeaturesView';
import { ModelManagementView } from './pages/ModelManagementView';
import { MatchingView } from './pages/MatchingView';
import { ResultsView } from './pages/ResultsView';
import { AnalyticsView } from './pages/AnalyticsView';
import { OutputValidationView } from './pages/OutputValidationView';
import { DownloadView } from './pages/DownloadView';

import { 
  fetchDashboardStatus, 
  fetchArchiveStatus, 
  DashboardData, 
  ArchiveStatus 
} from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [archiveStatus, setArchiveStatus] = useState<ArchiveStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [dash, arch] = await Promise.all([
        fetchDashboardStatus(),
        fetchArchiveStatus(),
      ]);
      setDashboardData(dash);
      setArchiveStatus(arch);
    } catch (err) {
      console.error('Error fetching platform state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // Background polling every 20 seconds
    const interval = setInterval(refreshAll, 20000);
    return () => clearInterval(interval);
  }, []);

  const isModelTrained = dashboardData?.is_model_trained ?? false;
  const defaultThreshold = dashboardData?.threshold ?? 0.65;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        dashboardData={dashboardData}
        loading={loading}
        onRefresh={refreshAll}
        onOpenModelManagement={() => setCurrentTab('model-mgmt')}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar / Stepper Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isModelTrained={isModelTrained}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-61px)]">
          <div className="max-w-6xl mx-auto pb-12">
            {currentTab === 'dashboard' && (
              <DashboardView
                data={dashboardData}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'training-setup' && (
              <TrainingDatasetSetupView
                archiveStatus={archiveStatus}
                onRefresh={refreshAll}
                onNavigateToValidation={() => setCurrentTab('validation')}
              />
            )}

            {currentTab === 'upload-data' && (
              <UploadDataView
                onUploadSuccess={refreshAll}
                onNavigateToValidation={() => setCurrentTab('validation')}
              />
            )}

            {currentTab === 'validation' && (
              <ValidationView
                hasUploadedFiles={Boolean(dashboardData?.has_uploaded_files)}
                onNavigateToPreprocessing={() => setCurrentTab('preprocessing')}
              />
            )}

            {currentTab === 'preprocessing' && (
              <PreprocessingView
                hasUploadedFiles={Boolean(dashboardData?.has_uploaded_files)}
                onNavigateToCandidates={() => setCurrentTab('candidates')}
              />
            )}

            {currentTab === 'candidates' && (
              <CandidatesView
                hasUploadedFiles={Boolean(dashboardData?.has_uploaded_files)}
                onNavigateToFeatures={() => setCurrentTab('features')}
              />
            )}

            {currentTab === 'features' && (
              <FeaturesView
                onNavigateToModelMgmt={() => setCurrentTab('model-mgmt')}
              />
            )}

            {currentTab === 'model-mgmt' && (
              <ModelManagementView
                onModelUpdated={refreshAll}
                onNavigateToMatching={() => setCurrentTab('matching')}
              />
            )}

            {currentTab === 'matching' && (
              <MatchingView
                hasUploadedFiles={Boolean(dashboardData?.has_uploaded_files)}
                defaultThreshold={defaultThreshold}
                onNavigateToResults={() => setCurrentTab('results')}
              />
            )}

            {currentTab === 'results' && (
              <ResultsView
                onNavigateToAnalytics={() => setCurrentTab('analytics')}
              />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView
                onNavigateToValidation={() => setCurrentTab('output-validation')}
              />
            )}

            {currentTab === 'output-validation' && (
              <OutputValidationView
                onNavigateToDownload={() => setCurrentTab('download')}
              />
            )}

            {currentTab === 'download' && (
              <DownloadView />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
