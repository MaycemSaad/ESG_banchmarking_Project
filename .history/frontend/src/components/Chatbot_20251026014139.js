import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, Plus, MessageSquare } from 'lucide-react';
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
    // Pour l'instant, on simule des conversations
    // Plus tard, vous pourrez les stocker dans localStorage ou une base de données
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

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    // Ajouter le message utilisateur
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Appeler l'API du chatbot ESG
      const response = await apiService.esgChat(inputMessage, selectedCompany);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.response,
        timestamp: new Date().toISOString(),
        metadata: {
          company: response.data.company,
          aiUsed: response.data.ai_used
        }
      };

      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      // Mettre à jour la conversation
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
    // Convertir les retours à la ligne en <br />
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const getQuickActions = () => [
    {
      label: "Analyser nos performances ESG",
      prompt: "Analyse nos performances ESG globales et identifie nos points forts et axes d'amélioration"
    },
    {
      label: "Comparer avec le secteur",
      prompt: "Comment se positionne notre entreprise par rapport aux standards du secteur ?"
    },
    {
      label: "Recommandations d'amélioration",
      prompt: "Quelles sont tes recommandations prioritaires pour améliorer notre score ESG ?"
    },
    {
      label: "Rapport de conformité",
      prompt: "Évalue notre conformité aux réglementations ESG actuelles et futures"
    }
  ];

  return (
    <div className={`chatbot-container ${darkMode ? 'dark' : 'light'}`}>
      <div className="chatbot-layout">
        {/* Sidebar des conversations */}
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h3>Discussions ESG</h3>
            <button 
              className="new-chat-btn"
              onClick={startNewConversation}
              title="Nouvelle discussion"
            >
              <Plus size={18} />
            </button>
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
                <MessageSquare size={16} />
                <span className="conversation-title">{conversation.title}</span>
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
                <MessageSquare size={24} />
                <p>Aucune discussion</p>
                <button 
                  className="start-chat-btn"
                  onClick={startNewConversation}
                >
                  Commencer une discussion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Zone de chat principale */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="header-left">
              <Bot size={20} />
              <h2>Assistant ESG</h2>
            </div>
            
            <div className="company-selector">
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

          {/* Zone des messages */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-screen">
                <div className="welcome-icon">
                  <Bot size={48} />
                </div>
                <h3>Bonjour ! Je suis votre assistant ESG</h3>
                <p>Posez-moi des questions sur vos données ESG, demandez une analyse comparative ou des recommandations d'amélioration.</p>
                
                <div className="quick-actions">
                  <h4>Actions rapides :</h4>
                  <div className="action-buttons">
                    {getQuickActions().map((action, index) => (
                      <button
                        key={index}
                        className="action-btn"
                        onClick={() => {
                          setInputMessage(action.prompt);
                        }}
                      >
                        {action.label}
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
                      {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div className="message-content">
                      <div className="message-text">
                        {formatMessage(message.content)}
                      </div>
                      <div className="message-timestamp">
                        {new Date(message.timestamp).toLocaleTimeString()}
                        {message.metadata?.company && (
                          <span className="message-company">
                            • {message.metadata.company}
                          </span>
                        )}
                        {message.metadata?.aiUsed && (
                          <span className="message-ai">• 🤖 IA</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="message bot">
                    <div className="message-avatar">
                      <Bot size={16} />
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
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
                    <span className="ai-status">
        🤖 Assistant ESG
        </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;