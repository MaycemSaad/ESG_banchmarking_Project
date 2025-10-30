import React, { useState, useEffect } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Target, 
  GitCompare,
  Filter,
  Shield,
  RefreshCw,
  Download,
  Zap,
  Activity,
  Building
} from 'lucide-react';
import apiService from '../services/api';
import './Comparisons.css';

const Comparisons = ({ darkMode = false }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compareBy, setCompareBy] = useState('topic_fr');
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [activeView, setActiveView] = useState('radar');
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
        text: '#f3f4f6',
        background: '#1f2937'
      }
    : {
        primary: '#3b82f6',
        secondary: '#6366f1',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        grid: '#e5e7eb',
        text: '#1f2937',
        background: '#ffffff'
      };

  const COMPANY_COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
  ];

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanies.length > 0) {
      loadComparisonData();
    }
  }, [selectedCompanies, compareBy, minConfidence]);

  const loadCompanies = async () => {
    try {
      const response = await apiService.getCompanies();
      setCompanies(response.data);
      // Sélectionner les 3 premières entreprises par défaut
      if (response.data.length > 0) {
        setSelectedCompanies(response.data.slice(0, Math.min(3, response.data.length)));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getComparisonData(selectedCompanies, compareBy, minConfidence);
      setComparisonData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadComparisonData();
  };

  const handleCompanyToggle = (company) => {
    if (selectedCompanies.includes(company)) {
      setSelectedCompanies(selectedCompanies.filter(c => c !== company));
    } else {
      if (selectedCompanies.length < 6) {
        setSelectedCompanies([...selectedCompanies, company]);
      } else {
        alert('Maximum 6 entreprises peuvent être sélectionnées');
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.slice(0, 6));
    }
  };

  const getSimilarityLevel = (value) => {
    if (value >= 0.8) return { label: 'Très similaire', color: chartColors.success };
    if (value >= 0.6) return { label: 'Similaire', color: chartColors.warning };
    if (value >= 0.4) return { label: 'Modéré', color: '#f59e0b' };
    return { label: 'Différent', color: chartColors.error };
  };

  const exportComparisonData = (format) => {
    // Implémentation de l'export
    console.log(`Exporting comparison data in ${format} format`);
  };

  if (companies.length === 0) {
    return (
      <div className={`comparisons-container ${darkMode ? 'dark' : 'light'}`}>
        <div className="no-data">
          <Building size={48} className="no-data-icon" />
          <h3>Aucune entreprise disponible</h3>
          <p>Traitez des fichiers PDF pour voir les comparaisons.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`comparisons-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="comparisons-header">
        <div className="header-content">
          <div className="header-title">
            <GitCompare size={28} className="header-icon" />
            <div>
              <h2>Comparaisons multi-entreprises</h2>
              <p>Analyse comparative des performances ESG entre entreprises</p>
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
      </div>

      {/* Controls Section */}
      <div className="controls-section">
        <div className="controls-grid">
          <div className="control-group">
            <label className="control-label">
              <Building size={16} />
              Entreprises à comparer ({selectedCompanies.length}/6)
            </label>
            <div className="selection-actions">
              <button onClick={handleSelectAll} className="select-all-btn">
                {selectedCompanies.length === companies.length ? 'Tout désélectionner' : 'Sélectionner tout'}
              </button>
            </div>
            <div className="companies-checkboxes">
              {companies.map((company, index) => (
                <label 
                  key={company} 
                  className={`checkbox-label ${selectedCompanies.includes(company) ? 'selected' : ''}`}
                  style={{
                    borderLeftColor: selectedCompanies.includes(company) ? COMPANY_COLORS[index % COMPANY_COLORS.length] : 'transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCompanies.includes(company)}
                    onChange={() => handleCompanyToggle(company)}
                    disabled={!selectedCompanies.includes(company) && selectedCompanies.length >= 6}
                  />
                  <span className="company-color" style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}></span>
                  <span className="company-name">{company}</span>
                  {!selectedCompanies.includes(company) && selectedCompanies.length >= 6 && (
                    <span className="max-tooltip">Maximum atteint</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">
              <Target size={16} />
              Critère de comparaison
            </label>
            <div className="radio-group">
              <label className={`radio-label ${compareBy === 'topic_fr' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="topic_fr"
                  checked={compareBy === 'topic_fr'}
                  onChange={(e) => setCompareBy(e.target.value)}
                />
                <span className="radio-custom"></span>
                Thématique ESG
              </label>
              <label className={`radio-label ${compareBy === 'kpi_name' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="kpi_name"
                  checked={compareBy === 'kpi_name'}
                  onChange={(e) => setCompareBy(e.target.value)}
                />
                <span className="radio-custom"></span>
                Nom du KPI
              </label>
            </div>
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

      {/* View Navigation */}
      <div className="view-navigation">
        <button 
          className={`view-btn ${activeView === 'radar' ? 'active' : ''}`}
          onClick={() => setActiveView('radar')}
        >
          <Activity size={18} />
          Vue Radar
        </button>
        <button 
          className={`view-btn ${activeView === 'similarity' ? 'active' : ''}`}
          onClick={() => setActiveView('similarity')}
        >
          <GitCompare size={18} />
          Matrice Similarité
        </button>
        <button 
          className={`view-btn ${activeView === 'bars' ? 'active' : ''}`}
          onClick={() => setActiveView('bars')}
        >
          <BarChart3 size={18} />
          Comparaison Détail
        </button>
        <button 
          className={`view-btn ${activeView === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveView('trends')}
        >
          <TrendingUp size={18} />
          Tendances
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <RefreshCw size={32} className="loading-spinner" />
          <h3>Chargement des comparaisons...</h3>
          <p>Analyse en cours pour {selectedCompanies.length} entreprise(s)</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Erreur lors du chargement</h3>
            <p>{error}</p>
            <button onClick={loadComparisonData} className="retry-btn">
              <RefreshCw size={16} />
              Réessayer
            </button>
          </div>
        </div>
      )}

      {comparisonData && !loading && selectedCompanies.length > 0 && (
        <div className="comparison-content">
          {/* Radar Chart View */}
          {activeView === 'radar' && (
            <div className="chart-section">
              <div className="section-header">
                <h3>
                  <Activity size={20} />
                  Profil comparatif - Carte Radar
                </h3>
                <div className="section-actions">
                  <button className="export-btn" onClick={() => exportComparisonData('png')}>
                    <Download size={16} />
                    Exporter
                  </button>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={500}>
                  <RadarChart 
                    data={comparisonData.radar_data.categories.map((category, index) => {
                      const dataPoint = { category };
                      selectedCompanies.forEach(company => {
                        dataPoint[company] = comparisonData.radar_data.companies[company]?.[index] || 0;
                      });
                      return dataPoint;
                    })}
                  >
                    <PolarGrid stroke={chartColors.grid} />
                    <PolarAngleAxis 
                      dataKey="category" 
                      tick={{ fill: chartColors.text, fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 'auto']}
                      tick={{ fill: chartColors.text }}
                    />
                    {selectedCompanies.map((company, index) => (
                      <Radar
                        key={company}
                        name={company}
                        dataKey={company}
                        stroke={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                        fill={COMPANY_COLORS[index % COMPANY_COLORS.length]}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend 
                      wrapperStyle={{ color: chartColors.text }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        borderColor: chartColors.grid,
                        color: chartColors.text
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Similarity Matrix View */}
          {activeView === 'similarity' && comparisonData.similarity_data && (
            <div className="chart-section">
              <div className="section-header">
                <h3>
                  <GitCompare size={20} />
                  Matrice de similarité (cosinus)
                </h3>
                <div className="similarity-stats">
                  <div className="stat">
                    <span className="stat-value">
                      {comparisonData.similarity_data.average_similarity?.toFixed(2) || '0.00'}
                    </span>
                    <span className="stat-label">Similarité moyenne</span>
                  </div>
                </div>
              </div>
              
              <div className="similarity-container">
                <div className="similarity-matrix">
                  <table>
                    <thead>
                      <tr>
                        <th></th>
                        {comparisonData.similarity_data.companies.map((company, index) => (
                          <th key={company}>
                            <div className="company-header">
                              <span 
                                className="company-dot"
                                style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                              ></span>
                              {company}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.similarity_data.matrix.map((row, i) => (
                        <tr key={i}>
                          <td className="company-name">
                            <div className="company-header">
                              <span 
                                className="company-dot"
                                style={{ backgroundColor: COMPANY_COLORS[i % COMPANY_COLORS.length] }}
                              ></span>
                              {comparisonData.similarity_data.companies[i]}
                            </div>
                          </td>
                          {row.map((value, j) => {
                            const similarity = getSimilarityLevel(value);
                            return (
                              <td 
                                key={j}
                                className={`similarity-cell ${i === j ? 'diagonal' : ''}`}
                                style={{
                                  backgroundColor: i === j ? 'transparent' : similarity.color + '20',
                                  border: i === j ? `2px solid ${similarity.color}` : 'none'
                                }}
                                title={`Similarité: ${value.toFixed(3)} - ${similarity.label}`}
                              >
                                {i === j ? (
                                  <div className="diagonal-content">—</div>
                                ) : (
                                  <>
                                    <div className="similarity-value">{value.toFixed(2)}</div>
                                    <div className="similarity-label">{similarity.label}</div>
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="similarity-legend">
                  <h4>Légende de similarité</h4>
                  <div className="legend-items">
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#10b98120' }}></div>
                      <span>Très similaire (0.8-1.0)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#f59e0b20' }}></div>
                      <span>Similaire (0.6-0.8)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#f59e0b20' }}></div>
                      <span>Modéré (0.4-0.6)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#ef444420' }}></div>
                      <span>Différent (0.0-0.4)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bar Charts View */}
          {activeView === 'bars' && comparisonData.radar_data.categories.length > 0 && (
            <div className="chart-section">
              <div className="section-header">
                <h3>
                  <BarChart3 size={20} />
                  Comparaison détaillée par catégorie
                </h3>
                <div className="categories-count">
                  {comparisonData.radar_data.categories.length} catégories comparées
                </div>
              </div>
              
              <div className="bar-charts-grid">
                {comparisonData.radar_data.categories.slice(0, 9).map((category, categoryIndex) => (
                  <div key={category} className="bar-chart-card">
                    <div className="chart-header">
                      <h4>{category}</h4>
                      <div className="chart-stats">
                        <span className="stat">
                          Max: {Math.max(...selectedCompanies.map(company => 
                            comparisonData.radar_data.companies[company]?.[categoryIndex] || 0
                          )).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={selectedCompanies.map((company, index) => ({
                          company: company.substring(0, 15) + (company.length > 15 ? '...' : ''),
                          value: comparisonData.radar_data.companies[company]?.[categoryIndex] || 0,
                          fullName: company
                        }))}
                        margin={{ top: 10, right: 10, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis 
                          dataKey="company" 
                          angle={-45} 
                          textAnchor="end" 
                          height={50}
                          tick={{ fill: chartColors.text, fontSize: 10 }}
                        />
                        <YAxis 
                          tick={{ fill: chartColors.text, fontSize: 10 }}
                        />
                        <Tooltip 
                          formatter={(value) => [value.toFixed(2), 'Valeur']}
                          labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                          contentStyle={{
                            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                            borderColor: chartColors.grid,
                            color: chartColors.text
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill={COMPANY_COLORS[categoryIndex % COMPANY_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trends View */}
          {activeView === 'trends' && (
            <div className="chart-section">
              <div className="section-header">
                <h3>
                  <TrendingUp size={20} />
                  Analyse des tendances
                </h3>
              </div>
              
              <div className="trends-grid">
                <div className="trend-card">
                  <h4>Performance globale par entreprise</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={selectedCompanies.map(company => {
                        const values = comparisonData.radar_data.companies[company] || [];
                        const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                        return {
                          company: company.substring(0, 12) + (company.length > 12 ? '...' : ''),
                          performance: avgValue,
                          fullName: company
                        };
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis 
                        dataKey="company" 
                        tick={{ fill: chartColors.text }}
                      />
                      <YAxis 
                        tick={{ fill: chartColors.text }}
                      />
                      <Tooltip 
                        formatter={(value) => [value.toFixed(2), 'Performance moyenne']}
                        labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                        contentStyle={{
                          backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                          borderColor: chartColors.grid,
                          color: chartColors.text
                        }}
                      />
                      <Bar 
                        dataKey="performance" 
                        fill={chartColors.primary}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="trend-card">
                  <h4>Distribution des performances</h4>
                  <div className="performance-stats">
                    {selectedCompanies.map((company, index) => {
                      const values = comparisonData.radar_data.companies[company] || [];
                      const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                      return (
                        <div key={company} className="performance-item">
                          <div className="performance-header">
                            <span 
                              className="company-dot"
                              style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
                            ></span>
                            <span className="company-name">{company}</span>
                            <span className="performance-value">{avgValue.toFixed(2)}</span>
                          </div>
                          <div className="performance-bar">
                            <div 
                              className="performance-fill"
                              style={{ 
                                width: `${avgValue * 100}%`,
                                backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length]
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Section */}
          <div className="export-section">
            <div className="export-header">
              <Download size={20} />
              <h3>Exporter les comparaisons</h3>
            </div>
            <p>Exportez les données de comparaison dans différents formats</p>
            <div className="export-buttons">
              <button onClick={() => exportComparisonData('csv')} className="export-btn csv">
                <Download size={16} />
                CSV
              </button>
              <button onClick={() => exportComparisonData('excel')} className="export-btn excel">
                <Download size={16} />
                Excel
              </button>
              <button onClick={() => exportComparisonData('json')} className="export-btn json">
                <Download size={16} />
                JSON
              </button>
              <button onClick={() => exportComparisonData('png')} className="export-btn image">
                <Download size={16} />
                Image
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCompanies.length === 0 && !loading && (
        <div className="no-selection">
          <GitCompare size={48} className="no-selection-icon" />
          <h3>Aucune entreprise sélectionnée</h3>
          <p>Veuillez sélectionner au moins une entreprise pour voir les comparaisons.</p>
          <button onClick={() => setSelectedCompanies(companies.slice(0, 3))} className="select-some-btn">
            Sélectionner 3 entreprises
          </button>
        </div>
      )}
    </div>
  );
};

export default Comparisons;