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
  FileText,
  Target,
  ChartBar
} from 'lucide-react';
import './App.css';

// Nouveaux composants d'animation
import HeroParticles from './components/Animations/HeroParticles';
import ScrollProgress from './components/Animations/ScrollProgress';
import AnimatedSection from './components/Animations/AnimatedSection';
import FloatingElements from './components/Animations/FloatingElements';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
    if (darkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }

    // Animation du scroll
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  // Stats pour la section hero
  const stats = [
    { number: '95%', label: 'Précision d\'extraction', icon: '🎯' },
    { number: '50+', label: 'Entreprises satisfaites', icon: '🏢' },
    { number: '10k+', label: 'Documents traités', icon: '📊' },
    { number: '24/7', label: 'Disponibilité', icon: '⚡' }
  ];

  // Services avec le style ActuarialMind
  const services = [
    {
      icon: <Upload size={24} />,
      title: "Upload Intelligent",
      description: "Importez vos fichiers PDF et définissez vos KPIs en quelques clics avec une interface intuitive",
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      emoji: '📤'
    },
    {
      icon: <Zap size={24} />,
      title: "IA Avancée",
      description: "Notre intelligence artificielle extrait automatiquement les données ESG avec une précision de 95%",
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      emoji: '🤖'
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Analyses Dynamiques",
      description: "Tableaux de bord interactifs avec visualisations en temps réel de vos indicateurs ESG",
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      emoji: '📈'
    },
    {
      icon: <Shield size={24} />,
      title: "Données Sécurisées",
      description: "Vos données sont cryptées et stockées en toute sécurité conformément aux normes RGPD",
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      emoji: '🔒'
    }
  ];

  // Documents récents
  const documents = [
    {
      title: 'Rapport ESG 2024',
      description: 'Analyse complète des indicateurs ESG avec scoring détaillé',
      meta: { type: 'AI Generated', pages: '45 pages', category: 'Rapport' },
      badge: 'Nouveau',
      emoji: '📄'
    },
    {
      title: 'Benchmark Secteur',
      description: 'Comparaison des performances ESG par secteur d\'activité',
      meta: { type: 'AI Enhanced', pages: '32 pages', category: 'Analyse' },
      badge: 'Populaire',
      emoji: '📊'
    },
    {
      title: 'Conformité Réglementaire',
      description: 'Guide des nouvelles régulations ESG internationales',
      meta: { type: 'Expert Analysis', pages: '28 pages', category: 'Compliance' },
      emoji: '🎯'
    }
  ];

  // Composant Home Section avec le style ActuarialMind
  const HomeSection = () => {
    return (
      <div className="home-fullscreen">
        <ScrollProgress progress={scrollProgress} />
        
        {/* Hero Section avec animations */}
        <section ref={heroRef} className={`hero ${isVisible ? 'visible' : ''}`}>
          <HeroParticles />
          <div className="hero-background">
            <div className="hero-gradient"></div>
            <div className="hero-pattern"></div>
          </div>
          
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <span>
                  <TrendingUp size={16} />
                  Solution IA Leader ESG
                </span>
              </div>
              
              <h1 className="hero-title">
                Transformez vos 
                <span className="hero-highlight"> Rapports ESG</span>
                <br />en données actionnables
              </h1>
              
              <p className="hero-subtitle">
                Notre plateforme IA révolutionnaire extrait, analyse et visualise 
                automatiquement vos indicateurs ESG à partir de n'importe quel document PDF. 
                <strong> Gagnez 80% de temps</strong> sur votre reporting ESG.
              </p>

              <div className="hero-stats">
                {stats.map((stat, index) => (
                  <div key={index} className="stat-card">
                    <div className="stat-icon">{stat.icon}</div>
                    <div className="stat-number">{stat.number}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
              
              <div className="hero-buttons">
                <button 
                  className="btn btn-primary btn-glow"
                  onClick={handleGetStarted}
                >
                  <span>Démarrer l'analyse gratuite</span>
                  <ArrowRight size={20} />
                </button>
                <button className="btn btn-secondary">
                  <Globe size={20} />
                  <span>Voir la démo</span>
                </button>
              </div>
            </div>

            <div className="hero-visual">
              <FloatingElements />
              <div className="dashboard-preview">
                <div className="dashboard-card">
                  <div className="card-header">
                    <div className="card-title">Dashboard ESG</div>
                    <div className="card-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                  <div className="chart-placeholder"></div>
                  <div className="metrics-grid">
                    <div className="metric positive">Score: 85%</div>
                    <div className="metric positive">Environnement: 90%</div>
                    <div className="metric negative">Social: 75%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="scroll-indicator">
            <div className="scroll-arrow"></div>
          </div>
        </section>

        {/* Services Section */}
        <AnimatedSection>
          <section id="services" className="services-section">
            <div className="container">
              <div className="section-header">
                <h2>Pourquoi choisir ESG Analytics ?</h2>
                <p className="section-subtitle">
                  Une plateforme complète pour tous vos besoins d'analyse ESG
                </p>
              </div>
              
              <div className="services-grid">
                {services.map((service, index) => (
                  <div 
                    key={index} 
                    className="service-card enhanced"
                    style={{ '--gradient': service.gradient } }
                  >
                    <div className="service-icon-wrapper">
                      <div className="service-emoji">{service.emoji}</div>
                      {service.icon}
                    </div>
                    <h3 className="service-title">{service.title}</h3>
                    <p className="service-description">{service.description}</p>
                    <div className="service-arrow">→</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* Documents Section */}
        <AnimatedSection delay={200}>
          <section id="documents" className="documents-section">
            <div className="container">
              <div className="section-header">
                <h2>Base de Connaissances ESG</h2>
                <p className="section-subtitle">
                  Documents spécialisés analysés et enrichis par notre intelligence artificielle
                </p>
              </div>
              
              <div className="documents-grid">
                {documents.map((doc, index) => (
                  <div key={index} className="document-card enhanced">
                    <div className="doc-header">
                      <div className="doc-emoji">{doc.emoji}</div>
                      {doc.badge && <div className="doc-badge">{doc.badge}</div>}
                    </div>
                    <h3 className="doc-title">{doc.title}</h3>
                    <p className="doc-description">{doc.description}</p>
                    <div className="doc-meta">
                      <span>{doc.meta.type}</span>
                      <span>{doc.meta.pages}</span>
                      <span>{doc.meta.category}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="section-actions">
                <button className="btn btn-outline btn-shimmer">
                  <span>Explorer tous les documents</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* Demo Section */}
        <AnimatedSection delay={300}>
          <section id="demo" className="demo-section">
            <div className="demo-background">
              <div className="demo-gradient"></div>
            </div>
            <div className="container">
              <div className="section-header">
                <h2>🎯 Système d'Analyse Intelligent</h2>
                <p className="section-subtitle">
                  Découvrez notre IA qui analyse automatiquement vos rapports ESG et génère des insights actionnables
                </p>
              </div>
              
              <div className="demo-features">
                <div className="demo-feature">
                  <div className="feature-icon">🧠</div>
                  <h3>Deep Learning Avancé</h3>
                  <p>Modèles transformers pour l'analyse sémantique des rapports ESG</p>
                </div>
                <div className="demo-feature">
                  <div className="feature-icon">⚡</div>
                  <h3>Traitement Rapide</h3>
                  <p>Analyse de documents en quelques secondes seulement</p>
                </div>
                <div className="demo-feature">
                  <div className="feature-icon">🎯</div>
                  <h3>Précision Maximale</h3>
                  <p>Extraction précise des KPIs avec validation automatique</p>
                </div>
              </div>
              
              <div className="demo-cta">
                <button 
                  className="btn btn-primary btn-large btn-glow"
                  onClick={handleGetStarted}
                >
                  <span>Essayer l'analyse gratuite</span>
                  <ArrowRight size={20} />
                </button>
                <p className="demo-note">
                  Aucune carte de crédit requise • Essai de 14 jours
                </p>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* Trust Section */}
        <AnimatedSection delay={400}>
          <section className="trust-section">
            <div className="container">
              <div className="section-header">
                <h2>Reconnu par les leaders de l'industrie</h2>
              </div>
              <div className="trust-badges">
                <div className="badge">ISO 27001</div>
                <div className="badge">RGPD Compliant</div>
                <div className="badge">SOC 2 Type II</div>
                <div className="badge">ESG Certified</div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* CTA Section */}
        <AnimatedSection delay={500}>
          <section className="cta-section">
            <div className="cta-background">
              <div className="cta-gradient"></div>
              <div className="cta-particles"></div>
            </div>
            <div className="container">
              <div className="cta-content">
                <h2>Prêt à révolutionner votre analyse ESG ?</h2>
                <p>
                  Rejoignez les entreprises qui utilisent déjà notre plateforme IA pour optimiser 
                  leur reporting ESG et prendre des décisions éclairées.
                </p>
                
                <div className="cta-features">
                  <div className="feature-item">
                    <div className="feature-icon">⚡</div>
                    <span>Déploiement immédiat</span>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">🛡️</div>
                    <span>Certifié RGPD</span>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">🎯</div>
                    <span>Analyse IA précise</span>
                  </div>
                </div>
                
                <div className="cta-buttons">
                  <button 
                    className="btn btn-primary btn-large btn-glow"
                    onClick={handleGetStarted}
                  >
                    <span>Commencer gratuitement</span>
                    <ArrowRight size={20} />
                  </button>
                  <button className="btn btn-secondary btn-large">
                    <span>Contactez-nous</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>
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

      {/* Footer amélioré */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-main">
              <div className="footer-brand">
                <h3>ESG Analytics</h3>
                <p>L'intelligence artificielle au service de l'excellence ESG</p>
                <div className="social-links">
                  <a href="#" aria-label="LinkedIn">💼</a>
                  <a href="#" aria-label="Twitter">🐦</a>
                  <a href="#" aria-label="GitHub">🔗</a>
                </div>
              </div>
              
              <div className="footer-links">
                <div className="link-group">
                  <h4>Solutions</h4>
                  <a href="#services">Analyse ESG</a>
                  <a href="#services">Reporting Automatique</a>
                  <a href="#services">Benchmarking</a>
                  <a href="#services">Conformité</a>
                </div>
                
                <div className="link-group">
                  <h4>Ressources</h4>
                  <a href="#documents">Documentation</a>
                  <a href="#documents">Cas d'Usage</a>
                  <a href="#documents">Blog Technique</a>
                  <a href="#documents">API</a>
                </div>
                
                <div className="link-group">
                  <h4>Entreprise</h4>
                  <a href="#contact">À propos</a>
                  <a href="#contact">Carrières</a>
                  <a href="#contact">Contact</a>
                  <a href="#contact">Presse</a>
                </div>
                
                <div className="link-group">
                  <h4>Légal</h4>
                  <a href="#">Confidentialité</a>
                  <a href="#">Conditions</a>
                  <a href="#">Cookies</a>
                  <a href="#">Sécurité</a>
                </div>
              </div>
            </div>
            
            <div className="footer-bottom">
              <div className="footer-info">
                <p>&copy; 2024 ESG Analytics. Tous droits réservés.</p>
                <div className="footer-meta">
                  <span>🏢 Paris, France</span>
                  <span>📧 contact@esg-analytics.ai</span>
                  <span>📞 +33 1 23 45 67 89</span>
                </div>
              </div>
              
              <div className="footer-badges">
                <div className="badge">ISO 27001</div>
                <div className="badge">RGPD Compliant</div>
                <div className="badge">SOC 2 Type II</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;