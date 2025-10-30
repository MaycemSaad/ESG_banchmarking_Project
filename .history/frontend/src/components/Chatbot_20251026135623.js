import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Plus, MessageSquare, Building, Zap, Upload, FileText } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pdfData, setPdfData] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Charger les entreprises disponibles
  useEffect(() => {
    loadCompanies();
    loadConversations();
  }, []);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startNewConversation = () => {
    const newConversationId = `conv_${Date.now()}`;
    const newConversation = {
      id: newConversationId,
      title: 'Nouvelle discussion',
      createdAt: new Date().toISOString(),
      messages: []
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
    setPdfData(null);
  };

  const selectConversation = (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
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
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const pdfFile = files[0];
    const kpiFile = files[1]; // Le deuxième fichier doit être le fichier KPI

    if (!pdfFile || !kpiFile) {
      alert('Veuillez sélectionner un fichier PDF et un fichier KPI');
      return;
    }

    if (pdfFile.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF valide');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('pdf_file', pdfFile);
      formData.append('kpi_file', kpiFile);

      // Simulation de progression (car l'upload réel ne fournit pas de progression)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await apiService.uploadPDFForAnalysis(pdfFile, kpiFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.data.success) {
        setPdfData(response.data.extracted_data);
        
        const uploadMessage = {
          id: Date.now(),
          type: 'system',
          content: `📄 Fichier PDF "${response.data.pdf_name}" analysé avec succès. ${response.data.kpis_extracted} indicateurs ESG extraits.`,
          timestamp: new Date().toISOString(),
          metadata: {
            pdfName: response.data.pdf_name,
            kpisExtracted: response.data.kpis_extracted,
            domains: response.data.summary?.domains || []
          }
        };

        setMessages(prev => [...prev, uploadMessage]);
        
        // Mettre à jour la conversation
        if (currentConversationId) {
          const updatedConversations = conversations.map(conv => {
            if (conv.id === currentConversationId) {
              return {
                ...conv,
                title: `Analyse: ${response.data.pdf_name}`,
                messages: [...conv.messages, uploadMessage]
              };
            }
            return conv;
          });
          setConversations(updatedConversations);
          saveConversations(updatedConversations);
        }
      }
    } catch (error) {
      console.error('Erreur upload PDF:', error);
      const errorMessage = {
        id: Date.now(),
        type: 'system',
        content: "❌ Erreur lors de l'analyse du PDF. Veuillez réessayer.",
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiService.esgChat(inputMessage, selectedCompany, pdfData);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        metadata: {
          company: response.data.company,
          aiUsed: response.data.ai_used,
          pdfDataIncluded: response.data.pdf_data_included
        }
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      if (currentConversationId) {
        const updatedConversations = conversations.map(conv => {
          if (conv.id === currentConversationId) {
            return {
              ...conv,
              title: conv.title === 'Nouvelle discussion' ? 
                inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '') : 
                conv.title,
              messages: finalMessages
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
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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

  const getQuickActions = () => [
    {
      label: "📊 Analyse ESG complète",
      prompt: "Analyse nos performances ESG globales et identifie nos points forts et axes d'amélioration",
      icon: "📊"
    },
    {
      label: "🏆 Benchmark sectoriel",
      prompt: "Comment se positionne notre entreprise par rapport aux standards du secteur ?",
      icon: "🏆"
    },
    {
      label: "💡 Recommandations stratégiques",
      prompt: "Quelles sont tes recommandations prioritaires pour améliorer notre score ESG ?",
      icon: "💡"
    },
    {
      label: "⚖️ Conformité réglementaire",
      prompt: "Évalue notre conformité aux réglementations ESG actuelles et futures",
      icon: "⚖️"
    },
    {
      label: "🌱 Performance environnementale",
      prompt: "Analyse détaillée de notre performance environnementale et propositions d'amélioration",
      icon: "🌱"
    },
    {
      label: "👥 Impact social",
      prompt: "Évalue notre impact social et nos pratiques RH",
      icon: "👥"
    }
  ];

  return (
    <div className={`chatbot-container ${darkMode ? 'dark' : 'light'}`}>
      <div className="chatbot-layout">
        {/* Sidebar des conversations */}
        <div className={`conversations-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              <MessageSquare size={20} />
              <h3>Historique des discussions</h3>
            </div>
            <div className="sidebar-actions">
              <button 
                className="new-chat-btn"
                onClick={startNewConversation}
                title="Nouvelle discussion"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="conversations-list">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className={`conversation-item ${
                  currentConversationId === conversation.id ? 'active' : ''
                }`}
                onClick={() => selectConversation(conversation.id)}
              >
                <div className="conversation-icon">
                  <MessageSquare size={14} />
                </div>
                <div className="conversation-content">
                  <span className="conversation-title">{conversation.title}</span>
                  <span className="conversation-date">
                    {new Date(conversation.createdAt).toLocaleDateString()}
                  </span>
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
            
            {conversations.length === 0 && (
              <div className="empty-conversations">
                <MessageSquare size={32} />
                <p>Aucune discussion</p>
                <button 
                  className="start-chat-btn"
                  onClick={startNewConversation}
                >
                  <Plus size={16} />
                  Nouvelle discussion
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
                  <h2>Assistant ESG Intelligence</h2>
                  <p>Analyste expert en données ESG</p>
                </div>
              </div>
            </div>
            
            <div className="header-right">
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
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.xlsx,.xls,.csv"
                multiple
                style={{ display: 'none' }}
              />
              
              <button 
                className="upload-btn"
                onClick={triggerFileInput}
                disabled={isUploading}
                title="Analyser un PDF"
              >
                <Upload size={16} />
                Analyser PDF
              </button>
            </div>
          </div>

          {/* Zone des messages */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-screen">
                <div className="welcome-header">
                  <div className="welcome-icon">
                    <Bot size={48} />
                    <div className="welcome-badge">
                      <Zap size={16} />
                      IA ESG
                    </div>
                  </div>
                  <h1>Bonjour ! 👋</h1>
                  <p className="welcome-subtitle">
                    Je suis votre assistant ESG intelligent. Analysez vos données, comparez vos performances et obtenez des recommandations personnalisées.
                  </p>
                </div>
                
                <div className="upload-section">
                  <div className="upload-card">
                    <div className="upload-icon">
                      <FileText size={32} />
                    </div>
                    <h3>Analyser un document PDF</h3>
                    <p>Importez vos rapports ESG pour une analyse approfondie</p>
                    <button 
                      className="upload-primary-btn"
                      onClick={triggerFileInput}
                      disabled={isUploading}
                    >
                      <Upload size={18} />
                      {isUploading ? 'Analyse en cours...' : 'Choisir un PDF + KPI'}
                    </button>
                    <div className="upload-info">
                      <small>Formats supportés: PDF • Excel • CSV</small>
                      <small>Sélectionnez le PDF et le fichier KPI correspondant</small>
                    </div>
                  </div>
                </div>
                
                <div className="quick-actions">
                  <h3>Ou démarrer une analyse</h3>
                  <div className="action-grid">
                    {getQuickActions().map((action, index) => (
                      <button
                        key={index}
                        className="action-card"
                        onClick={() => {
                          setInputMessage(action.prompt);
                          setTimeout(() => {
                            document.querySelector('.message-input')?.focus();
                          }, 100);
                        }}
                      >
                        <span className="action-icon">{action.icon}</span>
                        <span className="action-label">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.type} ${message.isError ? 'error' : ''}`}
                  >
                    <div className="message-avatar">
                      {message.type === 'user' ? 
                        <div className="avatar-user"><User size={18} /></div> : 
                        message.type === 'bot' ?
                        <div className="avatar-bot"><Bot size={18} /></div> :
                        <div className="avatar-system"><FileText size={18} /></div>
                      }
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-sender">
                          {message.type === 'user' ? 'Vous' : 
                           message.type === 'bot' ? 'Assistant ESG' : 'Système'}
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
                          {message.metadata.pdfName && (
                            <span className="message-pdf">
                              <FileText size={12} />
                              {message.metadata.pdfName}
                            </span>
                          )}
                          {message.metadata.kpisExtracted && (
                            <span className="message-kpis">
                              📊 {message.metadata.kpisExtracted} indicateurs
                            </span>
                          )}
                          {message.metadata.domains && message.metadata.domains.length > 0 && (
                            <span className="message-domains">
                              🏷️ {message.metadata.domains.join(', ')}
                            </span>
                          )}
                          {message.metadata.company && (
                            <span className="message-company">
                              <Building size={12} />
                              {message.metadata.company}
                            </span>
                          )}
                          {message.metadata.aiUsed && (
                            <span className="message-ai">🤖 Intelligence Artificielle</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isUploading && (
                  <div className="message system">
                    <div className="message-avatar">
                      <div className="avatar-system"><Upload size={18} /></div>
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-sender">Système</span>
                      </div>
                      <div className="upload-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">
                          Analyse du PDF en cours... {uploadProgress}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {isLoading && (
                  <div className="message bot">
                    <div className="message-avatar">
                      <div className="avatar-bot"><Bot size={18} /></div>
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-sender">Assistant ESG</span>
                      </div>
                      <div className="typing-indicator">
                        <div className="typing-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                        <span className="typing-text">
                          {esg_chatbot?.ollama_available ? "Analyse avec Mistral..." : "Analyse en cours..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Zone de saisie */}
          <div className="input-container">
            <div className="input-wrapper">
              <div className="input-field">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Posez votre question sur les données ESG..."
                  rows="1"
                  className="message-input"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="send-button"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="input-footer">
                <div className="input-actions">
                  <button 
                    className="upload-small-btn"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    title="Analyser un PDF"
                  >
                    <Upload size={14} />
                    Analyser PDF
                  </button>
                </div>
                <span className="ai-status">
                  <Zap size={14} />
                  Assistant ESG • {pdfData ? `${pdfData.length} indicateurs chargés` : 'Posez des questions sur vos données'}
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