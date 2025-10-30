import React, { useState, useEffect } from 'react';
import { ChevronRight, Upload, BarChart3, TrendingUp, Users, Shield, Database, Zap } from 'lucide-react';
import './Home.css';

const Home = ({ onGetStarted }) => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [stats, setStats] = useState({
    companies: 0,
    kpis: 0,
    documents: 0,
    accuracy: 0
  });

  const features = [
    {
      icon: <Upload className="feature-icon" />,
      title: "Upload Intelligent",
      description: "Téléchargez vos rapports PDF et fichiers KPI pour une extraction automatique des données ESG.",
      color: "#667eea"
    },
    {
      icon: <Database className="feature-icon" />,
      title: "Extraction Automatique",
      description: "Notre IA identifie et extrait automatiquement les KPIs ESG pertinents de vos documents.",
      color: "#764ba2"
    },
    {
      icon: <BarChart3 className="feature-icon" />,
      title: "Analyses Avancées",
      description: "Visualisez vos données avec des tableaux de bord interactifs et des graphiques détaillés.",
      color: "#f093fb"
    },
    {
      icon: <TrendingUp className="feature-icon" />,
      title: "Benchmarking",
      description: "Comparez vos performances ESG avec celles d'autres entreprises de votre secteur.",
      color: "#4facfe"
    },
    {
      icon: <Shield className="feature-icon" />,
      title: "Conformité ESG",
      description: "Assurez-vous de respecter les normes et régulations ESG les plus récentes.",
      color: "#43e97b"
    },
    {
      icon: <Users className="feature-icon" />,
      title: "Collaboration",
      description: "Partagez vos analyses et travaillez en équipe sur vos rapports ESG.",
      color: "#fa709a"
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Upload des Fichiers",
      description: "Téléchargez votre fichier KPI (Excel/CSV) et vos rapports PDF ESG"
    },
    {
      number: "02",
      title: "Extraction Automatique",
      description: "Notre IA analyse et extrait les KPIs pertinents automatiquement"
    },
    {
      number: "03",
      title: "Analyse des Données",
      description: "Visualisez et analysez les résultats avec nos outils interactifs"
    },
    {
      number: "04",
      title: "Export & Reporting",
      description: "Générez des rapports détaillés et exportez vos données"
    }
  ];

  const testimonials = [
    {
      name: "Marie Lambert",
      role: "Responsable RSE",
      company: "EcoSolutions SA",
      content: "Cet outil a révolutionné notre processus de reporting ESG. Nous économisons des dizaines d'heures chaque trimestre.",
      avatar: "👩‍💼"
    },
    {
      name: "Thomas Dubois",
      role: "Analyste ESG",
      company: "GreenInvest Partners",
      content: "La précision de l'extraction et la qualité des visualisations sont exceptionnelles. Un outil indispensable.",
      avatar: "👨‍💻"
    },
    {
      name: "Sophie Chen",
      role: "Directrice Développement Durable",
      company: "Innovatech Group",
      content: "Interface intuitive et résultats précis. Parfait pour nos rapports de conformité ESG.",
      avatar: "👩‍🎓"
    }
  ];

  useEffect(() => {
    // Animation des statistiques
    const animateStats = () => {
      const targetStats = {
        companies: 127,
        kpis: 584,
        documents: 892,
        accuracy: 94
      };

      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        setStats({
          companies: Math.floor(targetStats.companies * progress),
          kpis: Math.floor(targetStats.kpis * progress),
          documents: Math.floor(targetStats.documents * progress),
          accuracy: Math.floor(targetStats.accuracy * progress)
        });

        if (currentStep >= steps) {
          clearInterval(timer);
          setStats(targetStats);
        }
      }, stepDuration);
    };

    animateStats();

    // Rotation des features
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => {
      clearInterval(featureInterval);
    };
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="badge">
              <Zap className="badge-icon" />
              Plateforme IA Avancée
            </div>
            <h1 className="hero-title">
              Transformez vos <span className="highlight">Rapports ESG</span> en Insights Actionnables
            </h1>
            <p className="hero-description">
              Notre intelligence artificielle extrait, analyse et visualise automatiquement 
              vos indicateurs ESG à partir de vos documents. Gagnez du temps et améliorez 
              la précision de votre reporting.
            </p>
            <div className="hero-actions">
              <button onClick={onGetStarted} className="cta-button primary">
                Commencer l'Analyse
                <ChevronRight className="button-icon" />
              </button>
              <button className="cta-button secondary">
                Voir une Démo
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-number">+{stats.companies}</div>
                <div className="stat-label">Entreprises</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">+{stats.kpis}</div>
                <div className="stat-label">KPIs Extraits</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">+{stats.documents}</div>
                <div className="stat-label">Documents Analysés</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{stats.accuracy}%</div>
                <div className="stat-label">Précision</div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-cards">
              <div className="card card-1">
                <div className="card-header">
                  <div className="card-icon">📊</div>
                  <h4>Dashboard ESG</h4>
                </div>
                <div className="card-content">
                  <div className="metric">
                    <span className="metric-label">Émissions CO2</span>
                    <span className="metric-value">124 t</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Consommation Eau</span>
                    <span className="metric-value">45 m³</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
              <div className="card card-2">
                <div className="card-header">
                  <div className="card-icon">🔍</div>
                  <h4>Analyse en Temps Réel</h4>
                </div>
                <div className="card-content">
                  <div className="analysis-item">
                    <span className="analysis-text">12 KPIs identifiés</span>
                    <span className="analysis-badge">95%</span>
                  </div>
                  <div className="analysis-item">
                    <span className="analysis-text">Confiance moyenne</span>
                    <span className="analysis-badge">87%</span>
                  </div>
                </div>
              </div>
              <div className="card card-3">
                <div className="card-header">
                  <div className="card-icon">⚡</div>
                  <h4>Extraction IA</h4>
                </div>
                <div className="card-content">
                  <div className="extraction-stats">
                    <div className="stat">
                      <span className="stat-value">3.2s</span>
                      <span className="stat-label">Temps moyen</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">94%</span>
                      <span className="stat-label">Précision</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Fonctionnalités Principales</h2>
            <p>Découvrez comment notre plateforme transforme votre gestion des données ESG</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`feature-card ${index === currentFeature ? 'active' : ''}`}
                style={{ '--accent-color': feature.color }}
              >
                <div className="feature-icon-wrapper">
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className="feature-indicator"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="steps-section">
        <div className="container">
          <div className="section-header">
            <h2>Comment ça marche</h2>
            <p>Quatre étapes simples pour transformer vos documents en insights précieux</p>
          </div>
          <div className="steps-grid">
            {steps.map((step, index) => (
              <div key={index} className="step-card">
                <div className="step-number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <div className="step-connector"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-header">
            <h2>Ils nous font confiance</h2>
            <p>Découvrez ce que nos utilisateurs pensent de notre plateforme</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <div className="testimonial-content">
                  <p>"{testimonial.content}"</p>
                </div>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.avatar}</div>
                  <div className="author-info">
                    <h4>{testimonial.name}</h4>
                    <p>{testimonial.role}</p>
                    <span>{testimonial.company}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Prêt à révolutionner votre reporting ESG ?</h2>
            <p>Rejoignez des centaines d'entreprises qui utilisent déjà notre plateforme pour simplifier leur gestion des données ESG.</p>
            <div className="cta-actions">
              <button onClick={onGetStarted} className="cta-button primary large">
                Commencer Maintenant
                <ChevronRight className="button-icon" />
              </button>
              <button className="cta-button secondary large">
                Planifier une Démo
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;