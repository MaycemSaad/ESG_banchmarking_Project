import React, { useState } from 'react';
import Home from './components/Home';
import FileUpload from './components/FileUpload';
import FileAnalysis from './components/FileAnalysis';
import Dashboard from './components/Dashboard';
import ConnectionTest from './components/ConnectionTest';
import apiService from './services/api';
import { Home as HomeIcon, Upload, Search, BarChart3 } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);

  const handleProcess = async (kpiFile, pdfFile, minConfidence, rerunIfExists) => {
    try {
      setProcessing(true);
      setProcessResult(null);
      setCurrentFileData(null);
      
      const response = await apiService.processPDF(kpiFile, pdfFile, minConfidence, rerunIfExists);
      
      if (response.data.processed) {
        const resultData = {
          ...response.data,
          kpiFile: kpiFile.name,
          pdfFile: pdfFile.name,
          minConfidence: minConfidence
        };
        
        setCurrentFileData(resultData);
        setProcessResult({
          success: true,
          data: resultData,
          message: `Extracted ${response.data.new_kpis_extracted} new KPIs from ${response.data.pdf_name}.`
        });
        
        setActiveTab('analysis');
      } else {
        setProcessResult({
          success: false,
          message: response.data.warning || 'Processing completed but no new KPIs extracted'
        });
      }
      
    } catch (error) {
      setProcessResult({
        success: false,
        message: error.message || 'Processing failed'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleViewGlobalDashboard = () => {
    setActiveTab('dashboard');
  };

  const handleAnalyzeAnotherFile = () => {
    setCurrentFileData(null);
    setProcessResult(null);
    setActiveTab('upload');
  };

  const handleGetStarted = () => {
    setActiveTab('upload');
  };

  const handleGoHome = () => {
    setActiveTab('home');
    setProcessResult(null);
  };

  const tabs = [
    { id: 'home', label: 'Accueil', icon: <HomeIcon size={18} /> },
    { id: 'upload', label: 'Upload & Traitement', icon: <Upload size={18} /> },
    { id: 'analysis', label: 'Analyse Fichier', icon: <Search size={18} /> },
    { id: 'dashboard', label: 'Tableau de Bord', icon: <BarChart3 size={18} /> }
  ];

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🏠 ESG KPI Extractor</h1>
          <p>Plateforme intelligente d'extraction de KPIs ESG</p>
        </div>
      </header>

      <ConnectionTest />

      {/* Navigation seulement si on n'est pas sur la page d'accueil */}
      {activeTab !== 'home' && (
        <nav className="app-nav">
          <div className="nav-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.id === 'analysis' && !currentFileData}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <main className="app-main">
        {processResult && activeTab !== 'home' && (
          <div className={`process-result ${processResult.success ? 'success' : 'error'}`}>
            <div className="result-content">
              <h3>{processResult.success ? '✅ Traitement Réussi !' : '❌ Échec du Traitement'}</h3>
              <p>{processResult.message}</p>
              {processResult.success && (
                <div className="result-actions">
                  <button 
                    onClick={() => setActiveTab('analysis')}
                    className="action-btn primary"
                  >
                    Voir l'Analyse du Fichier
                  </button>
                  <button 
                    onClick={handleViewGlobalDashboard}
                    className="action-btn secondary"
                  >
                    Tableau de Bord Global
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => setProcessResult(null)}
              className="close-result"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === 'home' && <Home onGetStarted={handleGetStarted} />}
        {activeTab === 'upload' && (
          <FileUpload onProcess={handleProcess} isLoading={processing} onGoHome={handleGoHome} />
        )}
        {activeTab === 'analysis' && currentFileData && (
          <FileAnalysis 
            fileData={currentFileData}
            onViewGlobalDashboard={handleViewGlobalDashboard}
            onAnalyzeAnotherFile={handleAnalyzeAnotherFile}
            onGoHome={handleGoHome}
          />
        )}
        {activeTab === 'dashboard' && <Dashboard onGoHome={handleGoHome} />}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>ESG KPI Extractor &copy; 2024. Développé avec React et Flask.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;