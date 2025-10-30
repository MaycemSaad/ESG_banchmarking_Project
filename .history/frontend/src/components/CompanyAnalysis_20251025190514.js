import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiService from '../services/api';
import './CompanyAnalysis.css';

const CompanyAnalysis = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minConfidence, setMinConfidence] = useState(0.5);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadCompanyData(selectedCompany);
    }
  }, [selectedCompany, minConfidence]);

  const loadCompanies = async () => {
    try {
      const response = await apiService.getCompanies();
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadCompanyData = async (companyName) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCompanyData(companyName, minConfidence);
      setCompanyData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!selectedCompany) return;
    
    try {
      await apiService.exportCompanyData(selectedCompany, format);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  if (companies.length === 0) {
    return (
      <div className="company-analysis-container">
        <div className="no-data">
          <h3>No companies available</h3>
          <p>Process some PDFs to see company analysis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="company-analysis-container">
      <div className="company-header">
        <h2>🕵️ Analyse détaillée par entreprise</h2>
        <div className="controls">
          <select 
            value={selectedCompany} 
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="company-select"
          >
            {companies.map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
          
          <div className="confidence-control">
            <label>Confiance min: {minConfidence.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading">Loading company data...</div>
      )}

      {error && (
        <div className="error">
          <h3>Error loading company data</h3>
          <p>{error}</p>
          <button onClick={() => loadCompanyData(selectedCompany)} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      )}

      {companyData && !loading && (
        <>
          <div className="company-section">
            <h3>Fiche: {companyData.company}</h3>
            
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-value">{companyData.metrics.kpi_count}</div>
                <div className="metric-label">Nombre KPIs extraits</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {(companyData.metrics.topic_coverage * 100).toFixed(1)}%
                </div>
                <div className="metric-label">Couverture topics</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">
                  {companyData.metrics.avg_confidence.toFixed(2)}
                </div>
                <div className="metric-label">Avg confidence</div>
              </div>
            </div>
          </div>

          <div className="company-section">
            <h3>🔝 Top KPIs (par confiance)</h3>
            <div className="table-container">
              <table className="kpi-table">
                <thead>
                  <tr>
                    <th>KPI Name</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Confidence</th>
                    <th>Topic</th>
                  </tr>
                </thead>
                <tbody>
                  {companyData.top_kpis.map((kpi, index) => (
                    <tr key={index}>
                      <td>{kpi.kpi_name}</td>
                      <td>{kpi.value}</td>
                      <td>{kpi.unit}</td>
                      <td>
                        <span className={`confidence-badge confidence-${Math.floor(kpi.confidence * 10)}`}>
                          {kpi.confidence.toFixed(2)}
                        </span>
                      </td>
                      <td>{kpi.topic_fr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {companyData.chart_data.value_vs_confidence.length > 0 && (
            <div className="company-section">
              <h3>🔬 Scatter KPI value vs confidence</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart
                    data={companyData.chart_data.value_vs_confidence}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis 
                      type="number" 
                      dataKey="value" 
                      name="Value"
                      label={{ value: 'KPI Value', position: 'bottom' }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="confidence" 
                      name="Confidence"
                      domain={[0, 1]}
                      label={{ value: 'Confidence', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value, name) => [
                        name === 'confidence' ? value.toFixed(3) : value,
                        name === 'confidence' ? 'Confidence' : 'Value'
                      ]}
                    />
                    <Scatter name="KPIs" data={companyData.chart_data.value_vs_confidence} fill="#8884d8" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="export-section">
            <h3>📥 Export spécifique</h3>
            <div className="export-buttons">
              <button 
                onClick={() => handleExport('csv')} 
                className="export-btn"
              >
                Download CSV
              </button>
              <button 
                onClick={() => handleExport('excel')} 
                className="export-btn"
              >
                Download Excel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompanyAnalysis;