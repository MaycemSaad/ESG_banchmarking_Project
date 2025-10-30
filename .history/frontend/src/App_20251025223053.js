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
  Award,
  Clock,
  CheckCircle,
  BarChart,
  Target,
  Sparkles,
  Rocket,
  Star,
  ChevronDown,
  Eye,
  Download,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Twitter,
  ArrowUp
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const homeRef = useRef(null);

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
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    
    return () => clearTimeout(timer);
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    const features = [
      {
        icon: <Upload size={28} />,
        title: "Upload Intelligent",
        description: "Importez vos fichiers PDF et définissez vos KPIs en quelques clics avec une interface intuitive et sécurisée",
        color: "#6366f1"
      },
      {
        icon: <Zap size={28} />,
        title: "IA Avancée",
        description: "Notre intelligence artificielle extrait automatiquement les données ESG avec une précision de 95%",
        color: "#10b981"
      },
      {
        icon: <BarChart3 size={28} />,
        title: "Analyses Dynamiques",
        description: "Tableaux de bord interactifs avec visualisations en temps réel de vos indicateurs ESG",
        color: "#f59e0b"
      },
      {
        icon: <Shield size={28} />,
        title: "Données Sécurisées",
        description: "Vos données sont cryptées et stockées en toute sécurité conformément aux normes RGPD",
        color: "#ef4444"
      },
      {
        icon: <Target size={28} />,
        title: "Rapports Personnalisés",
        description: "Générez des rapports sur mesure adaptés à vos besoins spécifiques et standards ESG",
        color: "#8b5cf6"
      },
      {
        icon: <GitCompare size={28} />,
        title: "Comparaisons Avancées",
        description: "Comparez vos performances avec celles de vos concurrents et benchmarks sectoriels",
        color: "#06b6d4"
      }
    ];

    const stats = [
      { value: 95, label: "Précision d'extraction", suffix: "%" },
      { value: 50, label: "Entreprises satisfaites", suffix: "+" },
      { value: 10000, label: "Documents traités", suffix: "+" },
      { value: 24, label: "Disponibilité", suffix: "/7" }
    ];

    const testimonials = [
      {
        name: "Marie Dubois",
        role: "Directrice RSE",
        company: "EcoCorp France",
        content: "Cette plateforme a révolutionné notre processus de reporting ESG. Gain de temps considérable !",
        rating: 5
      },
      {
        name: "Jean Martin",
        role: "Responsable Développement Durable",
        company: "GreenTech Solutions",
        content: "L'extraction automatique des KPIs est extrêmement précise. Interface très intuitive.",
        rating: 5
      },
      {
        name: "Sophie Lambert",
        role: "Analyste ESG",
        company: "Sustainable Invest",
        content: "Outil indispensable pour notre analyse des entreprises. Les dashboards sont exceptionnels.",
        rating: 4
      }
    ];

    useEffect(() => {
      const intervals = stats.map((stat, index) => {
        let start = 0;
        const end = stat.value;
        const duration = 2000;
        const increment = end / (duration / 50);
        
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
        }, 50);
        
        return timer;
      });

      return () => intervals.forEach(interval => clearInterval(interval));
    }, []);

    const renderStars = (rating) => {
      return Array.from({ length: 5 }, (_, i) => (
        <Star 
          key={i} 
          size={16} 
          fill={i < rating ? "#f59e0b" : "none"} 
          color="#f59e0b"
        />
      ));
    };

    return (
      <div className={`home-fullscreen ${isVisible ? 'visible' : ''}`} ref={homeRef}>
        {/* Background animé amélioré */}
        <div className="background-animation">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
            <div className="shape shape-5"></div>
          </div>
          <div className="particles">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="particle" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 20}s`,
                animationDuration: `${15 + Math.random() * 10}s`
              }}></div>
            ))}
          </div>
        </div>

        <div className="home-container">
          {/* Hero Section améliorée */}
          <div className="home-hero">
            <div className="hero-content">
              <div className="hero-badges">
                <div className="badge pulse">
                  <TrendingUp size={16} />
                  <span>Solution IA Leader ESG</span>
                </div>
                <div className="badge secondary">
                  <Sparkles size={16} />
                  <span>Nouvelle Version</span>
                </div>
              </div>
              
              <h1 className="hero-title">
                Transformez vos 
                <span className="gradient-text"> Rapports ESG</span>
                <br />en <span className="typing-text">données actionnables</span>
              </h1>
              
              <p className="hero-description">
                Notre plateforme IA révolutionnaire extrait, analyse et visualise 
                automatiquement vos indicateurs ESG à partir de n'importe quel document PDF. 
                <strong> Gagnez 80% de temps</strong> sur votre reporting ESG.
              </p>

              <div className="hero-stats">
                {stats.map((stat, index) => (
                  <div key={index} className="stat">
                    <div className="stat-value">
                      {animatedStats[index]}
                      {stat.suffix}
                    </div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>
              
              <div className="cta-container">
                <button 
                  className="cta-button primary glow"
                  onClick={handleGetStarted}
                >
                  <Rocket size={20} />
                  <span>Démarrer l'analyse gratuite</span>
                  <ArrowRight size={20} />
                </button>
                <button className="cta-button secondary">
                  <Play size={20} />
                  <span>Voir la démo</span>
                </button>
                <button className="cta-button outline">
                  <Download size={20} />
                  <span>Télécharger PDF</span>
                </button>
              </div>

              <div className="scroll-indicator">
                <span>Découvrir plus</span>
                <ChevronDown size={20} className="bounce" />
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
                  <div className="mockup-title">Dashboard ESG Analytics</div>
                </div>
                <div className="mockup-content">
                  <div className="chart-container">
                    <div className="chart-placeholder animated"></div>
                    <div className="chart-legend">
                      <div className="legend-item">
                        <div className="color-dot environmental"></div>
                        <span>Environnemental</span>
                      </div>
                      <div className="legend-item">
                        <div className="color-dot social"></div>
                        <span>Social</span>
                      </div>
                      <div className="legend-item">
                        <div className="color-dot governance"></div>
                        <span>Gouvernance</span>
                      </div>
                    </div>
                  </div>
                  <div className="data-grid">
                    <div className="data-row"></div>
                    <div className="data-row"></div>
                    <div className="data-row"></div>
                    <div className="data-row"></div>
                  </div>
                </div>
                <div className="mockup-footer">
                  <div className="kpi-badge">
                    <CheckCircle size={14} />
                    <span>12 KPIs extraits</span>
                  </div>
                  <div className="confidence-badge">
                    <span>95% de confiance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid améliorée */}
          <div className="features-section">
            <div className="section-header">
              <div className="section-badge">
                <Award size={20} />
                <span>Fonctionnalités Premium</span>
              </div>
              <h2>Une plateforme complète pour tous vos besoins d'analyse ESG</h2>
              <p>Découvrez comment notre solution transforme votre gestion des données ESG</p>
            </div>
            
            <div className="features-grid">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="feature-card enhanced"
                  style={{ '--accent-color': feature.color } as React.CSSProperties}
                >
                  <div className="feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  <div className="feature-arrow">
                    <ArrowRight size={20} />
                  </div>
                  <div className="feature-hover-effect"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="testimonials-section">
            <div className="section-header">
              <h2>Ils nous font confiance</h2>
              <p>Découvrez les retours de nos clients satisfaits</p>
            </div>
            <div className="testimonials-grid">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="testimonial-card">
                  <div className="testimonial-content">
                    <p>"{testimonial.content}"</p>
                  </div>
                  <div className="testimonial-rating">
                    {renderStars(testimonial.rating)}
                  </div>
                  <div className="testimonial-author">
                    <div className="author-avatar">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="author-info">
                      <div className="author-name">{testimonial.name}</div>
                      <div className="author-role">{testimonial.role}</div>
                      <div className="author-company">{testimonial.company}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Badges amélioré */}
          <div className="trust-section">
            <p>Reconnu et certifié par les leaders de l'industrie</p>
            <div className="trust-badges">
              <div className="trust-badge">
                <Shield size={24} />
                <span>ISO 27001</span>
              </div>
              <div className="trust-badge">
                <CheckCircle size={24} />
                <span>RGPD Compliant</span>
              </div>
              <div className="trust-badge">
                <Award size={24} />
                <span>SOC 2 Type II</span>
              </div>
              <div className="trust-badge">
                <Globe size={24} />
                <span>ESG Certified</span>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="faq-section">
            <div className="section-header">
              <h2>Questions Fréquentes</h2>
              <p>Trouvez rapidement les réponses à vos questions</p>
            </div>
            <div className="faq-grid">
              <div className="faq-item">
                <h4>Comment fonctionne l'extraction des KPIs ?</h4>
                <p>Notre IA analyse vos documents PDF et identifie automatiquement les indicateurs ESG grâce à des modèles de machine learning avancés.</p>
              </div>
              <div className="faq-item">
                <h4>Quels formats de fichiers sont supportés ?</h4>
                <p>Nous supportons les PDF, Word, Excel et les fichiers texte. L'extraction est optimale pour les rapports PDF structurés.</p>
              </div>
              <div className="faq-item">
                <h4>La sécurité de mes données est-elle garantie ?</h4>
                <p>Absolument. Toutes les données sont cryptées, stockées en France et conformes aux normes RGPD et ISO 27001.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`App ${darkMode ? 'dark' : 'light'}`}>
      {/* Barre de progression */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }}></div>

      {/* Navigation principale améliorée */}
      <nav className="main-nav glass">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="logo pulse">
              <Activity size={28} />
            </div>
            <span className="brand-name">ESG Analytics Pro</span>
          </div>

          <div className="nav-controls">
            <div className="quick-stats">
              <div className="stat-item">
                <div className="stat-icon">
                  <Database size={16} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">10K+</div>
                  <div className="stat-label">Documents</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <Zap size={16} />
                </div>
                <div className="stat-info">
                  <div className="stat-value">95%</div>
                  <div className="stat-label">Précision</div>
                </div>
              </div>
            </div>

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
        <div className="tab-nav glass">
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
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-main">
              <div className="footer-brand">
                <div className="footer-logo">
                  <Activity size={24} />
                  <span>ESG Analytics Pro</span>
                </div>
                <p>Solution d'extraction intelligente de KPIs ESG alimentée par l'IA</p>
                <div className="social-links">
                  <a href="#" className="social-link"><Linkedin size={20} /></a>
                  <a href="#" className="social-link"><Twitter size={20} /></a>
                  <a href="#" className="social-link"><Mail size={20} /></a>
                </div>
              </div>
              
              <div className="footer-links">
                <div className="link-group">
                  <h4>Produit</h4>
                  <a href="#">Fonctionnalités</a>
                  <a href="#">Tarifs</a>
                  <a href="#">API</a>
                  <a href="#">Documentation</a>
                </div>
                <div className="link-group">
                  <h4>Entreprise</h4>
                  <a href="#">À propos</a>
                  <a href="#">Carrières</a>
                  <a href="#">Presse</a>
                  <a href="#">Contact</a>
                </div>
                <div className="link-group">
                  <h4>Support</h4>
                  <a href="#">Centre d'aide</a>
                  <a href="#">Status</a>
                  <a href="#">Confidentialité</a>
                  <a href="#">CGU</a>
                </div>
              </div>
            </div>
            
            <div className="footer-bottom">
              <div className="footer-tech">
                <span>Powered by React & Flask</span>
                <span className="tech-badge">
                  <Sparkles size={14} />
                  AI Powered
                </span>
              </div>
              <div className="footer-contact">
                <div className="contact-item">
                  <Mail size={16} />
                  <span>contact@esg-analytics.com</span>
                </div>
                <div className="contact-item">
                  <Phone size={16} />
                  <span>+33 1 23 45 67 89</span>
                </div>
                <div className="contact-item">
                  <MapPin size={16} />
                  <span>Paris, France</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Bouton retour en haut */}
      <button 
        className="scroll-to-top"
        onClick={scrollToTop}
        style={{ opacity: scrollProgress > 10 ? 1 : 0 }}
      >
        <ArrowUp size={20} />
      </button>
    </div>
  );
}

export default App;