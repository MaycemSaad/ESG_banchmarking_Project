import React, { useState } from 'react';
import Home from './components/Home';
import FileUpload from './components/FileUpload';
import FileAnalysis from './components/FileAnalysis';
import Dashboard from './components/Dashboard';
import ConnectionTest from './components/ConnectionTest';
import apiService from './services/api';
import { Home as HomeIcon, Upload, Search, BarChart3, X, Settings, Database, Zap } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    setSidebarOpen(false);
  };

  const tabs = [
    { id: 'home', label: 'Accueil', icon: <HomeIcon size={20} />, description: 'Page principale' },
    { id: 'upload', label: 'Traitement', icon: <Upload size={20} />, description: 'Upload et extraction' },
    { id: 'analysis', label: 'Analyse', icon: <Search size={20} />, description: 'Résultats détaillés' },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={20} />, description: 'Vue globale' }
  ];

  const quickStats = [
    { label: 'Fichiers traités', value: '24', icon: <Database size={16} /> },
    { label: 'KPIs extraits', value: '156', icon: <BarChart3 size={16} /> },
    { label: 'Taux de réussite', value: '92%', icon: <Zap size={16} /> }
  ];

  return (
    <div className="App">
      {/* Header élégant avec navigation latérale */}
      <header className="app-header">
        <div className="header-container">
          <div className="header-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <div className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </button>
            
            <div className="logo-section">
              <div className="logo">
                <Zap size={28} />
              </div>
              <div className="header-text">
                <h1>ESG Analytics</h1>
                <p>Extraction intelligente de KPIs</p>
              </div>
            </div>
          </div>

          <div className="header-right">
            <div className="quick-stats">
              {quickStats.map((stat, index) => (
                <div key={index} className="stat-item">
                  <span className="stat-icon">{stat.icon}</span>
                  <div className="stat-info">
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {activeTab !== 'home' && (
              <button 
                className="home-button"
                onClick={handleGoHome}
              >
                <HomeIcon size={18} />
                Accueil
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar moderne */}
      <div className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo">
              <Zap size={32} />
            </div>
            <div className="sidebar-text">
              <h2>ESG Analytics</h2>
              <p>Navigation</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
              disabled={tab.id === 'analysis' && !currentFileData}
            >
              <span className="tab-icon">{tab.icon}</span>
              <div className="tab-content">
                <span className="tab-label">{tab.label}</span>
                <span className="tab-description">{tab.description}</span>
              </div>
              {activeTab === tab.id && <div className="active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="connection-status">
            <div className="status-indicator connected"></div>
            <span>Système connecté</span>
          </div>
        </div>
      </div>

      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="app-main">
        {/* Notification élégante améliorée */}
        {processResult && activeTab !== 'home' && (
          <div className={`process-result ${processResult.success ? 'success' : 'error'}`}>
            <div className="result-background"></div>
            <div className="result-content">
              <div className="result-header">
                <div className="result-icon-wrapper">
                  {processResult.success ? (
                    <div className="success-icon">✓</div>
                  ) : (
                    <div className="error-icon">✕</div>
                  )}
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
            <div className="footer-brand">
              <div className="footer-logo">
                <Zap size={20} />
                <span>ESG Analytics Pro</span>
              </div>
              <p>Solution d'extraction intelligente de KPIs ESG</p>
            </div>
            <div className="footer-tech">
              <span>Powered by React & Flask</span>
              <span className="tech-badge">AI Powered</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;