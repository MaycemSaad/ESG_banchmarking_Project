import React from 'react';
import { 
  ArrowRight, 
  BarChart3, 
  TrendingUp, 
  Shield, 
  Target, 
  Upload,
  Award,
  Zap
} from 'lucide-react';
import './Home.css';

const Home = ({ onGetStarted }) => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Award size={16} />
            <span>Plateforme ESG Intelligente</span>
          </div>
          
          <h1 className="hero-title">
            Extrayez des insights 
            <span className="gradient-text"> précieux </span>
            de vos rapports ESG
          </h1>
          
          <p className="hero-description">
            Notre outil d'extraction de KPIs ESG transforme vos documents PDF 
            en données actionnables. Analysez, comparez et améliorez vos 
            performances environnementales, sociales et de gouvernance.
          </p>

          <div className="hero-actions">
            <button 
              className="cta-button primary"
              onClick={onGetStarted}
            >
              <Upload size={20} />
              Commencer l'extraction
              <ArrowRight size={18} />
            </button>
            
            <button className="cta-button secondary">
              <Zap size={20} />
              Voir une démo
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">99%</div>
              <div className="stat-label">Précision</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Rapports analysés</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">30s</div>
              <div className="stat-label">Temps moyen</div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="floating-card card-1">
            <Upload className="card-icon" />
            <h4>Upload Simple</h4>
            <p>Téléchargez vos PDFs ESG</p>
          </div>
          <div className="floating-card card-2">
            <BarChart3 className="card-icon" />
            <h4>Analyse Automatique</h4>
            <p>Extraction intelligente des KPIs</p>
          </div>
          <div className="floating-card card-3">
            <TrendingUp className="card-icon" />
            <h4>Rapports Détaillés</h4>
            <p>Visualisations claires</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <div className="section-header">
          <h2>Une plateforme complète pour vos analyses ESG</h2>
          <p>Tous les outils dont vous avez besoin pour transformer vos données en insights</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Upload size={32} />
            </div>
            <h3>Extraction Automatique</h3>
            <p>Importez vos rapports PDF et laissez notre IA extraire automatiquement tous les KPIs ESG pertinents</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <BarChart3 size={32} />
            </div>
            <h3>Analyses Avancées</h3>
            <p>Visualisez vos performances avec des dashboards interactifs et des comparaisons sectorielles</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Shield size={32} />
            </div>
            <h3>Conformité Garantie</h3>
            <p>Respectez les régulations ESG internationales avec nos rapports de conformité automatisés</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Target size={32} />
            </div>
            <h3>Objectifs Mesurables</h3>
            <p>Définissez et suivez vos objectifs ESG avec des indicateurs de performance clairs</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <TrendingUp size={32} />
            </div>
            <h3>Suivi Continu</h3>
            <p>Surveillez l'évolution de vos performances dans le temps avec notre historique complet</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Award size={32} />
            </div>
            <h3>Benchmarking</h3>
            <p>Comparez vos résultats avec ceux de votre secteur et identifiez les meilleures pratiques</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="final-cta">
        <div className="cta-content">
          <h2>Prêt à révolutionner votre analyse ESG ?</h2>
          <p>Rejoignez des centaines d'organisations qui utilisent déjà notre plateforme</p>
          <button 
            className="cta-button large"
            onClick={onGetStarted}
          >
            <Upload size={24} />
            Commencer maintenant - C'est gratuit
            <ArrowRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;