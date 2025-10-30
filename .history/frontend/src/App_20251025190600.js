import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import CompanyAnalysis from './components/CompanyAnalysis';
import Comparisons from './components/Comparisons';
import apiService from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);

  const handleProcess = async (kpiFile, pdfFile, minConfidence, rerunIfExists) => {
    try {
      setProcessing(true);
      setProcessResult(null);
      
      const response = await apiService.processPDF(kpiFile, pdfFile, minConfidence, rerunIfExists);
      
      setProcessResult({
        success: true,
        data: response.data
      });
      
      // Switch to dashboard after successful processing
      if (response.data.processed) {
        setActiveTab('dashboard');
      }
      
    } catch (error) {
      setProcessResult({
        success: false,
        error: error.message
      });
    } finally {
      setProcessing(false);
    }
  };

  const tabs = [
    { id: 'upload', label: '📂 Upload & Process', icon: '📂' },
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'statistics', label: '📈 Statistics', icon: '📈' },
    { id: 'comparisons', label: '⚖️ Comparisons', icon: '⚖️' },
    { id: 'analysis', label: '🕵️ Company Analysis', icon: '🕵️' }
  ];

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🔎 ESG KPI Extractor</h1>
          <p>Interface visuelle pour l'extraction de KPIs ESG</p>
        </div>
      </header>

      <nav className="app-nav">
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="app-main">
        {processResult && (
          <div className={`process-result ${processResult.success ? 'success' : 'error'}`}>
            {processResult.success ? (
              <>
                <h3>✅ Processing Successful!</h3>
                <p>
                  Extracted {processResult.data.new_kpis_extracted} new KPIs from {
                    processResult.data.pdf_name
                  }. Total KPIs in database: {processResult.data.total_kpis || processResult.data.new_kpis_extracted}.
                </p>
              </>
            ) : (
              <>
                <h3>❌ Processing Failed</h3>
                <p>{processResult.error}</p>
              </>
            )}
            <button 
              onClick={() => setProcessResult(null)}
              className="close-result"
            >
              ×
            </button>
          </div>
        )}

        {activeTab === 'upload' && (
          <FileUpload onProcess={handleProcess} isLoading={processing} />
        )}
        
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'statistics' && <Statistics />}
        {activeTab === 'comparisons' && <Comparisons />}
        {activeTab === 'analysis' && <CompanyAnalysis />}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>ESG KPI Extractor &copy; 2024. Built with React and Flask.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;