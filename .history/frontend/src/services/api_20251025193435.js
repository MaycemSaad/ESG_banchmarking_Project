import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';  // Utilisez 127.0.0.1 au lieu de localhost

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
});

// Intercepteur pour les erreurs de réseau
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to backend server. Make sure the Flask server is running on port 5000.');
    }
    throw error;
  }
);

export const apiService = {
  healthCheck: () => api.get('/health'),
  
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

  getStatistics: () => api.get('/statistics'),
  
  getDashboardData: (minConfidence = 0.5) => 
    api.get('/dashboard', { 
      params: { min_confidence: minConfidence },
      timeout: 10000
    }),
    
  getCompanies: () => api.get('/companies'),
  
  getCompanyData: (companyName, minConfidence = 0.5) =>
    api.get(`/company/${encodeURIComponent(companyName)}`, {
      params: { min_confidence: minConfidence }
    }),
    
  getComparisonData: (companies, compareBy = 'topic_fr', minConfidence = 0.5) => {
    const params = new URLSearchParams();
    companies.forEach(company => params.append('companies', company));
    params.append('compare_by', compareBy);
    params.append('min_confidence', minConfidence.toString());
    
    return api.get('/comparison', { params });
  },
};

export default apiService;