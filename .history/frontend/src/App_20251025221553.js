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
  Lock,
  Cloud,
  FileText,
  PieChart,
  LineChart,
  Award,
  Star,
  ChevronRight,
  Download,
  Eye,
  Settings,
  Brain,
  Leaf,
  Factory,
  Users as UsersIcon,
  Coins,
  Clock,
  ShieldCheck,
  Server
} from 'lucide-react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
    const [animatedStats, setAnimatedStats] = useState([0, 0, 0, 0, 0, 0]);
    const [currentFeature, setCurrentFeature] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const sectionRef = useRef(null);

    const features = [
      {
        icon: <Brain size={32} />,
        title: "IA Cognitive Avancée",
        description: "Notre intelligence artificielle de dernière génération analyse le contexte sémantique avec une précision de 95.7%",
        color: "#8B5CF6",
        gradient: "linear-gradient(135deg, #8B5CF6, #C4B5FD)",
        stats: "95.7% de précision"
      },
      {
        icon: <BarChart size={32} />,
        title: "Analyses Prédictives",
        description: "Tableaux de bord interactifs avec machine learning pour anticiper les tendances ESG futures",
        color: "#06B6D4",
        gradient: "linear-gradient(135deg, #06B6D4, #67E8F9)",
        stats: "30+ modèles prédictifs"
      },
      {
        icon: <Rocket size={32} />,
        title: "Automatisation Intelligente",
        description: "Workflow entièrement automatisé avec réduction de 87% du temps de traitement moyen",
        color: "#10B981",
        gradient: "linear-gradient(135deg, #10B981, #6EE7B7)",
        stats: "87% de gain de temps"
      },
      {
        icon: <ShieldCheck size={32} />,
        title: "Sécurité Enterprise",
        description: "Certifications ISO 27001, SOC 2 et conformité RGPD avec chiffrement de bout en bout",
        color: "#F59E0B",
        gradient: "linear-gradient(135deg, #F59E0B, #FCD34D)",
        stats: "99.99% de disponibilité"
      },
      {
        icon: <Cloud size={32} />,
        title: "Cloud Scalable",
        description: "Infrastructure cloud élastique capable de traiter des milliers de documents simultanément",
        color: "#EF4444",
        gradient: "linear-gradient(135deg, #EF4444, #FCA5A5)",
        stats: "10k+ docs/heure"
      },
      {
        icon: <LineChart size={32} />,
        title: "Reporting Avancé",
        description: "Génération automatique de rapports conformes aux standards GRI, SASB et TCFD",
        color: "#8B5CF6",
        gradient: "linear-gradient(135deg, #8B5CF6, #C4B5FD)",
        stats: "15+ templates"
      }
    ];

    const stats = [
      { value: 95.7, label: "Précision d'extraction", suffix: "%", icon: <Target className="stat-icon" /> },
      { value: 156, label: "Entreprises partenaires", suffix: "+", icon: <UsersIcon className="stat-icon" /> },
      { value: 12470, label: "Documents traités", suffix: "+", icon: <FileText className="stat-icon" /> },
      { value: 99.9, label: "Disponibilité plateforme", suffix: "%", icon: <Server className="stat-icon" /> },
      { value: 87, label: "Gain de temps moyen", suffix: "%", icon: <Clock className="stat-icon" /> },
      { value: 4.9, label: "Satisfaction clients", suffix: "/5", icon: <Star className="stat-icon" /> }
    ];

    const industries = [
      { name: "Finance", icon: <Coins size={24} />, count: "42 entreprises" },
      { name: "Énergie", icon: <Factory size={24} />, count: "28 entreprises" },
      { name: "Technologie", icon: <Cpu size={24} />, count: "35 entreprises" },
      { name: "Santé", icon: <Users size={24} />, count: "19 entreprises" },
      { name: "Retail", icon: <PieChart size={24} />, count: "23 entreprises" },
      { name: "Immobilier", icon: <Building size={24} />, count: "9 entreprises" }
    ];

    const testimonials = [
      {
        name: "Marie Dubois",
        role: "Directrice RSE",
        company: "Groupe Financier Européen",
        content: "ESG Analytics a révolutionné notre processus de reporting. Nous économisons plus de 200 heures par trimestre.",
        rating: 5
      },
      {
        name: "Thomas Martin",
        role: "Responsable Développement Durable",
        company: "Énergie France",
        content: "La précision de l'extraction des données et la qualité des analyses dépassent nos attentes.",
        rating: 5
      },
      {
        name: "Sophie Lambert",
        role: "Chief Sustainability Officer",
        company: "TechInnov",
        content: "Interface intuitive et équipe support réactive. Une solution indispensable pour notre stratégie ESG.",
        rating: 5
      }
    ];

    useEffect(() => {
      setIsVisible(true);
      
      // Animation des statistiques
      const intervals = stats.map((stat, index) => {
        let start = 0;
        const end = stat.value;
        const duration = 2500;
        const increment = end / (duration / 16);
        
        const timer = setInterval(() => {
          start += increment;
          if (start >= end) {
            start = end;
            clearInterval(timer);
          }
          setAnimatedStats(prev => {
            const newStats = [...prev];
            newStats[index] = Math.floor(start * 10) / 10;
            return newStats;
          });
        }, 16);
        
        return timer;
      });

      return () => intervals.forEach(interval => clearInterval(interval));
    }, []);

    useEffect(() => {
      const featureInterval = setInterval(() => {
        setCurrentFeature(prev => (prev + 1) % features.length);
      }, 5000);

      return () => clearInterval(featureInterval);
    }, [features.length]);

    const Building = (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 21h18M9 8h1m-1 4h1m-1 4h1m4-8h1m-1 4h1m-1 4h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/>
      </svg>
    );

    return (
      <div className={`home-fullscreen ${isVisible ? 'visible' : ''}`}>
        {/* Cursor Follower */}
        <div 
          className="cursor-follower"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`
          }}
        ></div>

        {/* Enhanced Background Animation */}
        <div className="background-animation">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
            <div className="shape shape-5"></div>
          </div>
          <div className="particles-container">
            {[...Array(25)].map((_, i) => (
              <div key={i} className="particle" style={{
                '--delay': `${i * 0.3}s`,
                '--duration': `${12 + i % 8}s`,
                '--size': `${3 + i % 4}px`
              }}></div>
            ))}
          </div>
          <div className="grid-overlay"></div>
        </div>

        <div className="home-container">
          {/* Enhanced Hero Section */}
          <div className="home-hero">
            <div className="hero-content">
              <div className="hero-badge-group">
                <div className="hero-badge premium">
                  <Sparkles size={16} />
                  <span>Solution IA ESG Premium 2024</span>
                  <div className="badge-sparkle"></div>
                </div>
                <div className="hero-badge award">
                  <Award size={14} />
                  <span>Leader Gartner Magic Quadrant</span>
                </div>
              </div>
              
              <h1 className="hero-title">
                <span className="title-line">L'Intelligence Artificielle</span>
                <span className="gradient-text title-line">au Service de Votre RSE</span>
                <span className="title-line">Transformation Digitale ESG</span>
              </h1>
              
              <p className="hero-description">
                Plateforme IA de pointe pour l'extraction, l'analyse et la visualisation 
                <strong> automatisées</strong> de vos indicateurs ESG. 
                <span className="highlight"> Réduction de 87% du temps de traitement</span> et 
                conformité totale avec les réglementations internationales.
              </p>

              {/* Enhanced Stats */}
              <div className="hero-stats">
                {stats.map((stat, index) => (
                  <div key={index} className="stat-card" style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="stat-header">
                      {stat.icon}
                      <div className="stat-value">
                        {animatedStats[index]}
                        <span className="stat-suffix">{stat.suffix}</span>
                      </div>
                    </div>
                    <div className="stat-label">{stat.label}</div>
                    <div className="stat-progress">
                      <div 
                        className="stat-progress-bar" 
                        style={{
                          width: `${(animatedStats[index] / stat.value) * 100}%`,
                          background: stat.color
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Enhanced CTA */}
              <div className="cta-container">
                <button 
                  className="cta-button primary glow"
                  onClick={handleGetStarted}
                >
                  <Rocket size={24} />
                  <span className="cta-text">
                    <span className="cta-main">Démarrer l'Analyse Gratuite</span>
                    <span className="cta-sub">14 jours • Aucune carte requise</span>
                  </span>
                  <div className="cta-arrow">
                    <ArrowRight size={20} />
                  </div>
                  <div className="cta-hover-effect"></div>
                </button>
                
                <div className="cta-group">
                  <button className="cta-button secondary">
                    <Play size={20} />
                    <span>Démo Interactive</span>
                  </button>
                  <button className="cta-button outline">
                    <Download size={20} />
                    <span>Brochure PDF</span>
                  </button>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="trust-indicators">
                <div className="trust-item">
                  <ShieldCheck size={18} />
                  <span>Sécurité Enterprise</span>
                </div>
                <div className="trust-item">
                  <CheckCircle size={18} />
                  <span>Conformité RGPD</span>
                </div>
                <div className="trust-item">
                  <Clock size={18} />
                  <span>Configuration 5min</span>
                </div>
                <div className="trust-item">
                  <Users size={18} />
                  <span>Support 24/7</span>
                </div>
              </div>
            </div>

            {/* Enhanced Hero Visual */}
            <div className="hero-visual">
              <div className="floating-elements">
                <div className="floating-card card-1">
                  <div className="card-glow"></div>
                  <div className="card-icon">
                    <Target size={24} />
                  </div>
                  <div className="card-content">
                    <div className="card-value">15,624</div>
                    <div className="card-label">KPIs extraits</div>
                  </div>
                  <div className="card-trend up">+12%</div>
                </div>
                
                <div className="floating-card card-2">
                  <div className="card-glow"></div>
                  <div className="card-icon">
                    <Zap size={24} />
                  </div>
                  <div className="card-content">
                    <div className="card-value">95.7%</div>
                    <div className="card-label">Précision IA</div>
                  </div>
                  <div className="card-trend up">+2.1%</div>
                </div>

                <div className="floating-card card-3">
                  <div className="card-glow"></div>
                  <div className="card-icon">
                    <TrendingUp size={24} />
                  </div>
                  <div className="card-content">
                    <div className="card-value">87%</div>
                    <div className="card-label">Gain de temps</div>
                  </div>
                  <div className="card-trend up">+5%</div>
                </div>
              </div>

              <div className="mockup-dashboard">
                <div className="mockup-glow"></div>
                <div className="mockup-header">
                  <div className="mockup-controls">
                    <div className="mockup-dots">
                      <span style={{background: '#FF5F57'}}></span>
                      <span style={{background: '#FFBD2E'}}></span>
                      <span style={{background: '#28CA42'}}></span>
                    </div>
                  </div>
                  <div className="mockup-title">Dashboard ESG Analytics Pro</div>
                  <div className="mockup-actions">
                    <Settings size={14} />
                    <Eye size={14} />
                  </div>
                </div>
                <div className="mockup-content">
                  <div className="chart-container">
                    <div className="chart-bar" style={{height: '85%', background: 'linear-gradient(180deg, #8B5CF6, #6D28D9)'}}></div>
                    <div className="chart-bar" style={{height: '65%', background: 'linear-gradient(180deg, #06B6D4, #0891B2)'}}></div>
                    <div className="chart-bar" style={{height: '92%', background: 'linear-gradient(180deg, #10B981, #047857)'}}></div>
                    <div className="chart-bar" style={{height: '78%', background: 'linear-gradient(180deg, #F59E0B, #D97706)'}}></div>
                    <div className="chart-bar" style={{height: '70%', background: 'linear-gradient(180deg, #EF4444, #DC2626)'}}></div>
                  </div>
                  <div className="data-grid">
                    <div className="data-row animated" style={{width: '92%'}}>
                      <div className="data-label">Environnement</div>
                      <div className="data-value">92%</div>
                    </div>
                    <div className="data-row animated" style={{width: '87%', animationDelay: '0.2s'}}>
                      <div className="data-label">Social</div>
                      <div className="data-value">87%</div>
                    </div>
                    <div className="data-row animated" style={{width: '95%', animationDelay: '0.4s'}}>
                      <div className="data-label">Gouvernance</div>
                      <div className="data-value">95%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Industries Section */}
          <div className="industries-section">
            <div className="section-header">
              <h2>Reconnu par les leaders de tous les secteurs</h2>
              <p>Plus de 150 entreprises nous font confiance pour leur transformation ESG digitale</p>
            </div>
            <div className="industries-grid">
              {industries.map((industry, index) => (
                <div key={index} className="industry-card">
                  <div className="industry-icon">
                    {industry.icon}
                  </div>
                  <div className="industry-content">
                    <h3>{industry.name}</h3>
                    <p>{industry.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Features Grid */}
          <div className="features-section">
            <div className="section-header">
              <div className="section-badge">
                <Sparkles size={16} />
                <span>Fonctionnalités Premium</span>
              </div>
              <h2>Une plateforme complète pour l'excellence ESG</h2>
              <p>Découvrez les fonctionnalités avancées qui font de nous le leader du marché</p>
            </div>
            
            <div className="features-grid">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className={`feature-card ${index === currentFeature ? 'active' : ''}`}
                  style={{ 
                    '--accent-color': feature.color,
                    '--gradient': feature.gradient
                  }}
                >
                  <div className="feature-glow"></div>
                  <div className="feature-badge">
                    <span>{feature.stats}</span>
                  </div>
                  <div className="feature-icon-wrapper">
                    <div className="feature-icon-bg"></div>
                    {feature.icon}
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  <div className="feature-actions">
                    <button className="feature-button">
                      <span>Découvrir</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="feature-indicator">
                    <div className="indicator-dot"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="testimonials-section">
            <div className="section-header">
              <h2>Ils nous font confiance</h2>
              <p>Découvrez les retours d'expérience de nos clients satisfaits</p>
            </div>
            <div className="testimonials-grid">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="testimonial-card">
                  <div className="testimonial-header">
                    <div className="testimonial-avatar">
                      <Users size={24} />
                    </div>
                    <div className="testimonial-info">
                      <h4>{testimonial.name}</h4>
                      <p>{testimonial.role}</p>
                      <span>{testimonial.company}</span>
                    </div>
                    <div className="testimonial-rating">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} size={16} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <p className="testimonial-content">"{testimonial.content}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Trust Badges */}
          <div className="trust-section">
            <div className="trust-content">
              <div className="trust-header">
                <h3>Certifications et Conformités</h3>
                <p>Notre engagement pour la sécurité et la qualité</p>
              </div>
              <div className="trust-badges">
                <div className="trust-badge">
                  <Shield size={32} />
                  <div className="trust-info">
                    <span>ISO 27001</span>
                    <small>Sécurité de l'information</small>
                  </div>
                </div>
                <div className="trust-badge">
                  <Lock size={32} />
                  <div className="trust-info">
                    <span>RGPD Compliant</span>
                    <small>Protection des données</small>
                  </div>
                </div>
                <div className="trust-badge">
                  <CheckCircle size={32} />
                  <div className="trust-info">
                    <span>SOC 2 Type II</span>
                    <small>Contrôles sécurité</small>
                  </div>
                </div>
                <div className="trust-badge">
                  <Award size={32} />
                  <div className="trust-info">
                    <span>AI Ethics Certified</span>
                    <small>Éthique IA</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="final-cta">
            <div className="cta-background"></div>
            <div className="cta-content">
              <h2>Prêt à révolutionner votre stratégie ESG ?</h2>
              <p>Rejoignez les 156 entreprises leaders qui transforment déjà leur reporting RSE</p>
              <div className="cta-actions">
                <button className="cta-button large glow" onClick={handleGetStarted}>
                  <Rocket size={24} />
                  <span>Commencer Maintenant</span>
                  <div className="cta-sparkles">
                    <Sparkles size={20} />
                  </div>
                </button>
                <div className="cta-features">
                  <span>✓ Essai 14 jours gratuit</span>
                  <span>✓ Configuration assistée</span>
                  <span>✓ Support dédié</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`App ${darkMode ? 'dark' : 'light'}`}>
      {/* Enhanced Navigation */}
      <nav className="main-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="logo">
              <Activity size={32} />
              <div className="logo-glow"></div>
            </div>
            <span className="brand-name">ESG Analytics Pro</span>
          </div>

          <div className="nav-controls">
            <button className="theme-toggle" onClick={toggleTheme}>
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              <span className="theme-label">{darkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
            </button>

            {showResults && (
              <button className="nav-button" onClick={handleGoHome}>
                <HomeIcon size={20} />
                <span>Retour à l'accueil</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Enhanced Tab Navigation */}
      {showResults && (
        <div className="tab-nav">
          <div className="tab-container">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                disabled={(tab.id === 'analysis' && !currentFileData) || (tab.id === 'home')}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
                <div className="tab-indicator"></div>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="app-main">
        {/* Enhanced Notification */}
        {processResult && showResults && (
          <div className={`process-result ${processResult.success ? 'success' : 'error'}`}>
            <div className="result-content">
              <div className="result-header">
                <div className="result-icon">
                  {processResult.success ? 
                    <CheckCircle size={24} /> : 
                    <X size={24} />
                  }
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
                    <Search size={18} />
                    <span>Voir l'Analyse Détaillée</span>
                  </button>
                  <button 
                    onClick={handleViewGlobalDashboard}
                    className="action-btn secondary"
                  >
                    <BarChart3 size={18} />
                    <span>Dashboard Global</span>
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => setProcessResult(null)}
              className="close-result"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Main Content */}
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

      {/* Enhanced Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <Activity size={24} />
                <span>ESG Analytics Pro</span>
              </div>
              <p>Plateforme IA leader pour l'analyse et le reporting ESG intelligent</p>
              <div className="footer-social">
                <span>Suivez-nous</span>
                <div className="social-links">
                  {/* Add social icons here */}
                </div>
              </div>
            </div>
            <div className="footer-tech">
              <div className="tech-stack">
                <span>Powered by Advanced AI & Machine Learning</span>
                <div className="tech-badges">
                  <span className="tech-badge">React 18</span>
                  <span className="tech-badge">Python Flask</span>
                  <span className="tech-badge">TensorFlow</span>
                </div>
              </div>
              <div className="footer-ai">
                <Brain size={20} />
                <span>AI Powered Analytics</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 ESG Analytics Pro. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;