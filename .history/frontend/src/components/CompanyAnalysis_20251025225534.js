import React, { useState, useEffect } from 'react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Download, 
  Building, 
  TrendingUp, 
  Target, 
  BarChart3, 
  PieChart as PieChartIcon,
  RefreshCw,
  Filter,
  Shield,
  Award,
  Activity
} from 'lucide-react';
import apiService from '../services/api';
import './CompanyAnalysis.css';

const CompanyAnalysis = ({ darkMode = false }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Couleurs pour les graphiques selon le thème
  const chartColors = darkMode 
    ? {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        grid: '#374151',
        text: '#f3f4f6'
      }
    : {
        primary: '#3b82f6',
        secondary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        grid: '#e5e7eb',
        text: '#1f2937'
      };

  const confidenceColors = [
    '#ef4444', // 0-1: Red
    '#f97316', // 1-2: Orange
    '#f59e0b', // 2-3: Amber
    '#eab308', // 3-4: Yellow
    '#84cc16', // 4-5: Lime
    '#22c55e', // 5-6: Green
    '#16a34a', // 6-7: Emerald
    '#15803d', // 7-8: Dark Green
    '#166534', // 8-9: Darker Green
    '#14532d'  // 9-10: Darkest Green
  ];

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
      if (response.data.length > 0 && !selectedCompany) {
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
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCompanyData(selectedCompany);
  };

  const handleExport = async (format) => {
    if (!selectedCompany) return;
    
    try {
      await apiService.exportCompanyData(selectedCompany, format);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.9) return { label: 'Excellente', color: chartColors.success };
    if (confidence >= 0.7) return { label: 'Bonne', color: chartColors.warning };
    if (confidence >= 0.5) return { label: 'Moyenne', color: '#f59e0b' };
    return { label: 'Faible', color: chartColors.error };
  };

  const getTopicDistribution = (kpis) => {
    const topicCount = {};
    kpis.forEach(kpi => {
      const topic = kpi.topic_fr || 'Non catégorisé';
      topicCount[topic] = (topicCount[topic] || 0) + 1;
    });
    
    return Object.entries(topicCount).map(([name, value]) => ({
      name,
      value,
      fill: chartColors.primary
    }));
  };

  if (companies.length === 0) {
    return (
      <div className={`company-analysis-container ${darkMode ? 'dark' : 'light'}`}>
        <div className="no-data">
          <Building size={48} className="no-data-icon" />
          <h3>Aucune entreprise disponible</h3>
          <p>Traitez des fichiers PDF pour voir les analyses d'entreprises.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`company-analysis-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Header avec contrôles */}
      <div className="company-header">
        <div className="header-content">
          <div className="header-title">
            <Building size={28} className="header-icon" />
            <div>
              <h2>Analyse détaillée par entreprise</h2>
              <p>Explorez les données ESG extraites pour chaque entreprise</p>
            </div>
          </div>
          
          <div className="header-controls">
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            >
              <RefreshCw size={18} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>
        </div>

        <div className="controls-row">
          <div className="control-group">
            <label className="control-label">
              <Filter size={16} />
              Sélectionner une entreprise
            </label>
            <select 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="company-select"
            >
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label className="control-label">
              <Shield size={16} />
              Niveau de confiance: <span className="confidence-value">{minConfidence.toFixed(2)}</span>
            </label>
            <div className="slider-container">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="confidence-slider"
              />
              <div className="slider-labels">
                <span>0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={18} />
          Vue d'ensemble
        </button>
        <button 
          className={`tab-btn ${activeTab === 'kpis' ? 'active' : ''}`}
          onClick={() => setActiveTab('kpis')}
        >
          <Target size={18} />
          KPIs détaillés
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={18} />
          Analytics
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <RefreshCw size={32} className="loading-spinner" />
          <h3>Chargement des données...</h3>
          <p>Analyse en cours pour {selectedCompany}</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Erreur lors du chargement</h3>
            <p>{error}</p>
            <button onClick={() => loadCompanyData(selectedCompany)} className="retry-btn">
              <RefreshCw size={16} />
              Réessayer
            </button>
          </div>
        </div>
      )}

      {companyData && !loading && (
        <div className="content-area">
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="metrics-grid">
                <div className="metric-card primary">
                  <div className="metric-icon">
                    <Target size={24} />
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{companyData.metrics.kpi_count}</div>
                    <div className="metric-label">KPIs extraits</div>
                  </div>
                </div>
                
                <div className="metric-card success">
                  <div className="metric-icon">
                    <Award size={24} />
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{(companyData.metrics.topic_coverage * 100).toFixed(1)}%</div>
                    <div className="metric-label">Couverture thématique</div>
                  </div>
                </div>
                
                <div className="metric-card warning">
                  <div className="metric-icon">
                    <Shield size={24} />
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{companyData.metrics.avg_confidence.toFixed(2)}</div>
                    <div className="metric-label">Confiance moyenne</div>
                    <div className="metric-subtext">
                      {getConfidenceLevel(companyData.metrics.avg_confidence).label}
                    </div>
                  </div>
                </div>
                
                <div className="metric-card info">
                  <div className="metric-icon">
                    <TrendingUp size={24} />
                  </div>
                  <div className="metric-content">
                    <div className="metric-value">{companyData.metrics.unique_topics}</div>
                    <div className="metric-label">Thématiques uniques</div>
                  </div>
                </div>
              </div>

              {/* Graphiques rapides */}
              <div className="charts-row">
                {companyData.chart_data.value_vs_confidence.length > 0 && (
                  <div className="chart-card">
                    <h4>Distribution des valeurs vs confiance</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={companyData.chart_data.value_vs_confidence}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis 
                          dataKey="value" 
                          stroke={chartColors.text}
                          label={{ value: 'Valeur KPI', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          dataKey="confidence" 
                          domain={[0, 1]}
                          stroke={chartColors.text}
                          label={{ value: 'Confiance', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            name === 'confidence' ? value.toFixed(3) : value,
                            name === 'confidence' ? 'Confiance' : 'Valeur'
                          ]}
                          contentStyle={{
                            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                            borderColor: chartColors.grid,
                            color: chartColors.text
                          }}
                        />
                        <Scatter 
                          data={companyData.chart_data.value_vs_confidence} 
                          fill={chartColors.primary}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {companyData.top_kpis.length > 0 && (
                  <div className="chart-card">
                    <h4>Répartition par thématique</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getTopicDistribution(companyData.top_kpis)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getTopicDistribution(companyData.top_kpis).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors.primary} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                            borderColor: chartColors.grid,
                            color: chartColors.text
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KPIs détaillés */}
          {activeTab === 'kpis' && (
            <div className="kpis-tab">
              <div className="section-header">
                <h3>📊 KPIs détaillés - {selectedCompany}</h3>
                <div className="kpi-count">
                  {companyData.top_kpis.length} KPIs trouvés
                </div>
              </div>
              
              <div className="table-container">
                <table className="kpi-table">
                  <thead>
                    <tr>
                      <th>Nom du KPI</th>
                      <th>Valeur</th>
                      <th>Unité</th>
                      <th>Confiance</th>
                      <th>Thématique</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyData.top_kpis.map((kpi, index) => {
                      const confidenceLevel = Math.floor(kpi.confidence * 10);
                      return (
                        <tr key={index}>
                          <td className="kpi-name">
                            <div className="kpi-name-content">
                              <Target size={14} className="kpi-icon" />
                              {kpi.kpi_name}
                            </div>
                          </td>
                          <td className="kpi-value">{kpi.value}</td>
                          <td className="kpi-unit">{kpi.unit}</td>
                          <td>
                            <div className="confidence-display">
                              <div 
                                className="confidence-bar"
                                style={{
                                  width: `${kpi.confidence * 100}%`,
                                  backgroundColor: confidenceColors[confidenceLevel] || confidenceColors[0]
                                }}
                              ></div>
                              <span className="confidence-text">
                                {kpi.confidence.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="topic-badge">{kpi.topic_fr}</span>
                          </td>
                          <td className="kpi-source">{kpi.source || 'PDF'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <div className="analytics-tab">
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>Distribution des niveaux de confiance</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={companyData.chart_data.confidence_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="range" stroke={chartColors.text} />
                      <YAxis stroke={chartColors.text} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                          borderColor: chartColors.grid,
                          color: chartColors.text
                        }}
                      />
                      <Bar dataKey="count" fill={chartColors.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="analytics-card">
                  <h4>Top 10 des KPIs par valeur</h4>
                  <div className="top-kpis-list">
                    {companyData.top_kpis.slice(0, 10).map((kpi, index) => (
                      <div key={index} className="top-kpi-item">
                        <div className="kpi-rank">#{index + 1}</div>
                        <div className="kpi-info">
                          <div className="kpi-title">{kpi.kpi_name}</div>
                          <div className="kpi-meta">{kpi.topic_fr} • {kpi.value} {kpi.unit}</div>
                        </div>
                        <div className={`confidence-badge confidence-${Math.floor(kpi.confidence * 10)}`}>
                          {kpi.confidence.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section export */}
          <div className="export-section">
            <div className="export-header">
              <Download size={20} />
              <h3>Exporter les données</h3>
            </div>
            <p>Téléchargez les données complètes de {selectedCompany} dans le format de votre choix</p>
            <div className="export-buttons">
              <button 
                onClick={() => handleExport('csv')} 
                className="export-btn csv"
              >
                <Download size={16} />
                CSV
              </button>
              <button 
                onClick={() => handleExport('excel')} 
                className="export-btn excel"
              >
                <Download size={16} />
                Excel
              </button>
              <button 
                onClick={() => handleExport('json')} 
                className="export-btn json"
              >
                <Download size={16} />
                JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAnalysis;