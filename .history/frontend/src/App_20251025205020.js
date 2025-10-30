import React, { useState } from 'react';
import Home from './components/Home';
import FileUpload from './components/FileUpload';
import FileAnalysis from './components/FileAnalysis';
import Dashboard from './components/Dashboard';
import apiService from './services/api';
import { Home as HomeIcon, Upload, Search, BarChart3, X } from 'lucide-react';
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
          message: `${response.data.new_kpis_extracted} nouveaux KPIs extraits de ${response.data.pdf_name}.`
        });
        
        setActiveTab('analysis');
      } else {
        setProcessResult({
          success: false,
          message: response.data.warning || 'Traitement terminé mais aucun nouveau KPI extrait'
        });
      }
      
    } catch (error) {
      setProcessResult({
        success: false,
        message: error.message || 'Échec du traitement'
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
      {/* Header élégant avec logo */}
      <header className="app-header">
        <div className="header-container">
          <div className="logo-section">
            <div className="logo">
              <BarChart3 size={32} />
            </div>
            <div className="header-text">
              <h1>ESG KPI Extractor</h1>
              <p>Plateforme intelligente d'analyse ESG</p>
            </div>
          </div>
          
          {activeTab !== 'home' && (
            <div className="header-actions">
              <button 
                className="home-button"
                onClick={handleGoHome}
              >
                <HomeIcon size={18} />
                Accueil
              </button>
            </div>
          )}
        </div>
      </header>

      <ConnectionTest />

      {/* Navigation moderne */}
      {activeTab !== 'home' && (
        <nav className="app-nav">
          <div className="nav-container">
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
                  {activeTab === tab.id && <div className="active-indicator" />}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main className="app-main">
        {/* Notification élégante */}
        {processResult && activeTab !== 'home' && (
          <div className={`process-result ${processResult.success ? 'success' : 'error'}`}>
            <div className="result-content">
              <div className="result-header">
                <div className="result-icon">
                  {processResult.success ? '✅' : '❌'}
                </div>
                <div className="result-text">
                  <h4>{processResult.success ? 'Traitement Réussi' : 'Échec du Traitement'}</h4>
                  <p>{processResult.message}</p>
                </div>
              </div>
              {processResult.success && (
                <div className="result-actions">
                  <button 
                    onClick={() => setActiveTab('analysis')}
                    className="action-btn primary"
                  >
                    <Search size={16} />
                    Voir l'Analyse
                  </button>
                  <button 
                    onClick={handleViewGlobalDashboard}
                    className="action-btn secondary"
                  >
                    <BarChart3 size={16} />
                    Tableau de Bord
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => setProcessResult(null)}
              className="close-result"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Contenu des pages */}
        <div className="page-container">
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
        </div>
      </main>

      {/* Footer moderne */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-logo">
              <BarChart3 size={20} />
              <span>ESG KPI Extractor</span>
            </div>
            <p>&copy; 2024. Développé avec React et Flask.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;