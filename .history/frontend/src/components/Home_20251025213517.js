import React from 'react';
import { Upload, BarChart3, Zap, ArrowRight, Shield, TrendingUp, Globe, Database } from 'lucide-react';

const Home = ({ onGetStarted, darkMode }) => {
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
                onClick={onGetStarted}
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

export default Home;