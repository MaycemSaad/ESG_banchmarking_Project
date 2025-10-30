import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import FileUpload from './components/FileUpload';
import FileAnalysis from './components/FileAnalysis';
import Dashboard from './components/Dashboard';
import apiService from './services/api';
import { Home as HomeIcon, Upload, Search, BarChart3, X, Moon, Sun, Database, Zap, FileText, Activity } from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showResults, setShowResults] = useState(false);

  // Appliquer le thème au body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

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
        
        setShowResults(true);
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
    setShowResults(true);
  };

  const handleAnalyzeAnotherFile = () => {
    setCurrentFileData(null);
    setProcessResult(null);
    setActiveTab('upload');
  };

  const handleGetStarted = () => {
    setActiveTab('upload');
    setShowResults(true);
  };

  const handleGoHome = () => {
    setActiveTab('home');
    setProcessResult(null);
    setShowResults(false);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const tabs = [
    { id: 'home', label: 'Accueil', icon: <HomeIcon size={20} /> },
    { id: 'upload', label: 'Traitement', icon: <Upload size={20} /> },
    { id: 'analysis', label: 'Analyse', icon: <Search size={20} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={20} /> }
  ];

  const quickStats = [
    { label: 'Fichiers traités', value: '24', icon: <Database size={16} /> },
    { label: 'KPIs extraits', value: '156', icon: <BarChart3 size={16} /> },
    { label: 'Taux de réussite', value: '92%', icon: <Zap size={16} /> }
  ];

  return (
    <div className={`App ${darkMode ? 'dark' : 'light'}`}>
      {/* Navigation principale */}
      <nav className="main-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="logo">
              <Activity size={28} />
            </div>
            <span className="brand-name">ESG Analytics</span>
          </div>

          <div className="nav-controls">
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

            <button className="theme-toggle" onClick={toggleTheme}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {activeTab !== 'home' && (
              <button className="nav-button" onClick={handleGoHome}>
                <HomeIcon size={18} />
                Accueil
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Navigation des onglets - seulement quand on n'est pas sur l'accueil */}
      {showResults && (
        <div className="tab-nav">
          <div className="tab-container">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
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
      )}

      <main className="app-main">
        {/* Notification des résultats */}
        {processResult && showResults && (
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

        {/* Contenu principal */}
        <div className="main-content">
          {activeTab === 'home' && !showResults && (
            <Home onGetStarted={handleGetStarted} darkMode={darkMode} />
          )}
          
          {showResults && (
            <div className="results-container">
              {activeTab === 'upload' && (
                <FileUpload 
                  onProcess={handleProcess} 
                  isLoading={processing} 
                  onGoHome={handleGoHome}
                  darkMode={darkMode}
                />
              )}
              {activeTab === 'analysis' && currentFileData && (
                <FileAnalysis 
                  fileData={currentFileData}
                  onViewGlobalDashboard={handleViewGlobalDashboard}
                  onAnalyzeAnotherFile={handleAnalyzeAnotherFile}
                  onGoHome={handleGoHome}
                  darkMode={darkMode}
                />
              )}
              {activeTab === 'dashboard' && (
                <Dashboard 
                  onGoHome={handleGoHome}
                  darkMode={darkMode}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <Activity size={20} />
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