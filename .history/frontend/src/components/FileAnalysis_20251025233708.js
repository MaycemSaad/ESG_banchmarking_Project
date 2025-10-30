import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  FileText, 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp,
  Target,
  Shield,
  Download,
  RotateCcw,
  Globe,
  Zap,
  Activity,
  ChevronRight,
  Filter
} from 'lucide-react';
import './FileAnalysis.css';

const FileAnalysis = ({ fileData, onViewGlobalDashboard, onAnalyzeAnotherFile, darkMode = false }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sortConfig, setSortConfig] = useState({ key: 'confidence', direction: 'desc' });

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
    if (fileData && fileData.results) {
      processAnalysisData();
    }
  }, [fileData]);

  const processAnalysisData = () => {
    const results = fileData.results;
    
    // Statistiques par topic
    const topicStats = {};
    results.forEach(kpi => {
      const topic = kpi.topic_fr || kpi.topic || 'Non catégorisé';
      if (!topicStats[topic]) {
        topicStats[topic] = {
          count: 0,
          totalConfidence: 0,
          values: [],
          topics: new Set()
        };
      }
      topicStats[topic].count++;
      topicStats[topic].totalConfidence += kpi.confidence;
      topicStats[topic].values.push(kpi.value);
      topicStats[topic].topics.add(topic);
    });

    // Préparer les données pour les graphiques
    const topicChartData = Object.entries(topicStats)
      .map(([topic, stats]) => ({
        topic,
        count: stats.count,
        avgConfidence: stats.totalConfidence / stats.count,
        avgValue: stats.values.reduce((a, b) => a + b, 0) / stats.values.length,
        percentage: (stats.count / results.length * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);

    const confidenceDistribution = {};
    results.forEach(kpi => {
      const confidenceLevel = Math.floor(kpi.confidence * 10) / 10;
      confidenceDistribution[confidenceLevel] = (confidenceDistribution[confidenceLevel] || 0) + 1;
    });

    const confidenceChartData = Object.entries(confidenceDistribution)
      .map(([level, count]) => ({
        level: `Conf ${parseFloat(level).toFixed(1)}`,
        count,
        percentage: (count / results.length * 100).toFixed(1)
      }))
      .sort((a, b) => parseFloat(a.level.split(' ')[1]) - parseFloat(b.level.split(' ')[1]));

    // Données pour le graphique de valeur
    const valueDistribution = results
      .map(kpi => ({
        name: kpi.kpi_name.substring(0, 20) + (kpi.kpi_name.length > 20 ? '...' : ''),
        value: kpi.value,
        confidence: kpi.confidence,
        fullName: kpi.kpi_name
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    setAnalysisData({
      topicChartData,
      confidenceChartData,
      valueDistribution,
      kpiList: results,
      summary: {
        totalKPIs: results.length,
        uniqueTopics: Object.keys(topicStats).length,
        avgConfidence: results.reduce((sum, kpi) => sum + kpi.confidence, 0) / results.length,
        minValue: Math.min(...results.map(kpi => kpi.value)),
        maxValue: Math.max(...results.map(kpi => kpi.value)),
        avgValue: results.reduce((sum, kpi) => sum + kpi.value, 0) / results.length,
        highConfidenceKPIs: results.filter(kpi => kpi.confidence >= 0.8).length,
        mediumConfidenceKPIs: results.filter(kpi => kpi.confidence >= 0.5 && kpi.confidence < 0.8).length,
        lowConfidenceKPIs: results.filter(kpi => kpi.confidence < 0.5).length
      }
    });
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSortedKPIs = () => {
    if (!analysisData) return [];
    
    return [...analysisData.kpiList].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return { label: 'Élevée', color: chartColors.success, level: 'high' };
    if (confidence >= 0.6) return { label: 'Bonne', color: chartColors.warning, level: 'medium' };
    if (confidence >= 0.4) return { label: 'Moyenne', color: '#f59e0b', level: 'medium' };
    return { label: 'Faible', color: chartColors.error, level: 'low' };
  };

  const exportAnalysis = () => {
    // Implémentation de l'export
    console.log('Exporting analysis data...');
  };

  if (!analysisData) {
    return (
      <div className={`file-analysis-loading ${darkMode ? 'dark' : 'light'}`}>
        <div className="loading-content">
          <Activity size={32} className="loading-spinner" />
          <h3>Traitement des données d'analyse...</h3>
          <p>Extraction et analyse des KPIs en cours</p>
        </div>
      </div>
    );
  }

  const sortedKPIs = getSortedKPIs();

  return (
    <div className={`file-analysis-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="analysis-header">
        <div className="header-content">
          <div className="header-title">
            <FileText size={28} className="header-icon" />
            <div>
              <h2>Analyse du fichier</h2>
              <p>Résultats détaillés de l'extraction ESG</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button onClick={onAnalyzeAnotherFile} className="action-btn outline">
              <RotateCcw size={18} />
              Nouvelle analyse
            </button>
            <button onClick={onViewGlobalDashboard} className="action-btn primary">
              <Globe size={18} />
              Dashboard global
            </button>
          </div>
        </div>

        <div className="file-info-badge">
          <div className="file-name">{fileData.pdf_name}</div>
          <div className="file-meta">
            <span>{analysisData.summary.totalKPIs} KPIs extraits</span>
            <span>•</span>
            <span>Seuil: {fileData.minConfidence}</span>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={18} />
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
          <TrendingUp size={18} />
          Analytics
        </button>
      </div>

      {/* Vue d'ensemble */}
      {activeTab === 'overview' && (
        <div className="overview-content">
          {/* Métriques principales */}
          <div className="main-metrics-grid">
            <div className="metric-card primary">
              <div className="metric-icon">
                <Target size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{analysisData.summary.totalKPIs}</div>
                <div className="metric-label">KPIs extraits</div>
                <div className="metric-trend">
                  <Zap size={14} />
                  <span>Extraction réussie</span>
                </div>
              </div>
            </div>
            
            <div className="metric-card success">
              <div className="metric-icon">
                <Activity size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{analysisData.summary.uniqueTopics}</div>
                <div className="metric-label">Thématiques</div>
                <div className="metric-subtext">Diversité ESG</div>
              </div>
            </div>
            
            <div className="metric-card warning">
              <div className="metric-icon">
                <Shield size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{analysisData.summary.avgConfidence.toFixed(3)}</div>
                <div className="metric-label">Confiance moyenne</div>
                <div className="metric-subtext">
                  {getConfidenceLevel(analysisData.summary.avgConfidence).label}
                </div>
              </div>
            </div>
            
            <div className="metric-card info">
              <div className="metric-icon">
                <TrendingUp size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-value">{analysisData.summary.avgValue.toFixed(2)}</div>
                <div className="metric-label">Valeur moyenne</div>
                <div className="metric-subtext">Performance globale</div>
              </div>
            </div>
          </div>

          {/* Graphiques principaux */}
          <div className="charts-grid">
            <div className="chart-card">
              <div className="chart-header">
                <h4>
                  <BarChart3 size={16} />
                  Répartition par thématique
                </h4>
                <div className="chart-actions">
                  <button className="chart-action-btn">
                    <Download size={14} />
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysisData.topicChartData.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis 
                    dataKey="topic" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fill: chartColors.text, fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: chartColors.text }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'count' ? 'Nombre de KPIs' : 'Valeur moyenne']}
                    contentStyle={{
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      borderColor: chartColors.grid,
                      color: chartColors.text
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={chartColors.primary} 
                    name="Nombre de KPIs"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h4>
                  <PieChartIcon size={16} />
                  Distribution des confiances
                </h4>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analysisData.confidenceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    label={({ percentage }) => `${percentage}%`}
                  >
                    {analysisData.confidenceChartData.map((entry, index) => {
                      const confidence = parseFloat(entry.level.split(' ')[1]);
                      const color = confidence >= 0.8 ? chartColors.success :
                                   confidence >= 0.6 ? chartColors.warning :
                                   confidence >= 0.4 ? '#f59e0b' : chartColors.error;
                      return (
                        <Cell key={`cell-${index}`} fill={color} />
                      );
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} KPIs (${props.payload.percentage}%)`,
                      'Distribution'
                    ]}
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
          </div>

          {/* Statistiques de confiance */}
          <div className="confidence-stats">
            <h4>Niveaux de confiance</h4>
            <div className="confidence-bars">
              <div className="confidence-bar high">
                <div className="bar-label">
                  <span>Élevée (≥ 0.8)</span>
                  <span>{analysisData.summary.highConfidenceKPIs} KPIs</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${(analysisData.summary.highConfidenceKPIs / analysisData.summary.totalKPIs) * 100}%`,
                      backgroundColor: chartColors.success
                    }}
                  ></div>
                </div>
              </div>
              <div className="confidence-bar medium">
                <div className="bar-label">
                  <span>Moyenne (0.5-0.8)</span>
                  <span>{analysisData.summary.mediumConfidenceKPIs} KPIs</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${(analysisData.summary.mediumConfidenceKPIs / analysisData.summary.totalKPIs) * 100}%`,
                      backgroundColor: chartColors.warning
                    }}
                  ></div>
                </div>
              </div>
              <div className="confidence-bar low">
                <div className="bar-label">
                  <span>Faible (&lt; 0.5)</span>
                  <span>{analysisData.summary.lowConfidenceKPIs} KPIs</span>
                </div>
                <div className="bar-track">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${(analysisData.summary.lowConfidenceKPIs / analysisData.summary.totalKPIs) * 100}%`,
                      backgroundColor: chartColors.error
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue KPIs détaillés */}
      {activeTab === 'kpis' && (
        <div className="kpis-content">
          <div className="section-header">
            <h3>
              <Target size={20} />
              KPIs extraits - {fileData.pdf_name}
            </h3>
            <div className="kpis-stats">
              <span className="kpis-count">{analysisData.summary.totalKPIs} KPIs trouvés</span>
            </div>
          </div>

          <div className="table-container">
            <table className="kpi-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('kpi_name')} className="sortable">
                    Nom du KPI
                    {sortConfig.key === 'kpi_name' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('value')} className="sortable">
                    Valeur
                    {sortConfig.key === 'value' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th>Unité</th>
                  <th onClick={() => handleSort('topic_fr')} className="sortable">
                    Thématique
                    {sortConfig.key === 'topic_fr' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th onClick={() => handleSort('confidence')} className="sortable">
                    Confiance
                    {sortConfig.key === 'confidence' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedKPIs.map((kpi, index) => {
                  const confidenceLevel = getConfidenceLevel(kpi.confidence);
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
                        <span className="topic-badge">{kpi.topic_fr || kpi.topic}</span>
                      </td>
                      <td>
                        <div className="confidence-display">
                          <div 
                            className="confidence-bar"
                            style={{
                              width: `${kpi.confidence * 100}%`,
                              backgroundColor: confidenceLevel.color
                            }}
                          ></div>
                          <span className="confidence-text">
                            {kpi.confidence.toFixed(3)}
                          </span>
                          <span className="confidence-label">{confidenceLevel.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vue Analytics */}
      {activeTab === 'analytics' && (
        <div className="analytics-content">
          <div className="section-header">
            <h3>
              <TrendingUp size={20} />
              Analytics avancées
            </h3>
            <div className="analytics-actions">
              <button className="export-btn" onClick={exportAnalysis}>
                <Download size={16} />
                Exporter l'analyse
              </button>
            </div>
          </div>

          <div className="analytics-grid">
            <div className="chart-card large">
              <h4>Top 15 des KPIs par valeur</h4>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analysisData.valueDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fill: chartColors.text, fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: chartColors.text }}
                  />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'value' ? 'Valeur' : 'Confiance']}
                    labelFormatter={(label, payload) => payload[0]?.payload.fullName || label}
                    contentStyle={{
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      borderColor: chartColors.grid,
                      color: chartColors.text
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={chartColors.primary} 
                    name="Valeur"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h4>Performance d'extraction</h4>
              <div className="performance-metrics">
                <div className="performance-item">
                  <div className="performance-icon success">
                    <Zap size={16} />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">
                      {((analysisData.summary.highConfidenceKPIs / analysisData.summary.totalKPIs) * 100).toFixed(1)}%
                    </div>
                    <div className="performance-label">Qualité élevée</div>
                  </div>
                </div>
                <div className="performance-item">
                  <div className="performance-icon primary">
                    <Target size={16} />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{analysisData.summary.uniqueTopics}</div>
                    <div className="performance-label">Thématiques couvertes</div>
                  </div>
                </div>
                <div className="performance-item">
                  <div className="performance-icon warning">
                    <Shield size={16} />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{analysisData.summary.avgConfidence.toFixed(3)}</div>
                    <div className="performance-label">Confiance moyenne</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-card">
              <h4>Recommandations</h4>
              <div className="recommendations-list">
                <div className="recommendation-item">
                  <div className="rec-icon">🎯</div>
                  <div className="rec-content">
                    <div className="rec-title">Améliorer la précision</div>
                    <div className="rec-desc">
                      {analysisData.summary.lowConfidenceKPIs} KPIs nécessitent une vérification
                    </div>
                  </div>
                </div>
                <div className="recommendation-item">
                  <div className="rec-icon">📈</div>
                  <div className="rec-content">
                    <div className="rec-title">Diversifier les sources</div>
                    <div className="rec-desc">Envisagez des rapports supplémentaires</div>
                  </div>
                </div>
                <div className="recommendation-item">
                  <div className="rec-icon">⚡</div>
                  <div className="rec-content">
                    <div className="rec-title">Performance excellente</div>
                    <div className="rec-desc">
                      {analysisData.summary.highConfidenceKPIs} KPIs de haute qualité
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions globales */}
      <div className="action-section">
        <button onClick={onAnalyzeAnotherFile} className="action-btn outline large">
          <RotateCcw size={18} />
          Analyser un autre fichier
        </button>
        <button onClick={onViewGlobalDashboard} className="action-btn primary large">
          <Globe size={18} />
          Voir le dashboard global
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default FileAnalysis;