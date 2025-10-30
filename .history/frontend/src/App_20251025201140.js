import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import FileAnalysis from './components/FileAnalysis'; // Nouveau composant
import Dashboard from './components/Dashboard';
import Statistics from './components/Statistics';
import CompanyAnalysis from './components/CompanyAnalysis';
import Comparisons from './components/Comparisons';
import ConnectionTest from './components/ConnectionTest';
import apiService from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);
  const [currentFileData, setCurrentFileData] = useState(null); // Données du fichier traité

  const handleProcess = async (kpiFile, pdfFile, minConfidence, rerunIfExists) => {
    try {
      setProcessing(true);
      setProcessResult(null);
      setCurrentFileData(null);
      
      const response = await apiService.processPDF(kpiFile, pdfFile, minConfidence, rerunIfExists);
      
      if (response.data.processed) {
        const resultData = {
          ...response.data,
          kpiFile: kpiFile.name,
          pdfFile: pdfFile.name,
          minConfidence: minConfidence
        };
        
        setCurrentFileData(resultData);
        setProcessResult({
          success: true,
          data: resultData,
          message: `Extracted ${response.data.new_kpis_extracted} new KPIs from ${response.data.pdf_name}.`
        });
        
        // Switch to file analysis after successful processing
        setActiveTab('analysis');
      } else {
        setProcessResult({
          success: false,
          message: response.data.warning || 'Processing completed but no new KPIs extracted'
        });
      }
      
    } catch (error) {
      setProcessResult({
        success: false,
        message: error.message || 'Processing failed'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleViewGlobalDashboard = () => {
    setActiveTab('dashboard');
  };

  const handleAnalyzeAnotherFile = () => {
    setCurrentFileData(null);
    setProcessResult(null);
    setActiveTab('upload');
  };

  const tabs = [
    { id: 'upload', label: '📂 Upload & Process', icon: '📂' },
    { id: 'analysis', label: '🔍 File Analysis', icon: '🔍' },
    { id: 'dashboard', label: '📊 Global Dashboard', icon: '📊' },
    { id: 'statistics', label: '📈 Statistics', icon: '📈' },
    { id: 'comparisons', label: '⚖️ Comparisons', icon: '⚖️' },
    { id: 'company', label: '🏢 Company Analysis', icon: '🏢' }
  ];

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🔎 ESG KPI Extractor</h1>
          <p>Interface visuelle pour l'extraction de KPIs ESG</p>
        </div>
      </header>

      <ConnectionTest />

      <nav className="app-nav">
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.id === 'analysis' && !currentFileData}
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
            <div className="result-content">
              <h3>{processResult.success ? '✅ Processing Successful!' : '❌ Processing Failed'}</h3>
              <p>{processResult.message}</p>
              {processResult.success && (
                <div className="result-actions">
                  <button 
                    onClick={() => setActiveTab('analysis')}
                    className="action-btn primary"
                  >
                    View File Analysis
                  </button>
                  <button 
                    onClick={handleViewGlobalDashboard}
                    className="action-btn secondary"
                  >
                    View Global Dashboard
                  </button>
                </div>
              )}
            </div>
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
        
        {activeTab === 'analysis' && currentFileData && (
          <FileAnalysis 
            fileData={currentFileData}
            onViewGlobalDashboard={handleViewGlobalDashboard}
            onAnalyzeAnotherFile={handleAnalyzeAnotherFile}
          />
        )}
        
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'statistics' && <Statistics />}
        {activeTab === 'comparisons' && <Comparisons />}
        {activeTab === 'company' && <CompanyAnalysis />}
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