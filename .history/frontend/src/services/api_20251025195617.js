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
};

export default apiService;