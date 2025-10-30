// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import NewsSection from './components/News/NewsSection';

// Composants
import Header from './components/Header/Header';
import Chatbot from './components/Chatbot/Chatbot';
import ServiceCard from './components/ServiceCard/ServiceCard';
import DocumentCard from './components/DocumentCard/DocumentCard';
import StatsCounter from './components/StatsCounter/StatsCounter';
import Login from './components/Auth/Login';
import Signup from './components/Auth/SignUp';
import InvestmentRecommendationEngine from './components/InvestmentRecommendationEngine';

// Nouveaux composants d'animation
import HeroParticles from './components/Animations/HeroParticles';
import ScrollProgress from './components/Animations/ScrollProgress';
import AnimatedSection from './components/Animations/AnimatedSection';
import FloatingElements from './components/Animations/FloatingElements';

function App() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentView, setCurrentView] = useState('home');
    const [user, setUser] = useState(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const heroRef = useRef(null);

    useEffect(() => {
        setIsVisible(true);
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
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
    }, []);

    const handleLogin = (loginData) => {
        console.log('Login data:', loginData);
        const userData = {
            email: loginData.email,
            name: 'Utilisateur Demo',
            company: 'Entreprise Demo',
            role: 'financial_advisor'
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setCurrentView('home');
    };

    const handleSignup = (signupData) => {
        console.log('Signup data:', signupData);
        const userData = {
            email: signupData.email,
            name: `${signupData.firstName} ${signupData.lastName}`,
            company: signupData.company,
            profession: signupData.profession,
            role: signupData.profession === 'financial_advisor' ? 'financial_advisor' : 'investor'
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setCurrentView('home');
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const navigateToRecommendations = () => {
        if (user) {
            setCurrentView('recommendations');
        } else {
            setCurrentView('signup');
        }
    };

    // Services avec images réelles
    const services = [
        {
            image: '/api/placeholder/400/250?text=Risk+Management',
            title: 'Risk Management',
            description: 'Analyse et modélisation des risques financiers avec IA avancée',
            features: ['Bâle III/IV Compliance', 'Value at Risk (VaR)', 'Stress Testing', 'Capital Allocation'],
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            icon: '🎯'
        },
        {
            image: '/api/placeholder/400/250?text=Compliance',
            title: 'Conformité Réglementaire',
            description: 'Surveillance complète des régulations financières internationales',
            features: ['IFRS 17 Implementation', 'Solvability II Reporting', 'Regulatory Monitoring', 'Audit Automation'],
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            icon: '📋'
        },
        {
            image: '/api/placeholder/400/250?text=Actuarial+Analysis',
            title: 'Analyse Actuarielle',
            description: 'Modélisation actuarielle précise et calcul de réserves optimisés',
            features: ['Pricing & Reserving', 'Mortality Modeling', 'Pension Valuation', 'ALM Strategies'],
            gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            icon: '📊'
        },
        {
            image: '/api/placeholder/400/250?text=AI+Recommendations',
            title: 'Recommandations IA',
            description: 'Système intelligent de recommandations d investissement personnalisées',
            features: ['Deep Learning Avancé', 'Analyse Portefeuille', 'Optimisation Dynamique', 'Alertes Marché'],
            gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            icon: '🤖',
            onExplore: navigateToRecommendations
        },
        {
            image: '/api/placeholder/400/250?text=AI+Chatbot',
            title: 'Chatbot Expert',
            description: 'Assistant IA spécialisé disponible 24/7 pour vos questions techniques',
            features: ['24/7 Availability', 'Technical Expertise', 'Multi-language', 'RAG Powered'],
            gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            icon: '💬'
        }
    ];

    const documents = [
        {
            image: '/api/placeholder/300/200?text=Bâle+III',
            title: 'Bâle III/IV Framework',
            description: 'Analyse exhaustive des exigences de capital renforcées et des nouveaux ratios de liquidité',
            meta: { type: 'AI Generated', pages: '45 pages', category: 'Régulation' },
            badge: 'Nouveau',
            icon: '📄'
        },
        {
            image: '/api/placeholder/300/200?text=IFRS+17',
            title: 'IFRS 17 Implementation',
            description: 'Guide pratique de mise en œuvre avec études de cas et modèles financiers',
            meta: { type: 'AI Enhanced', pages: '32 pages', category: 'Comptabilité' },
            badge: 'Populaire',
            icon: '📊'
        },
        {
            image: '/api/placeholder/300/200?text=Risk+Strategies',
            title: 'Risk Management Strategies',
            description: 'Stratégies avancées de gestion des risques financiers et opérationnels',
            meta: { type: 'Expert Analysis', pages: '28 pages', category: 'Risk Management' },
            icon: '🎯'
        }
    ];

    const stats = [
        { number: '250+', label: 'Documents Analysés', icon: '📚' },
        { number: '15+', label: 'Domaines Experts', icon: '🎯' },
        { number: '99.7%', label: 'Précision IA', icon: '🤖' },
        { number: '24/7', label: 'Disponibilité', icon: '⚡' },
        { number: '500+', label: 'Recommandations/Jour', icon: '💡' }
    ];

    // Rendu des vues d'authentification
    if (currentView === 'login') {
        return (
            <Login 
                onSwitchToSignup={() => setCurrentView('signup')}
                onLogin={handleLogin}
            />
        );
    }

    if (currentView === 'signup') {
        return (
            <Signup 
                onSwitchToLogin={() => setCurrentView('login')}
                onSignup={handleSignup}
            />
        );
    }

    if (currentView === 'recommendations') {
        return (
            <div className="App">
                <Header 
                    user={user} 
                    onLoginClick={() => setCurrentView('login')}
                    onSignupClick={() => setCurrentView('signup')}
                    onLogoutClick={handleLogout}
                    onHomeClick={() => setCurrentView('home')}
                    onRecommendationsClick={navigateToRecommendations}
                />
                <InvestmentRecommendationEngine 
                    user={user}
                    onBack={() => setCurrentView('home')}
                />
            </div>
        );
    }

    return (
        <div className="App">
            <ScrollProgress progress={scrollProgress} />
            <Header 
                user={user} 
                onLoginClick={() => setCurrentView('login')}
                onSignupClick={() => setCurrentView('signup')}
                onLogoutClick={handleLogout}
            />
            
            <main className="main-content">
                {/* Section Hero avec animations avancées */}
                <section ref={heroRef} className={`hero ${isVisible ? 'visible' : ''}`}>
                    <HeroParticles />
                    <div className="hero-background">
                        <div className="hero-gradient"></div>
                        <div className="hero-pattern"></div>
                    </div>
                    <div className="container">
                        <div className="hero-content">
                           
                            <h1 className="hero-title">
                                Intelligence Artificielle pour la
                                <span className="hero-highlight"> Finance & Actuariat</span>
                            </h1>
                            <p className="hero-subtitle">
                                Solutions IA de pointe pour l'analyse de risques, la conformité réglementaire 
                                et l'optimisation des investissements. Transformez vos données en avantage compétitif.
                            </p>
                            
                            <div className="hero-stats">
                                {stats.map((stat, index) => (
                                    <StatsCounter 
                                        key={index}
                                        number={stat.number}
                                        label={stat.label}
                                        icon={stat.icon}
                                        delay={index * 200}
                                    />
                                ))}
                            </div>

                            <div className="hero-buttons">
                                {user ? (
                                    <>
                                        <button 
                                            className="btn btn-primary btn-glow"
                                            onClick={navigateToRecommendations}
                                        >
                                            <span>Recommandations IA</span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                        <button className="btn btn-secondary">
                                            <span>Explorer les Documents</span>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            className="btn btn-primary btn-glow"
                                            onClick={() => setCurrentView('signup')}
                                        >
                                            <span>Commencer gratuitement</span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                        <button 
                                            className="btn btn-secondary"
                                            onClick={() => setCurrentView('login')}
                                        >
                                            <span>Se connecter</span>
                                        </button>
                                    </>
                                )}
                            </div>

                            {user && (
                                <div className="user-welcome slide-in">
                                    <div className="welcome-badge">
                                        <span>👋 Bienvenue, {user.name}</span>
                                        {user.role === 'financial_advisor' && (
                                            <span className="role-badge">Conseiller Financier</span>
                                        )}
                                    </div>
                                    <p className="welcome-message">
                                        Accédez à toutes les fonctionnalités premium de la plateforme
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="hero-visual">
                            <FloatingElements />
                            
                        </div>
                    </div>
                    
                    {/* Scroll indicator */}
                    <div className="scroll-indicator">
                        <div className="scroll-arrow"></div>
                    </div>
                </section>

                {/* Section Services avec animations */}
                <AnimatedSection>
                    <section id="services" className="services-section">
                        <div className="container">
                            <div className="section-header">
                                <h2>Nos Domaines d'Expertise</h2>
                                <p className="section-subtitle">
                                    Des solutions IA spécialisées pour chaque aspect de la finance et de l'actuariat
                                </p>
                            </div>
                            
                            <div className="services-grid">
                                {services.map((service, index) => (
                                    <ServiceCard 
                                        key={index}
                                        {...service}
                                        delay={index * 100}
                                        hasImage={true}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                </AnimatedSection>

                {/* Section Documents */}
                <AnimatedSection delay={200}>
                    <section id="documents" className="documents-section">
                        <div className="container">
                            <div className="section-header">
                                <h2>Base de Connaissances Technique</h2>
                                <p className="section-subtitle">
                                    Documents spécialisés analysés et enrichis par notre intelligence artificielle
                                </p>
                            </div>
                            
                            <div className="documents-grid">
                                {documents.map((doc, index) => (
                                    <DocumentCard 
                                        key={index}
                                        {...doc}
                                        delay={index * 150}
                                        hasImage={true}
                                    />
                                ))}
                            </div>
                            
                            <div className="section-actions">
                                {user ? (
                                    <button className="btn btn-outline btn-shimmer">
                                        <span>Accéder à tous les documents</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                ) : (
                                    <button 
                                        className="btn btn-outline btn-shimmer"
                                        onClick={() => setCurrentView('signup')}
                                    >
                                        <span>S'inscrire pour explorer</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                </AnimatedSection>

                {/* Section Actualités */}
                <AnimatedSection delay={300}>
                    <NewsSection />
                </AnimatedSection>

                {/* Section Démo Recommandations */}
                <AnimatedSection delay={400}>
                    <section id="demo-recommendations" className="demo-section">
                        <div className="demo-background">
                            <div className="demo-gradient"></div>
                        </div>
                        <div className="container">
                            <div className="section-header">
                                <h2>🎯 Système de Recommandation Intelligent</h2>
                                <p className="section-subtitle">
                                    Découvrez notre IA d'investissement qui analyse les marchés en temps réel et génère des recommandations personnalisées
                                </p>
                            </div>
                            
                            <div className="demo-features">
                                <div className="demo-feature">
                                    <div className="feature-icon">🧠</div>
                                    <h3>Deep Learning Avancé</h3>
                                    <p>Modèles transformers et réseaux de neurones pour l'analyse de portefeuille</p>
                                </div>
                                <div className="demo-feature">
                                    <div className="feature-icon">⚡</div>
                                    <h3>Temps Réel</h3>
                                    <p>Analyse continue des marchés et détection des régimes de marché</p>
                                </div>
                                <div className="demo-feature">
                                    <div className="feature-icon">🎯</div>
                                    <h3>Personnalisation</h3>
                                    <p>Recommandations adaptées au profil risque et objectifs de chaque client</p>
                                </div>
                            </div>
                            
                            <div className="demo-cta">
                                <button 
                                    className="btn btn-primary btn-large btn-glow"
                                    onClick={navigateToRecommendations}
                                >
                                    <span>Essayer le moteur de recommandation</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                                <p className="demo-note">
                                    Accès immédiat pour les utilisateurs connectés
                                </p>
                            </div>
                        </div>
                    </section>
                </AnimatedSection>

                {/* Section Contact */}
                <AnimatedSection delay={500}>
                    <section id="contact" className="contact-section">
                        <div className="container">
                            <div className="section-header">
                                <h2>Contactez-nous</h2>
                                <p className="section-subtitle">
                                    Discutons de votre projet et voyons comment notre IA peut vous aider
                                </p>
                            </div>
                            
                            <div className="contact-content">
                                <div className="contact-info">
                                    <div className="contact-item">
                                        <div className="contact-icon">📧</div>
                                        <div>
                                            <h4>Email</h4>
                                            <p>contact@finance-actuarial.ai</p>
                                        </div>
                                    </div>
                                    
                                    <div className="contact-item">
                                        <div className="contact-icon">📞</div>
                                        <div>
                                            <h4>Téléphone</h4>
                                            <p>+33 1 23 45 67 89</p>
                                        </div>
                                    </div>
                                    
                                    <div className="contact-item">
                                        <div className="contact-icon">🏢</div>
                                        <div>
                                            <h4>Adresse</h4>
                                            <p>123 Avenue de la Finance, 75001 Paris</p>
                                        </div>
                                    </div>

                                    <div className="contact-item">
                                        <div className="contact-icon">🕒</div>
                                        <div>
                                            <h4>Horaires</h4>
                                            <p>Lun - Ven: 9h00 - 18h00</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <form className="contact-form">
                                    <div className="form-group">
                                        <input type="text" placeholder="Votre nom" required />
                                    </div>
                                    <div className="form-group">
                                        <input type="email" placeholder="Votre email" required />
                                    </div>
                                    <div className="form-group">
                                        <input type="text" placeholder="Sujet" required />
                                    </div>
                                    <div className="form-group">
                                        <textarea placeholder="Votre message" rows="5" required></textarea>
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-glow">
                                        Envoyer le message
                                    </button>
                                </form>
                            </div>
                        </div>
                    </section>
                </AnimatedSection>

                {/* Section CTA */}
                <AnimatedSection delay={600}>
                    <section className="cta-section">
                        <div className="cta-background">
                            <div className="cta-gradient"></div>
                            <div className="cta-particles"></div>
                        </div>
                        <div className="container">
                            <div className="cta-content">
                                <h2>
                                    {user ? 'Découvrez nos recommandations IA avancées' : 'Prêt à révolutionner votre approche financière ?'}
                                </h2>
                                <p>
                                    {user 
                                        ? `Profitez de l'accès complet à notre moteur de recommandation IA et optimisez vos stratégies d'investissement.`
                                        : `Rejoignez les leaders qui utilisent déjà notre plateforme IA pour optimiser leurs processus et prendre des décisions éclairées.`
                                    }
                                </p>
                                
                                <div className="cta-features">
                                    <div className="feature-item">
                                        <div className="feature-icon">⚡</div>
                                        <span>Déploiement en 24h</span>
                                    </div>
                                    <div className="feature-item">
                                        <div className="feature-icon">🛡️</div>
                                        <span>Certifié RGPD</span>
                                    </div>
                                    <div className="feature-item">
                                        <div className="feature-icon">🎯</div>
                                        <span>Recommandations IA</span>
                                    </div>
                                </div>
                                
                                <div className="cta-buttons">
                                    {user ? (
                                        <>
                                            <button 
                                                className="btn btn-primary btn-large btn-glow"
                                                onClick={navigateToRecommendations}
                                            >
                                                <span>Accéder aux recommandations</span>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" fill="currentColor"/>
                                                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                                                </svg>
                                            </button>
                                            <button className="btn btn-secondary btn-large">
                                                <span>Configurer mon espace</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                className="btn btn-primary btn-large btn-glow"
                                                onClick={() => setCurrentView('signup')}
                                            >
                                                <span>Démarrer gratuitement</span>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                                    <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" fill="currentColor"/>
                                                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
                                                </svg>
                                            </button>
                                            <button 
                                                className="btn btn-secondary btn-large"
                                                onClick={() => setCurrentView('login')}
                                            >
                                                <span>Se connecter</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                </AnimatedSection>
            </main>

            {/* Chatbot intégré */}
            <Chatbot />
            
            {/* Footer moderne */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-main">
                            <div className="footer-brand">
                                <h3>ActuarialMind</h3>
                                <p>L'intelligence artificielle au service de l'excellence financière et actuarielle</p>
                                <div className="social-links">
                                    <a href="#" aria-label="LinkedIn">💼</a>
                                    <a href="#" aria-label="Twitter">🐦</a>
                                    <a href="#" aria-label="GitHub">🔗</a>
                                </div>
                            </div>
                            
                            <div className="footer-links">
                                <div className="link-group">
                                    <h4>Solutions</h4>
                                    <a href="#services">Risk Management</a>
                                    <a href="#services">Compliance</a>
                                    <a href="#services">Actuarial Analysis</a>
                                    <a href="#services">Recommandations IA</a>
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
                                <p>&copy; 2024 Finance & Actuarial AI. Tous droits réservés.</p>
                                <div className="footer-meta">
                                    <span>🏢 Paris, France</span>
                                    <span>📧 contact@finance-actuarial.ai</span>
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