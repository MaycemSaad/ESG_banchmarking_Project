import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for large PDF processing
});

// Intercepteur pour les requêtes
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data.error || 'Server error');
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
  processPDF: (kpiFile, pdfFile, minConfidence = 0.5, rerunIfExists = false) => {
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
  getDashboardData: (minConfidence = 0.5) => 
    api.get('/dashboard', { params: { min_confidence: minConfidence } }),

  // Get companies list
  getCompanies: () => api.get('/companies'),

  // Get company data
  getCompanyData: (companyName, minConfidence = 0.5) =>
    api.get(`/company/${encodeURIComponent(companyName)}`, {
      params: { min_confidence: minConfidence }
    }),

  // Get comparison data
  getComparisonData: (companies, compareBy = 'topic_fr', minConfidence = 0.5) =>
    api.get('/comparison', {
      params: {
        companies: companies,
        compare_by: compareBy,
        min_confidence: minConfidence
      }
    }),

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
};

export default apiService;