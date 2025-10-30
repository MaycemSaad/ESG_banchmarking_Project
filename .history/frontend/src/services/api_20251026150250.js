import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for large PDF processing
});

// Intercepteur pour les erreurs de réseau
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to backend server. Make sure the Flask server is running on port 5000.');
    }
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.error || `Server error: ${error.response.status}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to connect to server');
    } else {
      // Other error
      throw new Error('An unexpected error occurred');
    }
  }
);

export const apiService = {
  // Health check
  healthCheck: () => api.get('/health'),

  // Process PDF
  processPDF: (kpiFile, pdfFile, minConfidence = 0.3, rerunIfExists = false) => {
    const formData = new FormData();
    formData.append('kpi_file', kpiFile);
    formData.append('pdf_file', pdfFile);
    formData.append('min_confidence', minConfidence.toString());
    formData.append('rerun_if_exists', rerunIfExists.toString());

    return api.post('/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get statistics
  getStatistics: () => api.get('/statistics'),

  // Get dashboard data
  getDashboardData: (minConfidence = 0.3) => 
    api.get('/dashboard', { 
      params: { min_confidence: minConfidence }
    }),

  // Get companies list
  getCompanies: () => api.get('/companies'),

  // Get company data
  getCompanyData: (companyName, minConfidence = 0.3) =>
    api.get(`/company/${encodeURIComponent(companyName)}`, {
      params: { min_confidence: minConfidence }
    }),

  // Get comparison data
  getComparisonData: (companies, compareBy = 'topic_fr', minConfidence = 0.3) => {
    const params = new URLSearchParams();
    companies.forEach(company => params.append('companies', company));
    params.append('compare_by', compareBy);
    params.append('min_confidence', minConfidence.toString());
    
    return api.get('/comparison', { params });
  },

  // Export data
  exportCSV: () => 
    api.get('/export/csv', { responseType: 'blob' }),

  exportExcel: () =>
    api.get('/export/excel', { responseType: 'blob' }),

  exportCompanyData: (companyName, format = 'csv') =>
    api.get(`/export/company/${encodeURIComponent(companyName)}`, {
      params: { format },
      responseType: 'blob'
    }),

  // =========================================================================
  // CORRECTIONS POUR LE CHATBOT ESG - ENDPOINTS CORRECTS
  // =========================================================================

  // Chat avec l'assistant ESG - CORRIGÉ
  esgChat: (question, conversationId = null) => {
    const payload = {
      question: question
    };
    
    if (conversationId) {
      payload.conversation_id = conversationId;
    }

    return api.post('/chatbot/chat', payload);
  },

  // Obtenir les modèles disponibles - CORRIGÉ
  getChatbotModels: () => api.get('/chatbot/models'),

  // Obtenir le contexte du chatbot - CORRIGÉ
  getChatbotContext: () => api.get('/chatbot/context'),

  // Vérifier le statut du chatbot - CORRIGÉ
  getChatbotStatus: () => api.get('/health'), // Utilise le health check existant

  // Benchmarking entre entreprises - NOUVEAU (si vous voulez l'implémenter)
  esgBenchmark: (companies, kpiType = 'environmental') => {
    return api.post('/chatbot/benchmark', {
      companies,
      kpi_type: kpiType
    });
  },

  // Analyse comparative détaillée - NOUVEAU (si vous voulez l'implémenter)
  detailedComparison: (company1, company2) => {
    return api.post('/chatbot/compare', {
      company1,
      company2
    });
  },

  // Recommandations personnalisées - NOUVEAU (si vous voulez l'implémenter)
  esgRecommendations: (companyName, focusArea = 'all') => {
    return api.post('/chatbot/recommendations', {
      company_name: companyName,
      focus_area: focusArea
    });
  },

  // Recherche sémantique dans les données ESG - CORRIGÉ
  semanticSearch: (query, topK = 5) => {
    return api.post('/chatbot/search', {
      query,
      top_k: topK
    });
  },

  // Analyse de tendances - NOUVEAU (si vous voulez l'implémenter)
  trendAnalysis: (timeframe = 'all') => {
    return api.post('/chatbot/trends', {
      timeframe
    });
  },

  // Gestion des conversations (si vous implémentez la persistance côté serveur)
  getConversations: () => api.get('/chatbot/conversations'),
  
  deleteConversation: (conversationId) => 
    api.delete(`/chatbot/conversations/${conversationId}`),
  
  updateConversation: (conversationId, updates) =>
    api.put(`/chatbot/conversations/${conversationId}`, updates),

  // Upload de PDF pour analyse spécifique (optionnel)
  uploadPDFForAnalysis: (pdfFile, companyName = '') => {
    const formData = new FormData();
    formData.append('file', pdfFile);
    if (companyName) {
      formData.append('company_name', companyName);
    }

    return api.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Diagnostic du système (pour le debug)
  debugVectorStore: () => api.get('/debug-vector-store'),
  
  testDocumentSearch: (query, fileId) => {
    return api.post('/test-document-search', {
      query,
      file_id: fileId
    });
  },

  forceReloadIndex: () => api.post('/force-reload-index'),

  // =========================================================================
  // MÉTHODES UTILITAIRES POUR LE FRONTEND
  // =========================================================================

  // Télécharger les données pour le contexte du chatbot
  downloadChatbotData: async () => {
    try {
      const [stats, companies, dashboard] = await Promise.all([
        this.getStatistics(),
        this.getCompanies(),
        this.getDashboardData()
      ]);
      
      return {
        statistics: stats.data,
        companies: companies.data,
        dashboard: dashboard.data
      };
    } catch (error) {
      console.error('Error downloading chatbot data:', error);
      throw error;
    }
  },

  // Vérifier la connexion Ollama
  checkOllamaConnection: async () => {
    try {
      const response = await this.getChatbotStatus();
      return {
        connected: true,
        status: response.data
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  },

  // Générer des suggestions de questions basées sur les données disponibles
  generateQuestionSuggestions: async () => {
    try {
      const data = await this.downloadChatbotData();
      const suggestions = [];
      
      if (data.statistics.total_kpis > 0) {
        suggestions.push(
          "Quels sont les KPIs environnementaux les plus fréquents ?",
          "Quelle entreprise a le plus de données ESG extraites ?",
          "Quels sont les domaines ESG les mieux couverts ?"
        );
      }
      
      if (data.companies.length > 1) {
        suggestions.push(
          "Compare les performances ESG des différentes entreprises",
          "Quelle entreprise a les meilleures pratiques environnementales ?",
          "Quelles sont les tendances communes entre les entreprises ?"
        );
      }
      
      if (data.dashboard.metrics && data.dashboard.metrics.unique_topics > 0) {
        suggestions.push(
          "Donne-moi un résumé des données ESG disponibles",
          "Quels sont les sujets les plus abordés dans les rapports ?",
          "Y a-t-il des domaines ESG manquants dans l'analyse ?"
        );
      }
      
      // Suggestions par défaut si peu de données
      if (suggestions.length === 0) {
        suggestions.push(
          "Qu'est-ce que l'analyse ESG ?",
          "Comment extraire des KPIs de documents PDF ?",
          "Quels sont les indicateurs ESG les plus importants ?"
        );
      }
      
      return suggestions.slice(0, 6); // Retourne max 6 suggestions
    } catch (error) {
      // Retourne des suggestions par défaut en cas d'erreur
      return [
        "Qu'est-ce que l'analyse ESG ?",
        "Comment fonctionne l'extraction de KPIs ?",
        "Quels types de données ESG peut-on extraire ?",
        "Comment comparer les performances ESG ?",
        "Quels sont les indicateurs environnementaux clés ?",
        "Comment améliorer le reporting ESG ?"
      ];
    }
  }
};

// Hook personnalisé pour le chatbot (si vous utilisez React)
export const useChatbot = () => {
  const sendMessage = async (message, conversationId = null) => {
    try {
      const response = await apiService.esgChat(message, conversationId);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const getContext = async () => {
    try {
      const response = await apiService.getChatbotContext();
      return {
        success: true,
        context: response.data.context
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const checkStatus = async () => {
    try {
      const response = await apiService.getChatbotStatus();
      return {
        success: true,
        status: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  return {
    sendMessage,
    getContext,
    checkStatus,
    generateSuggestions: apiService.generateQuestionSuggestions
  };
};

export default apiService;