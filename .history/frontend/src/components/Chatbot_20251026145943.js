// ChatbotInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Trash2, 
  Moon, 
  Sun, 
  Plus,
  Bot, 
  User,
  Loader2,
  Download,
  Upload
} from 'lucide-react';
import './ChatbotInterface.css';

const ChatbotInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  // Charger les conversations sauvegardées au démarrage
  useEffect(() => {
    const savedConversations = localStorage.getItem('esg-chatbot-conversations');
    const savedTheme = localStorage.getItem('esg-chatbot-theme');
    
    if (savedConversations) {
      const convs = JSON.parse(savedConversations);
      setConversations(convs);
      if (convs.length > 0) {
        setCurrentConversationId(convs[0].id);
        setMessages(convs[0].messages);
      }
    }
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Sauvegarder les conversations
  useEffect(() => {
    localStorage.setItem('esg-chatbot-conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Sauvegarder le thème
  useEffect(() => {
    localStorage.setItem('esg-chatbot-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // Scroll vers le bas
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Créer une nouvelle conversation
  const createNewConversation = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: 'Nouvelle discussion',
      messages: [],
      createdAt: new Date().toISOString()
    };
    
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    setMessages([]);
  };

  // Supprimer une conversation
  const deleteConversation = (conversationId, e) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    if (currentConversationId === conversationId) {
      if (conversations.length > 1) {
        const remainingConvs = conversations.filter(conv => conv.id !== conversationId);
        setCurrentConversationId(remainingConvs[0].id);
        setMessages(remainingConvs[0].messages);
      } else {
        setCurrentConversationId(null);
        setMessages([]);
      }
    }
  };

  // Changer de conversation
  const switchConversation = (conversationId) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
    }
  };

  // Mettre à jour le titre de la conversation
  const updateConversationTitle = (conversationId, newTitle) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId ? { ...conv, title: newTitle } : conv
      )
    );
  };

  // Envoyer un message
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    // Si pas de conversation active, en créer une
    let conversationId = currentConversationId;
    if (!conversationId) {
      const newConv = {
        id: Date.now().toString(),
        title: inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : ''),
        messages: [userMessage],
        createdAt: new Date().toISOString()
      };
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      setMessages([userMessage]);
      conversationId = newConv.id;
    } else {
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      
      // Mettre à jour la conversation
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages: updatedMessages }
            : conv
        )
      );
    }

    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: inputMessage,
          conversation_id: conversationId
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la requête');
      }

      const data = await response.json();

      const botMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...messages, userMessage, botMessage];
      setMessages(finalMessages);

      // Mettre à jour la conversation avec la réponse
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                messages: finalMessages,
                title: conv.messages.length === 0 ? inputMessage.slice(0, 30) + (inputMessage.length > 30 ? '...' : '') : conv.title
              }
            : conv
        )
      );

    } catch (error) {
      console.error('Erreur:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true
      };

      const finalMessages = [...messages, userMessage, errorMessage];
      setMessages(finalMessages);

      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, messages: finalMessages }
            : conv
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Exporter une conversation
  const exportConversation = (conversationId) => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) return;

    const data = {
      ...conversation,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-esg-${conversationId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Importer une conversation
  const importConversation = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConv = JSON.parse(e.target.result);
        const newConversation = {
          ...importedConv,
          id: Date.now().toString(),
          importedAt: new Date().toISOString()
        };

        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        setMessages(newConversation.messages);
      } catch (error) {
        alert('Erreur lors de l\'import du fichier');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`chatbot-container ${theme}`}>
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button 
            className="new-chat-btn"
            onClick={createNewConversation}
          >
            <Plus size={16} />
            Nouvelle discussion
          </button>
          
          <div className="import-export">
            <input
              type="file"
              id="import-conversation"
              accept=".json"
              onChange={importConversation}
              style={{ display: 'none' }}
            />
            <label htmlFor="import-conversation" className="icon-btn" title="Importer">
              <Upload size={16} />
            </label>
          </div>
        </div>

        <div className="conversations-list">
          {conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`conversation-item ${
                currentConversationId === conversation.id ? 'active' : ''
              }`}
              onClick={() => switchConversation(conversation.id)}
            >
              <div className="conversation-content">
                <div className="conversation-title">
                  {conversation.title}
                </div>
                <div className="conversation-preview">
                  {conversation.messages.length > 0 
                    ? conversation.messages[conversation.messages.length - 1]?.content.slice(0, 50) + '...'
                    : 'Discussion vide'
                  }
                </div>
                <div className="conversation-meta">
                  {new Date(conversation.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
              
              <div className="conversation-actions">
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    exportConversation(conversation.id);
                  }}
                  title="Exporter"
                >
                  <Download size={14} />
                </button>
                <button
                  className="icon-btn delete-btn"
                  onClick={(e) => deleteConversation(conversation.id, e)}
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          
          {conversations.length === 0 && (
            <div className="empty-state">
              <Bot size={48} />
              <p>Aucune discussion</p>
              <small>Commencez une nouvelle conversation</small>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-content">
        <header className="chat-header">
          <button 
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>
          
          <div className="header-title">
            {currentConversationId 
              ? conversations.find(c => c.id === currentConversationId)?.title || 'Discussion ESG'
              : 'Assistant ESG'
            }
          </div>
          
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={`Passer en mode ${theme === 'light' ? 'sombre' : 'clair'}`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <Bot size={64} />
              <h2>Assistant ESG</h2>
              <p>Posez-moi des questions sur les données ESG extraites de vos documents</p>
              <div className="suggestions">
                <button 
                  className="suggestion-btn"
                  onClick={() => setInputMessage("Quelles sont les émissions de CO2 les plus élevées ?")}
                >
                  Quelles sont les émissions de CO2 les plus élevées ?
                </button>
                <button 
                  className="suggestion-btn"
                  onClick={() => setInputMessage("Compare les performances environnementales des entreprises")}
                >
                  Compare les performances environnementales des entreprises
                </button>
                <button 
                  className="suggestion-btn"
                  onClick={() => setInputMessage("Quels sont les KPIs sociaux extraits ?")}
                >
                  Quels sont les KPIs sociaux extraits ?
                </button>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className={`message ${message.role} ${message.isError ? 'error' : ''}`}>
                <div className="message-avatar">
                  {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="message assistant">
              <div className="message-avatar">
                <Bot size={20} />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <Loader2 size={16} className="spinner" />
                  <span>L'assistant rédige...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez votre question sur les données ESG..."
              rows="1"
              disabled={isLoading}
            />
            <button 
              className="send-btn"
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
            >
              {isLoading ? <Loader2 size={20} className="spinner" /> : <Send size={20} />}
            </button>
          </div>
          <div className="input-footer">
            <small>Assistant ESG - Basé sur Mistral via Ollama</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;