import React, { useState, useEffect, useRef } from 'react';
import { Upload, BarChart3, Zap, ArrowRight, Play, Pause, TrendingUp, Users, Shield, Globe } from 'lucide-react';

const Home = ({ onGetStarted, darkMode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [counter, setCounter] = useState({ companies: 0, kpis: 0, accuracy: 0 });
  const [isPlaying, setIsPlaying] = useState(true);
  const statsRef = useRef(null);

  const features = [
    {
      icon: <Upload size={28} />,
      title: "Upload Intelligent",
      description: "Importez vos rapports PDF et définissez vos indicateurs ESG en quelques clics. Support multi-format et traitement par lots.",
      color: "#6366f1"
    },
    {
      icon: <Zap size={28} />,
      title: "Extraction IA Avancée",
      description: "Notre intelligence artificielle analyse le contenu sémantique et extrait automatiquement les données ESG avec une précision de 95%.",
      color: "#10b981"
    },
    {
      icon: <BarChart3 size={28} />,
      title: "Analyses Interactives",
      description: "Visualisez vos données avec des tableaux de bord dynamiques, comparaisons benchmarks et rapports personnalisables.",
      color: "#f59e0b"
    }
  ];

  const stats = [
    { icon: <Users size={20} />, value: "150+", label: "Entreprises analysées", suffix: "+" },
    { icon: <TrendingUp size={20} />, value: "10K", label: "KPIs extraits", suffix: "+" },
    { icon: <Shield size={20} />, value: "95", label: "Précision d'extraction", suffix: "%" },
    { icon: <Globe size={20} />, value: "25", label: "Secteurs couverts", suffix: "+" }
  ];

  const processSteps = [
    { step: 1, title: "Upload", description: "Importez vos documents", duration: "30s" },
    { step: 2, title: "Analyse IA", description: "Extraction automatique", duration: "2min" },
    { step: 3, title: "Validation", description: "Revue des résultats", duration: "1min" },
    { step: 4, title: "Rapport", description: "Export des données", duration: "30s" }
  ];

  // Animation d'entrée
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Animation des compteurs
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animateCounters();
        }
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const animateCounters = () => {
    const targets = { companies: 150, kpis: 10000, accuracy: 95 };
    const duration = 2000;
    const steps = 60;
    const stepValue = {
      companies: targets.companies / steps,
      kpis: targets.kpis / steps,
      accuracy: targets.accuracy / steps
    };

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setCounter({
        companies: Math.min(Math.floor(stepValue.companies * currentStep), targets.companies),
        kpis: Math.min(Math.floor(stepValue.kpis * currentStep), targets.kpis),
        accuracy: Math.min(Math.floor(stepValue.accuracy * currentStep), targets.accuracy)
      });

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, duration / steps);
  };

  // Carousel automatique des features
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPlaying, features.length]);

  return (
    <div className="home-fullscreen">
      {/* Background animé */}
      <div className="background-animation">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      <div className="home-container">
        {/* Hero Section */}
        <div className={`home-hero ${isVisible ? 'visible' : ''}`}>
          <div className="hero-content">
            <div className="hero-badge">
              <span>🚀 Plateforme IA ESG</span>
            </div>
            
            <h1 className="hero-title">
              <span className="title-line">Transformez vos rapports</span>
              <span className="title-line">
                en <span className="gradient-text">données actionnables</span>
              </span>
            </h1>
            
            <p className="hero-description">
              Notre solution d'intelligence artificielle extrait automatiquement 
              les indicateurs ESG clés de vos documents et génère des analyses 
              comparatives en temps réel.
            </p>

            {/* Stats en ligne */}
            <div className="inline-stats">
              <div className="stat-item">
                <span className="stat-number">{counter.companies}+</span>
                <span className="stat-label">Entreprises</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">{counter.kpis.toLocaleString()}+</span>
                <span className="stat-label">KPIs extraits</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-number">{counter.accuracy}%</span>
                <span className="stat-label">Précision</span>
              </div>
            </div>
            
            <div className="cta-section">
              <button 
                className="cta-button primary"
                onClick={onGetStarted}
              >
                <span>Démarrer l'analyse gratuite</span>
                <ArrowRight size={20} />
              </button>
              <button className="cta-button secondary">
                <Play size={16} />
                <span>Voir la démo</span>
              </button>
            </div>
          </div>

          {/* Features animées */}
          <div className="hero-features">
            <div className="features-carousel">
              <div className="carousel-header">
                <h3>Fonctionnalités principales</h3>
                <button 
                  className="carousel-control"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
              
              <div className="carousel-container">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`feature-card ${index === activeFeature ? 'active' : ''}`}
                    style={{ 
                      '--accent-color': feature.color,
                      transform: `translateX(${(index - activeFeature) * 120}%)`
                    }}
                  >
                    <div className="feature-header">
                      <div 
                        className="feature-icon"
                        style={{ background: feature.color }}
                      >
                        {feature.icon}
                      </div>
                      <div className="feature-indicators">
                        {features.map((_, i) => (
                          <div
                            key={i}
                            className={`indicator ${i === activeFeature ? 'active' : ''}`}
                            onClick={() => {
                              setActiveFeature(i);
                              setIsPlaying(false);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                    <div className="feature-progress">
                      <div 
                        className="progress-bar"
                        style={{ width: index === activeFeature ? '100%' : '0%' }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Process Steps */}
        <div className="process-section">
          <h2 className="section-title">Processus en 4 étapes simples</h2>
          <div className="process-steps">
            {processSteps.map((step, index) => (
              <div key={step.step} className="process-step">
                <div className="step-number">{step.step}</div>
                <div className="step-content">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                  <span className="step-duration">{step.duration}</span>
                </div>
                {index < processSteps.length - 1 && (
                  <div className="step-connector"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div ref={statsRef} className="stats-section">
          <h2 className="section-title">Chiffres clés</h2>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-content">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;