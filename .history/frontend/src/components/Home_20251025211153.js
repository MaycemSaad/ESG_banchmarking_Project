import React from 'react';
import { Upload, BarChart3, Zap, ArrowRight } from 'lucide-react';

const Home = ({ onGetStarted, darkMode }) => {
  const features = [
    {
      icon: <Upload size={24} />,
      title: "Upload Simple",
      description: "Importez vos fichiers PDF et définissez vos KPIs en quelques clics"
    },
    {
      icon: <Zap size={24} />,
      title: "Extraction Intelligente",
      description: "Notre IA extrait automatiquement les données ESG de vos documents"
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Analyses Détaillées",
      description: "Visualisez et analysez vos KPIs avec des tableaux de bord interactifs"
    }
  ];

  return (
    <div className="home-fullscreen">
      <div className="home-container">
        <div className="home-hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Extraction Intelligente de 
              <span className="gradient-text"> KPIs ESG</span>
            </h1>
            <p className="hero-description">
              Transformez vos rapports PDF en données actionnables. 
              Notre solution IA extrait automatiquement les indicateurs ESG 
              clés pour vos analyses et reporting.
            </p>
            
            <button 
              className="cta-button"
              onClick={onGetStarted}
            >
              <span>Commencer l'Extraction</span>
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="hero-features">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;