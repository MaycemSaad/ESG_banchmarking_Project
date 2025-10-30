import axios from 'axios';

// Configuration séparée pour le chatbot (port 5001)
const CHATBOT_API_BASE_URL = 'http://127.0.0.1:5001/api';

const chatbotApi = axios.create({
  baseURL: CHATBOT_API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for large PDF processing
});

// Intercepteur pour les erreurs de réseau spécifique au chatbot
chatbotApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to chatbot server. Make sure the Flask chatbot server is running on port 5001.');
    }
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.error || `Chatbot server error: ${error.response.status}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to connect to chatbot server');
    } else {
      // Other error
      throw new Error('An unexpected error occurred with chatbot service');
    }
  }
);

// Configuration pour l'API principale (port 5000 - inchangée)
const MAIN_API_BASE_URL = 'http://127.0.0.1:5000/api';

const mainApi = axios.create({
  baseURL: MAIN_API_BASE_URL,
  timeout: 300000,
});

mainApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to main server. Make sure the main Flask server is running on port 5000.');
    }
    if (error.response) {
      throw new Error(error.response.data.error || `Main server error: ${error.response.status}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to main server');
    } else {
      throw new Error('An unexpected error occurred with main service');
    }
  }
);

export const apiService = {
  // =========================================================================
  // MÉTHODES POUR LE CHATBOT ESG (port 5001)
  // =========================================================================

  // Chat avec l'assistant ESG
  esgChat: (message, companyName = '', pdfData = null) => {
    return chatbotApi.post('/esg-chat', {
      message,
      company_name: companyName,
      pdf_data: pdfData
    });
  },

  // Upload de PDF pour analyse dans le chatbot
  uploadPDFForAnalysis: (pdfFile, kpiFile) => {
    const formData = new FormData();
    formData.append('pdf_file', pdfFile);
    formData.append('kpi_file', kpiFile);

    return chatbotApi.post('/chat-upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Statut du chatbot
  getChatbotStatus: () => chatbotApi.get('/chatbot-status'),

  // Benchmarking entre entreprises (chatbot)
  esgBenchmark: (companies) => {
    return chatbotApi.post('/esg-benchmark', {
      companies
    });
  },

  // Recommandations personnalisées (chatbot)
  esgRecommendations: (companyName) => {
    return chatbotApi.post('/esg-recommendations', {
      company_name: companyName
    });
  },

  // =========================================================================
  // MÉTHODES POUR L'API PRINCIPALE (port 5000 - inchangées)
  // =========================================================================

  // Health check
  healthCheck: () => mainApi.get('/health'),

  // Process PDF
  processPDF: (kpiFile, pdfFile, minConfidence = 0.3, rerunIfExists = false) => {
    const formData = new FormData();
    formData.append('kpi_file', kpiFile);
    formData.append('pdf_file', pdfFile);
    formData.append('min_confidence', minConfidence.toString());
    formData.append('rerun_if_exists', rerunIfExists.toString());

    return mainApi.post('/process', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get statistics
  getStatistics: () => mainApi.get('/statistics'),

  // Get dashboard data
  getDashboardData: (minConfidence = 0.3) => 
    mainApi.get('/dashboard', { 
      params: { min_confidence: minConfidence }
    }),

  // Get companies list
  getCompanies: () => mainApi.get('/companies'),

  // Get company data
  getCompanyData: (companyName, minConfidence = 0.3) =>
    mainApi.get(`/company/${encodeURIComponent(companyName)}`, {
      params: { min_confidence: minConfidence }
    }),

  // Get comparison data
  getComparisonData: (companies, compareBy = 'topic_fr', minConfidence = 0.3) => {
    const params = new URLSearchParams();
    companies.forEach(company => params.append('companies', company));
    params.append('compare_by', compareBy);
    params.append('min_confidence', minConfidence.toString());
    
    return mainApi.get('/comparison', { params });
  },

  // Export data
  exportCSV: () => 
    mainApi.get('/export/csv', { responseType: 'blob' }),

  exportExcel: () =>
    mainApi.get('/export/excel', { responseType: 'blob' }),

  exportCompanyData: (companyName, format = 'csv') =>
    mainApi.get(`/export/company/${encodeURIComponent(companyName)}`, {
      params: { format },
      responseType: 'blob'
    }),

  // =========================================================================
  // MÉTHODES DÉPRÉCIÉES OU ALTERNATIVES (maintenues pour compatibilité)
  // =========================================================================

  // Upload de PDF pour analyse spécifique (méthode alternative)
  uploadPDFForAnalysisLegacy: (pdfFile, companyName = '') => {
    const formData = new FormData();
    formData.append('file', pdfFile);
    if (companyName) {
      formData.append('company_name', companyName);
    }

    return mainApi.post('/upload-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Chat avec un PDF spécifique (méthode alternative)
  chatWithPDF: (message, fileId) => {
    return mainApi.post('/chat-with-pdf', {
      message,
      file_id: fileId
    });
  },

  // Recherche sémantique dans les données ESG
  semanticSearch: (query, topK = 5) => {
    return mainApi.post('/search', {
      query,
      top_k: topK
    });
  },

  // Diagnostic du système (pour le debug)
  debugVectorStore: () => mainApi.get('/debug-vector-store'),
  
  testDocumentSearch: (query, fileId) => {
    return mainApi.post('/test-document-search', {
      query,
      file_id: fileId
    });
  },

  forceReloadIndex: () => mainApi.post('/force-reload-index')
};

// Export séparé pour une utilisation spécifique si nécessaire
export const chatbotService = {
  esgChat: apiService.esgChat,
  uploadPDFForAnalysis: apiService.uploadPDFForAnalysis,
  getChatbotStatus: apiService.getChatbotStatus,
  esgBenchmark: apiService.esgBenchmark,
  esgRecommendations: apiService.esgRecommendations
};

export const mainApiService = {
  healthCheck: apiService.healthCheck,
  processPDF: apiService.processPDF,
  getStatistics: apiService.getStatistics,
  getDashboardData: apiService.getDashboardData,
  getCompanies: apiService.getCompanies,
  getCompanyData: apiService.getCompanyData,
  getComparisonData: apiService.getComparisonData,
  exportCSV: apiService.exportCSV,
  exportExcel: apiService.exportExcel,
  exportCompanyData: apiService.exportCompanyData
};

export default apiService;