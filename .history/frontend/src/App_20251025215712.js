import React, { useState, useEffect, useRef } from 'react';
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
  Globe,
  Play,
  CheckCircle,
  Target,
  Rocket,
  Sparkles,
  BarChart,
  Cpu,
  Lock
} from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  useEffect(() => {
    setIsVisible(true);
  }, []);

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

  // Composant Home intégré directement
  const HomeSection = () => {
    const [animatedStats, setAnimatedStats] = useState([0, 0, 0, 0]);
    const [currentFeature, setCurrentFeature] = useState(0);
    const sectionRef = useRef(null);
    const featuresRef = useRef(null);

    const features = [
      {
        icon: <Cpu size={28} />,
        title: "IA Avancée",
        description: "Notre intelligence artificielle extrait automatiquement les données ESG avec une précision de 95% grâce au machine learning",
        color: "#8B5CF6"
      },
      {
        icon: <BarChart size={28} />,
        title: "Analyses Dynamiques",
        description: "Tableaux de bord interactifs avec visualisations en temps réel et rapports automatisés de vos indicateurs ESG",
        color: "#06B6D4"
      },
      {
        icon: <Rocket size={28} />,
        title: "Efficacité Maximale",
        description: "Réduction de 80% du temps de traitement et automatisation complète de votre workflow de reporting",
        color: "#10B981"
      },
      {
        icon: <Lock size={28} />,
        title: "Sécurité Enterprise",
        description: "Vos données sont cryptées de bout en bout et stockées en toute sécurité conformément aux normes RGPD et ISO 27001",
        color: "#F59E0B"
      }
    ];

    const stats = [
      { value: 95, label: "Précision d'extraction", suffix: "%" },
      { value: 50, label: "Entreprises satisfaites", suffix: "+" },
      { value: 10250, label: "Documents traités", suffix: "+" },
      { value: 99.9, label: "Disponibilité", suffix: "%" }
    ];

    const processSteps = [
      { step: 1, title: "Upload des Documents", description: "Importez vos PDF et fichiers de configuration" },
      { step: 2, title: "Analyse Automatique", description: "Notre IA scanne et extrait les données" },
      { step: 3, title: "Validation & Correction", description: "Vérifiez et ajustez les résultats" },
      { step: 4, title: "Rapports & Export", description: "Générez vos tableaux de bord et exports" }
    ];

    useEffect(() => {
      // Animation des statistiques
      const intervals = stats.map((stat, index) => {
        let start = 0;
        const end = stat.value;
        const duration = 2000;
        const increment = end / (duration / 16);
        
        const timer = setInterval(() => {
          start += increment;
          if (start >= end) {
            start = end;
            clearInterval(timer);
          }
          setAnimatedStats(prev => {
            const newStats = [...prev];
            newStats[index] = Math.floor(start);
            return newStats;
          });
        }, 16);
        
        return timer;
      });

      return () => intervals.forEach(interval => clearInterval(interval));
    }, []);

    useEffect(() => {
      // Animation des features
      const featureInterval = setInterval(() => {
        setCurrentFeature(prev => (prev + 1) % features.length);
      }, 4000);

      return () => clearInterval(featureInterval);
    }, [features.length]);

    return (
      <div className={`home-fullscreen ${isVisible ? 'visible' : ''}`}>
        {/* Background animé amélioré */}
        <div className="background-animation">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
            <div className="shape shape-5"></div>
          </div>
          <div className="particles-container">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="particle" style={{
                '--delay': `${i * 0.5}s`,
                '--duration': `${15 + i % 10}s`,
                '--size': `${2 + i % 3}px`
              }}></div>
            ))}
          </div>
        </div>

        <div className="home-container">
          {/* Hero Section améliorée */}
          <div className="home-hero">
            <div className="hero-content">
              <div className="hero-badge">
                <div className="badge-pulse">
                  <Sparkles size={16} />
                </div>
                <span>Solution IA Leader ESG 2024</span>
                <div className="badge-arrow">→</div>
              </div>
              
              <h1 className="hero-title">
                <span className="title-line">Transformez vos</span>
                <span className="gradient-text title-line">Rapports ESG</span>
                <span className="title-line">en données actionnables</span>
              </h1>
              
              <p className="hero-description">
                Notre plateforme IA révolutionnaire extrait, analyse et visualise 
                automatiquement vos indicateurs ESG à partir de n'importe quel document PDF. 
                <strong> Gagnez 80% de temps</strong> sur votre reporting ESG.
              </p>

              {/* Stats animées */}
              <div className="hero-stats">
                {stats.map((stat, index) => (
                  <div key={index} className="stat-card">
                    <div className="stat-value">
                      {animatedStats[index]}
                      <span className="stat-suffix">{stat.suffix}</span>
                    </div>
                    <div className="stat-label">{stat.label}</div>
                    <div className="stat-progress">
                      <div 
                        className="stat-progress-bar" 
                        style={{width: `${(animatedStats[index] / stat.value) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* CTA amélioré */}
              <div className="cta-container">
                <button 
                  className="cta-button primary"
                  onClick={handleGetStarted}
                >
                  <span className="cta-text">
                    <Rocket size={20} />
                    Démarrer l'analyse gratuite
                  </span>
                  <div className="cta-hover-effect"></div>
                </button>
                <button className="cta-button secondary">
                  <Play size={20} />
                  <span>Voir la démo</span>
                </button>
              </div>

              {/* Trust indicators */}
              <div className="trust-indicators">
                <div className="trust-item">
                  <CheckCircle size={16} />
                  <span>Aucune carte de crédit requise</span>
                </div>
                <div className="trust-item">
                  <CheckCircle size={16} />
                  <span>Essai de 14 jours</span>
                </div>
                <div className="trust-item">
                  <CheckCircle size={16} />
                  <span>Configuration en 5 minutes</span>
                </div>
              </div>
            </div>

            {/* Hero Visual amélioré */}
            <div className="hero-visual">
              <div className="floating-card card-1">
                <div className="card-icon">
                  <Target size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">156</div>
                  <div className="card-label">KPIs extraits</div>
                </div>
              </div>
              
              <div className="floating-card card-2">
                <div className="card-icon">
                  <Zap size={20} />
                </div>
                <div className="card-content">
                  <div className="card-value">92%</div>
                  <div className="card-label">Précision</div>
                </div>
              </div>

              <div className="mockup-dashboard">
                <div className="mockup-glow"></div>
                <div className="mockup-header">
                  <div className="mockup-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <div className="mockup-title">Dashboard ESG</div>
                </div>
                <div className="mockup-content">
                  <div className="chart-container">
                    <div className="chart-bar" style={{height: '70%'}}></div>
                    <div className="chart-bar" style={{height: '90%'}}></div>
                    <div className="chart-bar" style={{height: '60%'}}></div>
                    <div className="chart-bar" style={{height: '80%'}}></div>
                    <div className="chart-bar" style={{height: '75%'}}></div>
                  </div>
                  <div className="data-grid">
                    <div className="data-row animated"></div>
                    <div className="data-row animated" style={{animationDelay: '0.2s'}}></div>
                    <div className="data-row animated" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Process Steps */}
          <div className="process-section">
            <div className="section-header">
              <h2>Comment ça marche ?</h2>
              <p>Quatre étapes simples pour transformer vos documents en insights</p>
            </div>
            <div className="process-steps">
              {processSteps.map((step, index) => (
                <div key={step.step} className="process-step">
                  <div className="step-number">{step.step}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="step-connector"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Features Grid améliorée */}
          <div className="features-section">
            <div className="section-header">
              <h2>Une plateforme complète pour vos besoins ESG</h2>
              <p>Découvrez pourquoi les entreprises leaders nous font confiance</p>
            </div>
            
            <div className="features-grid" ref={featuresRef}>
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className={`feature-card ${index === currentFeature ? 'active' : ''}`}
                  style={{ '--accent-color': feature.color }}
                >
                  <div className="feature-glow"></div>
                  <div className="feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  <div className="feature-indicator">
                    <div className="indicator-dot"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges améliorés */}
          <div className="trust-section">
            <div className="trust-content">
              <p className="trust-title">Reconnu et certifié par les leaders de l'industrie</p>
              <div className="trust-badges">
                <div className="trust-badge">
                  <Shield size={24} />
                  <span>ISO 27001</span>
                </div>
                <div className="trust-badge">
                  <Lock size={24} />
                  <span>RGPD Compliant</span>
                </div>
                <div className="trust-badge">
                  <CheckCircle size={24} />
                  <span>SOC 2 Type II</span>
                </div>
                <div className="trust-badge">
                  <Zap size={24} />
                  <span>AI Ethics Certified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="final-cta">
            <div className="cta-content">
              <h2>Prêt à révolutionner votre analyse ESG ?</h2>
              <p>Rejoignez les 50+ entreprises qui nous font déjà confiance</p>
              <button className="cta-button large" onClick={handleGetStarted}>
                <Rocket size={24} />
                <span>Commencer maintenant</span>
                <div className="cta-sparkles">
                  <Sparkles size={16} />
                </div>
              </button>
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