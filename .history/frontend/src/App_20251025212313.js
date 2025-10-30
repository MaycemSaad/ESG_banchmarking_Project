import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import apiService from '../services/api';
import './Statistics.css';

const Statistics = ({ darkMode }) => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await apiService.getStatistics();
      setStatsData(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <div className="loading-spinner">Chargement des statistiques...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="statistics-container">
        <div className="error-message">
          <h3>Erreur de chargement</h3>
          <p>{error}</p>
          <button onClick={loadStatistics} className="retry-btn">
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h2>📈 Statistiques Détaillées</h2>
        <p>Analyse complète des données ESG extraites</p>
      </div>

      {/* Métriques principales */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{statsData?.total_kpis || 0}</div>
          <div className="metric-label">Total KPIs</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{statsData?.total_companies || 0}</div>
          <div className="metric-label">Entreprises</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{statsData?.total_pages || 0}</div>
          <div className="metric-label">Pages analysées</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {statsData?.avg_confidence ? `${(statsData.avg_confidence * 100).toFixed(1)}%` : '0%'}
          </div>
          <div className="metric-label">Confiance moyenne</div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="charts-section">
        {/* Distribution par entreprise */}
        {statsData?.companies_distribution && (
          <div className="chart-container">
            <h3>KPIs par Entreprise</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsData.companies_distribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="company" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="kpis" fill="#8884d8" name="Nombre de KPIs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Distribution par thème */}
        {statsData?.topics_distribution && (
          <div className="chart-container">
            <h3>Répartition par Thème ESG</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statsData.topics_distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statsData.topics_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Évolution temporelle */}
        {statsData?.timeline_data && (
          <div className="chart-container full-width">
            <h3>Évolution des Extractions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsData.timeline_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="extractions" fill="#82ca9d" name="Extractions" />
                <Bar dataKey="kpis" fill="#8884d8" name="KPIs extraits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tableau détaillé */}
      {statsData?.detailed_stats && (
        <div className="table-section">
          <h3>Statistiques Détaillées par Entreprise</h3>
          <div className="table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>KPIs</th>
                  <th>Confiance Moy.</th>
                  <th>Thèmes Couverts</th>
                  <th>Dernière MAJ</th>
                </tr>
              </thead>
              <tbody>
                {statsData.detailed_stats.map((company, index) => (
                  <tr key={index}>
                    <td>{company.name}</td>
                    <td>{company.kpis}</td>
                    <td>{(company.avg_confidence * 100).toFixed(1)}%</td>
                    <td>{company.topics_covered}</td>
                    <td>{new Date(company.last_update).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;