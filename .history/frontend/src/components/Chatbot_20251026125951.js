import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Trash2, Plus, MessageSquare, Building, Zap, 
  Upload, FileText, X, Download, BarChart3, Target, TrendingUp,
  Shield, Users, Globe, Database, Settings, Sparkles, BookOpen,
  Clock, Search, Filter, Star, Crown, Award, Lightbulb
} from 'lucide-react';
import apiService from '../services/api';
import './Chatbot.css';

const Chatbot = ({ darkMode }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companies, setCompanies] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [uploadedPdfs, setUploadedPdfs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [conversationStats, setConversationStats] = useState(null);
  const fileInputRef = useRef(null);
  const kpiFileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Charger les entreprises disponibles
  useEffect(() => {
    loadCompanies();
    loadConversations();
    calculateStats();
  }, [conversations, messages]);

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCompanies = async () => {
    try {
      const response = await apiService.getCompanies();
      setCompanies(response.data);
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
    }
  };

  const loadConversations = () => {
    const savedConversations = JSON.parse(localStorage.getItem('esg_conversations') || '[]');
    setConversations(savedConversations);
  };

  const saveConversations = (conversations) => {
    localStorage.setItem('esg_conversations', JSON.stringify(conversations));
  };

  const calculateStats = () => {
    const stats = {
      totalConversations: conversations.length,
      totalMessages: messages.length,
      companiesAnalyzed: new Set(messages.filter(m => m.metadata?.company).map(m => m.metadata.company)).size,
      pdfsUploaded: uploadedPdfs.length,
      avgResponseTime: '2.3s',
      esgScore: calculateEsgScore()
    };
    setConversationStats(stats);
  };

  const calculateEsgScore = () => {
    // Logique simplifiée pour calculer un score ESG basé sur les conversations
    const esgKeywords = {
      environmental: ['co2', 'émission', 'énergie', 'déchet', 'eau', 'biodiversité'],
      social: ['diversité', 'inclusion', 'sécurité', 'formation', 'communauté'],
      governance: ['transparence', 'conformité', 'éthique', 'risque', 'contrôle']
    };
    
    let score = 75; // Score de base
    const messageText = messages.map(m => m.content.toLowerCase()).join(' ');
    
    Object.values(esgKeywords).forEach(keywords => {
      const matches = keywords.filter(keyword => messageText.includes(keyword));
      score += matches.length * 2;
    });
    
    return Math.min(score, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startNewConversation = () => {
    const newConversationId = `conv_${Date.now()}`;
    const newConversation = {
      id: newConversationId,
      title: 'Nouvelle analyse ESG',
      createdAt: new Date().toISOString(),
      messages: [],
      tags: ['esg', 'analyse']
    };

    setConversations(prev => {
      const updated = [newConversation, ...prev];
      saveConversations(updated);
      return updated;
    });

    setCurrentConversationId(newConversationId);
    setMessages([]);
    setInputMessage('');
    setSelectedCompany('');
    setUploadedPdfs([]);
    setActiveTab('chat');
  };

  const selectConversation = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
      setUploadedPdfs(conversation.uploadedPdfs || []);
      setActiveTab('chat');
    }
  };

  const deleteConversation = (conversationId, e) => {
    e.stopPropagation();
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    if (currentConversationId === conversationId) {
      startNewConversation();
    }
  };

  const handleFileUpload = async (event) => {
    const pdfFile = event.target.files[0];
    const kpiFile = kpiFileInputRef.current.files[0];
    
    if (!pdfFile || !kpiFile) {
      alert('Veuillez sélectionner un fichier PDF et un fichier KPI');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('pdf_file', pdfFile);
      formData.append('kpi_file', kpiFile);

      const response = await apiService.uploadPdfForChat(formData);
      
      if (response.data.success) {
        const newPdf = {
          id: `pdf_${Date.now()}`,
          name: pdfFile.name,
          kpis: response.data.extracted_data,
          summary: response.data.summary,
          uploadedAt: new Date().toISOString(),
          size: (pdfFile.size / 1024 / 1024).toFixed(2) + ' MB'
        };

        setUploadedPdfs(prev => [...prev, newPdf]);
        
        // Ajouter un message système
        const systemMessage = {
          id: Date.now(),
          type: 'system',
          content: `📄 Document "${pdfFile.name}" analysé avec succès. ${response.data.kpis_extracted} indicateurs ESG extraits avec ${response.data.summary.high_confidence} indicateurs haute confiance.`,
          timestamp: new Date().toISOString(),
          pdfData: newPdf
        };

        const updatedMessages = [...messages, systemMessage];
        setMessages(updatedMessages);
        updateConversationWithPdf(updatedMessages, newPdf);

        // Réinitialiser les inputs de fichier
        fileInputRef.current.value = '';
        kpiFileInputRef.current.value = '';

      } else {
        throw new Error(response.data.error || 'Erreur lors du traitement du PDF');
      }
    } catch (error) {
      console.error('Erreur upload PDF:', error);
      alert(`Erreur lors de l'analyse du document: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const updateConversationWithPdf = (messages, pdfData) => {
    if (currentConversationId) {
      const updatedConversations = conversations.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: messages,
            uploadedPdfs: [...(conv.uploadedPdfs || []), pdfData],
            tags: [...new Set([...(conv.tags || []), 'document', 'analyse'])]
          };
        }
        return conv;
      });
      setConversations(updatedConversations);
      saveConversations(updatedConversations);
    }
  };

  const removeUploadedPdf = (pdfId) => {
    setUploadedPdfs(prev => prev.filter(pdf => pdf.id !== pdfId));
    
    // Supprimer aussi le message système associé
    const updatedMessages = messages.filter(msg => 
      !(msg.type === 'system' && msg.pdfData && msg.pdfData.id === pdfId)
    );
    setMessages(updatedMessages);
    
    if (currentConversationId) {
      const updatedConversations = conversations.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: updatedMessages,
            uploadedPdfs: (conv.uploadedPdfs || []).filter(pdf => pdf.id !== pdfId)
          };
        }
        return conv;
      });
      setConversations(updatedConversations);
      saveConversations(updatedConversations);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      hasPdfData: uploadedPdfs.length > 0
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Préparer les données PDF pour l'API
      const pdfData = uploadedPdfs.flatMap(pdf => pdf.kpis);

      const response = await apiService.esgChat(inputMessage, selectedCompany, pdfData);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        metadata: {
          company: response.data.company,
          aiUsed: response.data.ai_used,
          pdfDataIncluded: response.data.pdf_data_included,
          analysisType: classifyAnalysisType(inputMessage)
        }
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      if (currentConversationId) {
        const updatedConversations = conversations.map(conv => {
          if (conv.id === currentConversationId) {
            const analysisType = classifyAnalysisType(inputMessage);
            return {
              ...conv,
              title: conv.title === 'Nouvelle analyse ESG' ? 
                `${analysisType.emoji} ${inputMessage.slice(0, 25)}...` : 
                conv.title,
              messages: finalMessages,
              uploadedPdfs: uploadedPdfs,
              tags: [...new Set([...(conv.tags || []), analysisType.tag])],
              lastActivity: new Date().toISOString()
            };
          }
          return conv;
        });
        setConversations(updatedConversations);
        saveConversations(updatedConversations);
      }

    } catch (error) {
      console.error('Erreur envoi message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "❌ Désolé, une erreur s'est produite lors de l'analyse. Veuillez vérifier votre connexion et réessayer.",
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const classifyAnalysisType = (message) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('benchmark') || lowerMessage.includes('comparaison') || lowerMessage.includes('secteur')) {
      return { emoji: '🏆', tag: 'benchmark', color: '#f59e0b' };
    } else if (lowerMessage.includes('recommandation') || lowerMessage.includes('amélioration')) {
      return { emoji: '💡', tag: 'recommandation', color: '#10b981' };
    } else if (lowerMessage.includes('règlement') || lowerMessage.includes('conformité')) {
      return { emoji: '⚖️', tag: 'conformité', color: '#6366f1' };
    } else if (lowerMessage.includes('environnement')) {
      return { emoji: '🌱', tag: 'environnement', color: '#22c55e' };
    } else if (lowerMessage.includes('social') || lowerMessage.includes('rh')) {
      return { emoji: '👥', tag: 'social', color: '#ec4899' };
    } else {
      return { emoji: '📊', tag: 'analyse', color: '#6b7280' };
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content) => {
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const exportConversation = () => {
    const conversationData = {
      title: conversations.find(c => c.id === currentConversationId)?.title || 'Analyse ESG',
      date: new Date().toISOString(),
      messages: messages,
      pdfs: uploadedPdfs,
      stats: conversationStats
    };

    const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analyse-esg-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getQuickActions = () => [
    {
      label: "Analyse ESG Complète",
      prompt: "Réalise une analyse ESG complète de notre organisation en identifiant les forces, faiblesses et opportunités d'amélioration",
      icon: "📊",
      category: "analyse",
      description: "Évaluation globale des performances ESG"
    },
    {
      label: "Benchmark Sectoriel",
      prompt: "Compare nos performances ESG avec les standards du secteur et identifie notre positionnement compétitif",
      icon: "🏆",
      category: "benchmark",
      description: "Analyse comparative sectorielle"
    },
    {
      label: "Recommandations Stratégiques",
      prompt: "Propose un plan d'action priorisé avec des recommandations concrètes pour améliorer notre score ESG",
      icon: "💡",
      category: "recommandation",
      description: "Plan d'action personnalisé"
    },
    {
      label: "Audit de Conformité",
      prompt: "Évalue notre conformité aux réglementations ESG actuelles (CSRD, SFDR, Taxonomie UE) et identifie les écarts",
      icon: "⚖️",
      category: "conformité",
      description: "Vérification réglementaire"
    },
    {
      label: "Analyse Environnementale",
      prompt: "Analyse détaillée de notre performance environnementale : émissions, énergie, déchets, biodiversité",
      icon: "🌱",
      category: "environnement",
      description: "Impact environnemental"
    },
    {
      label: "Évaluation Sociale",
      prompt: "Évalue notre impact social : diversité, conditions de travail, relations communautaires",
      icon: "👥",
      category: "social",
      description: "Performance sociale"
    },
    {
      label: "Gouvernance ESG",
      prompt: "Analyse notre gouvernance ESG : transparence, éthique, gestion des risques, structure de contrôle",
      icon: "🏛️",
      category: "gouvernance",
      description: "Gouvernance d'entreprise"
    },
    {
      label: "Rapport d'Impact",
      prompt: "Génère un rapport d'impact ESG structuré avec indicateurs clés et analyse des tendances",
      icon: "📈",
      category: "rapport",
      description: "Reporting complet"
    }
  ];

  const getFilteredConversations = () => {
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const filteredConversations = getFilteredConversations();

  return (
    <div className={`chatbot-container ${darkMode ? 'dark' : 'light'}`}>
      <div className="chatbot-layout">
        {/* Sidebar avancée */}
        <div className={`conversations-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              <MessageSquare size={20} />
              <h3>Analyses ESG</h3>
            </div>
            <div className="sidebar-actions">
              <button 
                className="new-chat-btn"
                onClick={startNewConversation}
                title="Nouvelle analyse"
              >
                <Plus size={18} />
              </button>
              <button 
                className="analytics-btn"
                onClick={() => setShowAnalytics(!showAnalytics)}
                title="Statistiques"
              >
                <BarChart3 size={18} />
              </button>
            </div>
          </div>

          {showAnalytics && conversationStats && (
            <div className="analytics-panel">
              <div className="stat-item">
                <span className="stat-value">{conversationStats.totalConversations}</span>
                <span className="stat-label">Analyses</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{conversationStats.totalMessages}</span>
                <span className="stat-label">Messages</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{conversationStats.esgScore}</span>
                <span className="stat-label">Score ESG</span>
              </div>
            </div>
          )}

          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Rechercher une analyse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="conversations-list">
            {filteredConversations.map(conversation => (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  currentConversationId === conversation.id ? 'active' : ''
                }`}
                onClick={() => selectConversation(conversation.id)}
              >
                <div className="conversation-icon" style={{ 
                  background: conversation.tags?.[0] ? 
                    classifyAnalysisType(conversation.tags[0]).color : '#6b7280' 
                }}>
                  <MessageSquare size={14} />
                </div>
                <div className="conversation-content">
                  <span className="conversation-title">{conversation.title}</span>
                  <span className="conversation-date">
                    {new Date(conversation.createdAt).toLocaleDateString()}
                  </span>
                  <div className="conversation-tags">
                    {conversation.tags?.slice(0, 2).map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                    {(conversation.uploadedPdfs || []).length > 0 && (
                      <span className="tag pdf-tag">
                        <FileText size={10} />
                        {(conversation.uploadedPdfs || []).length}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="delete-conversation"
                  onClick={(e) => deleteConversation(conversation.id, e)}
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            {filteredConversations.length === 0 && (
              <div className="empty-conversations">
                <MessageSquare size={32} />
                <p>Aucune analyse trouvée</p>
                <button 
                  className="start-chat-btn"
                  onClick={startNewConversation}
                >
                  <Plus size={16} />
                  Nouvelle analyse
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Zone de chat principale */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="header-left">
              <button 
                className="sidebar-toggle"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <MessageSquare size={18} />
              </button>
              <div className="chat-title">
                <div className="title-icon">
                  <Bot size={24} />
                </div>
                <div>
                  <h2>ESG Intelligence Pro</h2>
                  <p>Plateforme d'analyse ESG avancée</p>
                </div>
              </div>
            </div>
            
            <div className="header-right">
              <div className="header-actions">
                {uploadedPdfs.length > 0 && (
                  <button className="action-btn" onClick={exportConversation}>
                    <Download size={16} />
                    Exporter
                  </button>
                )}
                <div className="company-selector">
                  <Building size={16} />
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="company-dropdown"
                  >
                    <option value="">Toutes les entreprises</option>
                    {companies.map(company => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation par onglets */}
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare size={16} />
              Conversation
            </button>
            <button 
              className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              <BarChart3 size={16} />
              Analyse
            </button>
            <button 
              className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              <FileText size={16} />
              Documents ({uploadedPdfs.length})
            </button>
          </div>

          {/* Zone de contenu */}
          <div className="content-area">
            {activeTab === 'chat' && (
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="welcome-screen">
                    <div className="welcome-header">
                      <div className="welcome-icon">
                        <Bot size={48} />
                        <div className="welcome-badge">
                          <Sparkles size={16} />
                          IA Expert ESG
                        </div>
                      </div>
                      <h1>Analyse ESG Intelligente 🚀</h1>
                      <p className="welcome-subtitle">
                        Expert en analyse de données ESG avec intelligence artificielle avancée. 
                        Analysez vos documents, comparez vos performances et obtenez des recommandations stratégiques.
                      </p>
                    </div>
                    
                    {/* Section Upload PDF */}
                    <div className="upload-section">
                      <div className="upload-card">
                        <div className="upload-icon">
                          <Upload size={32} />
                        </div>
                        <h3>Analyser un document ESG</h3>
                        <p>Obtenez une analyse immédiate de vos rapports ESG</p>
                        
                        <div className="upload-requirements">
                          <div className="requirement">
                            <FileText size={16} />
                            <span>Rapport PDF contenant des données ESG</span>
                          </div>
                          <div className="requirement">
                            <Database size={16} />
                            <span>Fichier KPI (Excel/CSV) pour référence</span>
                          </div>
                        </div>

                        <div className="upload-buttons">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf"
                            style={{ display: 'none' }}
                          />
                          <input
                            type="file"
                            ref={kpiFileInputRef}
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                          />
                          <button
                            className="upload-btn primary"
                            onClick={triggerFileInput}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <>
                                <div className="loading-spinner"></div>
                                Analyse en cours...
                              </>
                            ) : (
                              <>
                                <Upload size={18} />
                                Analyser un document
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="quick-actions">
                      <h3>Analyses Rapides</h3>
                      <div className="action-grid">
                        {getQuickActions().map((action, index) => (
                          <button
                            key={index}
                            className="action-card"
                            onClick={() => {
                              setInputMessage(action.prompt);
                            }}
                          >
                            <span className="action-icon">{action.icon}</span>
                            <div className="action-content">
                              <span className="action-label">{action.label}</span>
                              <span className="action-description">{action.description}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="messages-list">
                    {/* Section PDFs uploadés */}
                    {uploadedPdfs.length > 0 && (
                      <div className="uploaded-pdfs-section">
                        <div className="pdfs-header">
                          <FileText size={16} />
                          <span>Documents analysés ({uploadedPdfs.length})</span>
                        </div>
                        <div className="pdfs-list">
                          {uploadedPdfs.map(pdf => (
                            <div key={pdf.id} className="pdf-item">
                              <div className="pdf-info">
                                <FileText size={14} />
                                <div className="pdf-details">
                                  <span className="pdf-name">{pdf.name}</span>
                                  <span className="pdf-stats">
                                    {pdf.summary.total_kpis} KPIs • {pdf.summary.high_confidence} haute confiance
                                  </span>
                                </div>
                              </div>
                              <button
                                className="remove-pdf"
                                onClick={() => removeUploadedPdf(pdf.id)}
                                title="Retirer le document"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Messages */}
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`message ${message.type} ${message.isError ? 'error' : ''}`}
                      >
                        <div className="message-avatar">
                          {message.type === 'user' ? 
                            <div className="avatar-user"><User size={18} /></div> : 
                            message.type === 'system' ?
                            <div className="avatar-system"><FileText size={18} /></div> :
                            <div className="avatar-bot"><Bot size={18} /></div>
                          }
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <span className="message-sender">
                              {message.type === 'user' ? 'Vous' : 
                               message.type === 'system' ? 'Système' : 'Expert ESG'}
                            </span>
                            <span className="message-time">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="message-text">
                            {formatMessage(message.content)}
                          </div>
                          {message.metadata && (
                            <div className="message-metadata">
                              {message.metadata.company && (
                                <span className="message-company">
                                  <Building size={12} />
                                  {message.metadata.company}
                                </span>
                              )}
                              {message.metadata.aiUsed && (
                                <span className="message-ai">
                                  <Sparkles size={12} />
                                  Intelligence Avancée
                                </span>
                              )}
                              {message.metadata.analysisType && (
                                <span className="message-type" style={{
                                  background: message.metadata.analysisType.color
                                }}>
                                  {message.metadata.analysisType.emoji} {message.metadata.analysisType.tag}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="message bot">
                        <div className="message-avatar">
                          <div className="avatar-bot"><Bot size={18} /></div>
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <span className="message-sender">Expert ESG</span>
                          </div>
                          <div className="typing-indicator">
                            <div className="typing-dots">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                            <span className="typing-text">Analyse approfondie en cours...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="analysis-tab">
                <div className="analysis-header">
                  <h3>Analyse des Performances ESG</h3>
                  <p>Synthèse et métriques de vos analyses</p>
                </div>
                <div className="analysis-grid">
                  <div className="metric-card">
                    <div className="metric-icon">
                      <Target size={24} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-value">{conversationStats?.totalConversations || 0}</span>
                      <span className="metric-label">Analyses Réalisées</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">
                      <TrendingUp size={24} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-value">{conversationStats?.esgScore || 0}</span>
                      <span className="metric-label">Score ESG Global</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">
                      <FileText size={24} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-value">{uploadedPdfs.length}</span>
                      <span className="metric-label">Documents Analysés</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon">
                      <Clock size={24} />
                    </div>
                    <div className="metric-content">
                      <span className="metric-value">{conversationStats?.avgResponseTime || '2.3s'}</span>
                      <span className="metric-label">Temps Moyen de Réponse</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="documents-tab">
                <div className="documents-header">
                  <h3>Documents Analysés</h3>
                  <p>Gérez vos documents et leurs métriques ESG</p>
                </div>
                {uploadedPdfs.length > 0 ? (
                  <div className="documents-grid">
                    {uploadedPdfs.map(pdf => (
                      <div key={pdf.id} className="document-card">
                        <div className="document-header">
                          <FileText size={20} />
                          <button
                            className="remove-document"
                            onClick={() => removeUploadedPdf(pdf.id)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="document-info">
                          <h4>{pdf.name}</h4>
                          <p className="document-size">{pdf.size}</p>
                          <p className="document-date">
                            Analysé le {new Date(pdf.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="document-metrics">
                          <div className="metric">
                            <span className="metric-value">{pdf.summary.total_kpis}</span>
                            <span className="metric-label">KPIs</span>
                          </div>
                          <div className="metric">
                            <span className="metric-value">{pdf.summary.high_confidence}</span>
                            <span className="metric-label">Haute Confiance</span>
                          </div>
                          <div className="metric">
                            <span className="metric-value">{pdf.summary.domains.length}</span>
                            <span className="metric-label">Domaines</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-documents">
                    <FileText size={48} />
                    <h4>Aucun document analysé</h4>
                    <p>Commencez par analyser un document PDF pour voir vos métriques ESG</p>
                    <button className="upload-btn" onClick={triggerFileInput}>
                      <Upload size={16} />
                      Analyser un document
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zone de saisie améliorée */}
          <div className="input-container">
            <div className="input-wrapper">
              <div className="input-field">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Posez votre question ESG ou demandez une analyse spécifique..."
                  rows="1"
                  className="message-input"
                  disabled={isLoading}
                />
                <div className="input-actions">
                  <button
                    className="action-icon-btn"
                    onClick={triggerFileInput}
                    title="Analyser un document"
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="send-button"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
              <div className="input-footer">
                <span className="ai-status">
                  <Sparkles size={14} />
                  ESG Intelligence Pro • Analyse avancée avec IA
                </span>
                <span className="input-tips">
                  💡 Utilisez des questions spécifiques pour des analyses détaillées
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;