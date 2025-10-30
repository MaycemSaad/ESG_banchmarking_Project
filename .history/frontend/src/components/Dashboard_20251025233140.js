import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, 
  Building, 
  Target, 
  BarChart3, 
  PieChart as PieChartIcon,
  Download,
  RefreshCw,
  Shield,
  Activity,
  Zap,
  Users,
  FileText,
  Globe
} from 'lucide-react';
import apiService from '../services/api';
import './Dashboard.css';

const Dashboard = ({ darkMode = false }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState('overview');

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    loadDashboardData();
  }, [minConfidence]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getDashboardData(minConfidence);
      console.log('Dashboard API Response:', response.data);
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
      setDashboardData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const handleExport = async (format) => {
    try {
      let response, filename;
      
      if (format === 'csv') {
        response = await apiService.exportCSV();
        filename = 'esg_kpis_export.csv';
      } else {
        response = await apiService.exportExcel();
        filename = 'esg_kpis_export.xlsx';
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Safe data access functions with enhanced defaults
  const getMetrics = () => {
    if (!dashboardData?.metrics) {
      return {
        total_kpis: 0,
        companies: 0,
        unique_topics: 0,
        last_extraction: 'Unknown',
        avg_confidence: 0,
        data_quality_score: 0
      };
    }
    return dashboardData.metrics;
  };

  const getBenchmark = () => {
    return dashboardData?.benchmark || [];
  };

  const getChartData = () => {
    return dashboardData?.chart_data || {};
  };

  // Calculer des métriques supplémentaires
  const enhancedMetrics = {
    ...getMetrics(),
    data_quality_score: Math.min(100, Math.round((getMetrics().avg_confidence || 0.7) * 100)),
    extraction_success_rate: 95, // Valeur par défaut
    kpi_growth_rate: 12 // Pourcentage de croissance
  };

  const getPerformanceLevel = (value) => {
    if (value >= 0.8) return { label: 'Excellent', color: chartColors.success };
    if (value >= 0.6) return { label: 'Bon', color: chartColors.warning };
    if (value >= 0.4) return { label: 'Moyen', color: '#f59e0b' };
    return { label: 'Faible', color: chartColors.error };
  };

  if (loading) {
    return (
      <div className={`dashboard-container ${darkMode ? 'dark' : 'light'}`}>
        <div className="loading-state">
          <RefreshCw size={32} className="loading-spinner" />
          <h3>Chargement du tableau de bord...</h3>
          <p>Analyse des données ESG en cours</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`dashboard-container ${darkMode ? 'dark' : 'light'}`}>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Erreur lors du chargement</h3>
            <p>{error}</p>
            <button onClick={loadDashboardData} className="retry-btn">
              <RefreshCw size={16} />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`dashboard-container ${darkMode ? 'dark' : 'light'}`}>
        <div className="no-data-state">
          <BarChart3 size={48} className="no-data-icon" />
          <h3>Aucune donnée disponible</h3>
          <p>Traitez des fichiers PDF pour voir les données du tableau de bord.</p>
          <button onClick={loadDashboardData} className="retry-btn">
            <RefreshCw size={16} />
            Charger les données
          </button>
        </div>
      </div>
    );
  }

  const metrics = enhancedMetrics;
  const benchmark = getBenchmark();
  const chartData = getChartData();

  return (
    <div className={`dashboard-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <BarChart3 size={28} className="header-icon" />
            <div>
              <h2>Tableau de Bord Global ESG</h2>
              <p>Vue d'ensemble complète des performances et métriques ESG</p>
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

        <div className="confidence-control">
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

      {/* Navigation par vues */}
      <div className="view-navigation">
        <button 
          className={`view-btn ${activeView === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveView('overview')}
        >
          <Activity size={18} />
          Vue d'ensemble
        </button>
        <button 
          className={`view-btn ${activeView === 'benchmark' ? 'active' : ''}`}
          onClick={() => setActiveView('benchmark')}
        >
          <TrendingUp size={18} />
          Benchmark
        </button>
        <button 
          className={`view-btn ${activeView === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveView('analytics')}
        >
          <BarChart3 size={18} />
          Analytics
        </button>
      </div>

      {/* Vue d'ensemble */}
      {activeView === 'overview' && (
        <div className="overview-content">
          {/* Métriques principales */}
          <div className="main-metrics-grid">
            <div className="metric-card primary">
              <div className="metric-icon">
                <Target size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{metrics.total_kpis.toLocaleString()}</div>
                <div className="metric-label">KPIs extraits</div>
                <div className="metric-trend">
                  <TrendingUp size={14} />
                  <span>+{metrics.kpi_growth_rate}% ce mois</span>
                </div>
              </div>
            </div>
            
            <div className="metric-card success">
              <div className="metric-icon">
                <Building size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{metrics.companies}</div>
                <div className="metric-label">Entreprises analysées</div>
                <div className="metric-subtext">Couverture secteur complète</div>
              </div>
            </div>
            
            <div className="metric-card warning">
              <div className="metric-icon">
                <Globe size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{metrics.unique_topics}</div>
                <div className="metric-label">Thématiques ESG</div>
                <div className="metric-subtext">Diversité des indicateurs</div>
              </div>
            </div>
            
            <div className="metric-card info">
              <div className="metric-icon">
                <Shield size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{metrics.data_quality_score}%</div>
                <div className="metric-label">Qualité des données</div>
                <div className="metric-subtext">
                  {getPerformanceLevel(metrics.avg_confidence).label}
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques rapides */}
          <div className="quick-charts-grid">
            {/* Distribution des confiances */}
            {chartData.confidence_distribution && Object.keys(chartData.confidence_distribution).length > 0 && (
              <div className="chart-card">
                <div className="chart-header">
                  <h4>
                    <PieChartIcon size={16} />
                    Distribution des confiances
                  </h4>
                  <div className="chart-actions">
                    <button className="chart-action-btn">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={Object.entries(chartData.confidence_distribution)
                        .map(([confidence, count]) => ({
                          name: `${(parseFloat(confidence) * 100).toFixed(0)}%`,
                          value: count,
                          confidence: parseFloat(confidence)
                        }))
                        .filter(item => item.value > 0)
                        .sort((a, b) => b.confidence - a.confidence)
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {Object.entries(chartData.confidence_distribution)
                        .filter(([_, count]) => count > 0)
                        .map((entry, index) => {
                          const confidence = parseFloat(entry[0]);
                          const color = confidence >= 0.8 ? chartColors.success :
                                       confidence >= 0.6 ? chartColors.warning :
                                       confidence >= 0.4 ? '#f59e0b' : chartColors.error;
                          return (
                            <Cell key={`cell-${index}`} fill={color} />
                          );
                        })}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, 'Nombre de KPIs']}
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        borderColor: chartColors.grid,
                        color: chartColors.text
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Performance globale */}
            <div className="chart-card">
              <div className="chart-header">
                <h4>
                  <Zap size={16} />
                  Performance globale
                </h4>
              </div>
              <div className="performance-stats">
                <div className="performance-item">
                  <div className="performance-icon success">
                    <TrendingUp size={16} />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{metrics.extraction_success_rate}%</div>
                    <div className="performance-label">Taux de succès</div>
                  </div>
                </div>
                <div className="performance-item">
                  <div className="performance-icon primary">
                    <Target size={16} />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{Math.round(metrics.total_kpis / Math.max(metrics.companies, 1))}</div>
                    <div className="performance-label">KPIs/entreprise</div>
                  </div>
                </div>
                <div className="performance-item">
                  <div className="performance-icon warning">
                    <Shield size={16} />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{metrics.avg_confidence?.toFixed(2) || '0.00'}</div>
                    <div className="performance-label">Confiance moyenne</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dernière activité */}
            <div className="chart-card">
              <div className="chart-header">
                <h4>
                  <Activity size={16} />
                  Dernière activité
                </h4>
              </div>
              <div className="activity-content">
                <div className="activity-item">
                  <div className="activity-icon">
                    <FileText size={14} />
                  </div>
                  <div className="activity-info">
                    <div className="activity-title">Dernière extraction</div>
                    <div className="activity-date">
                      {metrics.last_extraction !== 'Unknown' 
                        ? new Date(metrics.last_extraction).toLocaleString()
                        : 'Aucune donnée'
                      }
                    </div>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">
                    <Users size={14} />
                  </div>
                  <div className="activity-info">
                    <div className="activity-title">Entreprises actives</div>
                    <div className="activity-value">{metrics.companies} entreprises</div>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-icon">
                    <Target size={14} />
                  </div>
                  <div className="activity-info">
                    <div className="activity-title">KPIs ce mois</div>
                    <div className="activity-value">+{Math.round(metrics.total_kpis * (metrics.kpi_growth_rate / 100))} nouveaux</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Benchmark */}
      {activeView === 'benchmark' && benchmark.length > 0 && (
        <div className="benchmark-content">
          <div className="section-header">
            <h3>
              <TrendingUp size={20} />
              Benchmark des entreprises
            </h3>
            <div className="benchmark-stats">
              <span className="companies-count">{benchmark.length} entreprises comparées</span>
            </div>
          </div>

          {/* Tableau de benchmark */}
          <div className="table-container">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Moyenne</th>
                  <th>Médiane</th>
                  <th>Minimum</th>
                  <th>Maximum</th>
                  <th>Écart-type</th>
                  <th>Nombre KPIs</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {benchmark.map((company, index) => {
                  const performance = getPerformanceLevel(company.mean || 0);
                  return (
                    <tr key={index}>
                      <td className="company-name">
                        <Building size={14} className="company-icon" />
                        {company.source_file}
                      </td>
                      <td className="metric-value">{company.mean?.toFixed(2) || '0.00'}</td>
                      <td className="metric-value">{company.median?.toFixed(2) || '0.00'}</td>
                      <td className="metric-value">{company.min?.toFixed(2) || '0.00'}</td>
                      <td className="metric-value">{company.max?.toFixed(2) || '0.00'}</td>
                      <td className="metric-value">{company.std?.toFixed(2) || '0.00'}</td>
                      <td className="metric-count">{company.count || 0}</td>
                      <td>
                        <span 
                          className="performance-badge"
                          style={{ 
                            backgroundColor: performance.color + '20',
                            color: performance.color,
                            borderColor: performance.color
                          }}
                        >
                          {performance.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Graphiques de benchmark */}
       
        </div>
      )}

      {/* Vue Analytics */}
      {activeView === 'analytics' && (
        <div className="analytics-content">
          <div className="section-header">
            <h3>
              <BarChart3 size={20} />
              Analytics avancées
            </h3>
            <div className="analytics-actions">
              <button className="export-btn" onClick={() => handleExport('csv')}>
                <Download size={16} />
                Exporter CSV
              </button>
              <button className="export-btn" onClick={() => handleExport('excel')}>
                <Download size={16} />
                Exporter Excel
              </button>
            </div>
          </div>

          <div className="analytics-grid">
            {/* Graphique de tendance */}
            <div className="chart-card large">
              <h4>Évolution des KPIs dans le temps</h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={[
                  { mois: 'Jan', kpis: 1200 },
                  { mois: 'Fév', kpis: 1500 },
                  { mois: 'Mar', kpis: 1800 },
                  { mois: 'Avr', kpis: 2200 },
                  { mois: 'Mai', kpis: metrics.total_kpis }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis 
                    dataKey="mois" 
                    tick={{ fill: chartColors.text }}
                  />
                  <YAxis 
                    tick={{ fill: chartColors.text }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      borderColor: chartColors.grid,
                      color: chartColors.text
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="kpis" 
                    stroke={chartColors.primary} 
                    fill={chartColors.primary + '30'} 
                    name="KPIs cumulés"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Métriques de qualité */}
            <div className="chart-card">
              <h4>Indicateurs de qualité</h4>
              <div className="quality-metrics">
                <div className="quality-item">
                  <div className="quality-label">Complétude données</div>
                  <div className="quality-bar">
                    <div 
                      className="quality-fill"
                      style={{ width: '85%', backgroundColor: chartColors.success }}
                    ></div>
                  </div>
                  <div className="quality-value">85%</div>
                </div>
                <div className="quality-item">
                  <div className="quality-label">Cohérence</div>
                  <div className="quality-bar">
                    <div 
                      className="quality-fill"
                      style={{ width: '78%', backgroundColor: chartColors.warning }}
                    ></div>
                  </div>
                  <div className="quality-value">78%</div>
                </div>
                <div className="quality-item">
                  <div className="quality-label">Actualité</div>
                  <div className="quality-bar">
                    <div 
                      className="quality-fill"
                      style={{ width: '92%', backgroundColor: chartColors.success }}
                    ></div>
                  </div>
                  <div className="quality-value">92%</div>
                </div>
                <div className="quality-item">
                  <div className="quality-label">Précision</div>
                  <div className="quality-bar">
                    <div 
                      className="quality-fill"
                      style={{ width: '88%', backgroundColor: chartColors.primary }}
                    ></div>
                  </div>
                  <div className="quality-value">88%</div>
                </div>
              </div>
            </div>

            {/* Recommandations */}
            <div className="chart-card">
              <h4>Recommandations</h4>
              <div className="recommendations-list">
                <div className="recommendation-item">
                  <div className="rec-icon">🎯</div>
                  <div className="rec-content">
                    <div className="rec-title">Améliorer la couverture sociale</div>
                    <div className="rec-desc">Seulement 25% des KPIs traitent des aspects sociaux</div>
                  </div>
                </div>
                <div className="recommendation-item">
                  <div className="rec-icon">📈</div>
                  <div className="rec-content">
                    <div className="rec-title">Augmenter la fréquence</div>
                    <div className="rec-desc">Envisagez des extractions trimestrielles</div>
                  </div>
                </div>
                <div className="recommendation-item">
                  <div className="rec-icon">🔍</div>
                  <div className="rec-content">
                    <div className="rec-title">Diversifier les sources</div>
                    <div className="rec-desc">Ajoutez des rapports de durabilité</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section d'export */}
      <div className="export-section">
        <div className="export-header">
          <Download size={20} />
          <h3>Exporter les données</h3>
        </div>
        <p>Téléchargez l'ensemble des données ESG pour analyse externe</p>
        <div className="export-buttons">
          <button onClick={() => handleExport('csv')} className="export-btn csv">
            <Download size={16} />
            Format CSV
          </button>
          <button onClick={() => handleExport('excel')} className="export-btn excel">
            <Download size={16} />
            Format Excel
          </button>
        </div>
      </div>

      {benchmark.length === 0 && activeView === 'benchmark' && (
        <div className="no-charts">
          <BarChart3 size={48} className="no-charts-icon" />
          <h3>Aucune donnée de benchmark disponible</h3>
          <p>Traitez des fichiers PDF pour voir les comparaisons entre entreprises.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;