import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import FileAnalysis from './components/FileAnalysis';
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import CompanyAnalysis from './components/CompanyAnalysis';
import Comparisons from './components/Comparisons';
import apiService from './services/api';
import { 
  Home as HomeIcon, 
  Upload, 
  Search, 
  BarChart3, 
  X, 
  Moon, 
  Sun, 
  Database, 
  Zap, 
  Activity,
  TrendingUp,
  Users,
  GitCompare,
  ArrowRight,
  Shield,
  Globe
} from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showResults, setShowResults] = useState(false);

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
    { id: 'analysis', label: 'Analyse Fichier', icon: <Search size={20} /> },
    { id: 'dashboard', label: 'Dashboard Global', icon: <BarChart3 size={20} /> },
    { id: 'statistics', label: 'Statistiques', icon: <TrendingUp size={20} /> },
    { id: 'comparisons', label: 'Comparaisons', icon: <GitCompare size={20} /> },
    { id: 'company-analysis', label: 'Analyse Entreprise', icon: <Users size={20} /> }
  ];

  const quickStats = [
    { label: 'Fichiers traités', value: '24', icon: <Database size={16} /> },
    { label: 'KPIs extraits', value: '156', icon: <BarChart3 size={16} /> },
    { label: 'Taux de réussite', value: '92%', icon: <Zap size={16} /> }
  ];

  // Composant Home intégré directement
  const HomeSection = () => {
    const features = [
      {
        icon: <Upload size={24} />,
        title: "Upload Intelligent",
        description: "Importez vos fichiers PDF et définissez vos KPIs en quelques clics avec une interface intuitive"
      },
      {
        icon: <Zap size={24} />,
        title: "IA Avancée",
        description: "Notre intelligence artificielle extrait automatiquement les données ESG avec une précision de 95%"
      },
      {
        icon: <BarChart3 size={24} />,
        title: "Analyses Dynamiques",
        description: "Tableaux de bord interactifs avec visualisations en temps réel de vos indicateurs ESG"
      },
      {
        icon: <Shield size={24} />,
        title: "Données Sécurisées",
        description: "Vos données sont cryptées et stockées en toute sécurité conformément aux normes RGPD"
      }
    ];

    const stats = [
      { value: "95%", label: "Précision d'extraction" },
      { value: "50+", label: "Entreprises satisfaites" },
      { value: "10k+", label: "Documents traités" },
      { value: "24/7", label: "Disponibilité" }
    ];

    return (
      <div className="home-fullscreen">
        {/* Background animé */}
        <div className="background-animation">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>

        <div className="home-container">
          {/* Hero Section */}
          <div className="home-hero">
            <div className="hero-content">
              <div className="badge">
                <TrendingUp size={16} />
                <span>Solution IA Leader ESG</span>
              </div>
              
              <h1 className="hero-title">
                Transformez vos 
                <span className="gradient-text"> Rapports ESG</span>
                <br />en données actionnables
              </h1>
              
              <p className="hero-description">
                Notre plateforme IA révolutionnaire extrait, analyse et visualise 
                automatiquement vos indicateurs ESG à partir de n'importe quel document PDF. 
                <strong> Gagnez 80% de temps</strong> sur votre reporting ESG.
              </p>

              <div className="hero-stats">
                {stats.map((stat, index) => (
                  <div key={index} className="stat">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
              
              <div className="cta-container">
                <button 
                  className="cta-button primary"
                  onClick={handleGetStarted}
                >
                  <span>Démarrer l'analyse gratuite</span>
                  <ArrowRight size={20} />
                </button>
                <button className="cta-button secondary">
                  <Globe size={20} />
                  <span>Voir la démo</span>
                </button>
              </div>
            </div>

            <div className="hero-visual">
              <div className="mockup-dashboard">
                <div className="mockup-header">
                  <div className="mockup-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className="mockup-content">
                  <div className="chart-placeholder"></div>
                  <div className="data-grid">
                    <div className="data-row"></div>
                    <div className="data-row"></div>
                    <div className="data-row"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="features-section">
            <div className="section-header">
              <h2>Pourquoi choisir ESG Analytics ?</h2>
              <p>Une plateforme complète pour tous vos besoins d'analyse ESG</p>
            </div>
            
            <div className="features-grid">
              {features.map((feature, index) => (
                <div key={index} className="feature-card enhanced">
                  <div className="feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  <div className="feature-arrow">→</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="trust-section">
            <p>Reconnu par les leaders de l'industrie</p>
            <div className="trust-badges">
              <div className="badge">ISO 27001</div>
              <div className="badge">RGPD Compliant</div>
              <div className="badge">SOC 2 Type II</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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


            <button className="theme-toggle" onClick={toggleTheme}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {showResults && (
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
                disabled={(tab.id === 'analysis' && !currentFileData) || 
                         (tab.id === 'home')}
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
          {!showResults && activeTab === 'home' && (
            <HomeSection />
          )}
          
          {showResults && (
            <div className="results-container">
              {activeTab === 'upload' && (
                <FileUpload 
                  onProcess={handleProcess} 
                  isLoading={processing} 
                  darkMode={darkMode}
                />
              )}
              {activeTab === 'analysis' && currentFileData && (
                <FileAnalysis 
                  fileData={currentFileData}
                  onViewGlobalDashboard={handleViewGlobalDashboard}
                  onAnalyzeAnotherFile={handleAnalyzeAnotherFile}
                  darkMode={darkMode}
                />
              )}
              {activeTab === 'dashboard' && (
                <Dashboard darkMode={darkMode} />
              )}
              {activeTab === 'statistics' && (
                <Statistics darkMode={darkMode} />
              )}
              {activeTab === 'comparisons' && (
                <Comparisons darkMode={darkMode} />
              )}
              {activeTab === 'company-analysis' && (
                <CompanyAnalysis darkMode={darkMode} />
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