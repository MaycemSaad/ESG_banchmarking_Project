import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import apiService from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [minConfidence, setMinConfidence] = useState(0.5);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    loadDashboardData();
  }, [minConfidence]);

  const loadDashboardData = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await apiService.getDashboardData(minConfidence);
    console.log('Dashboard API Response:', response.data); // ← AJOUTEZ CETTE LIGNE
    setDashboardData(response.data);
  } catch (err) {
    console.error('Error loading dashboard data:', err);
    setError(err.message);
    setDashboardData(null);
  } finally {
    setLoading(false);
  }
  };

  const handleExport = async (format) => {
    try {
      if (format === 'csv') {
        const response = await apiService.exportCSV();
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'esg_kpis_export.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const response = await apiService.exportExcel();
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'esg_kpis_export.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Safe data access functions
  const getMetrics = () => {
    if (!dashboardData?.metrics) {
      return {
        total_kpis: 0,
        companies: 0,
        unique_topics: 0,
        last_extraction: 'Unknown'
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

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <h3>Error loading dashboard</h3>
          <p>{error}</p>
          <button onClick={loadDashboardData} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-container">
        <div className="no-data">
          <h3>No data available</h3>
          <p>Process some PDFs to see the dashboard data.</p>
          <button onClick={loadDashboardData} className="retry-btn">
            🔄 Load Data
          </button>
        </div>
      </div>
    );
  }

  const metrics = getMetrics();
  const benchmark = getBenchmark();
  const chartData = getChartData();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>📊 Dashboard Global</h2>
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

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{metrics.total_kpis}</div>
          <div className="metric-label">Total KPIs</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics.companies}</div>
          <div className="metric-label">Entreprises</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics.unique_topics}</div>
          <div className="metric-label">Topics Uniques</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {metrics.last_extraction !== 'Unknown' 
              ? new Date(metrics.last_extraction).toLocaleDateString()
              : 'Unknown'
            }
          </div>
          <div className="metric-label">Dernière Extraction</div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="export-section">
        <h3>Export Data</h3>
        <div className="export-buttons">
          <button onClick={() => handleExport('csv')} className="export-btn">
            📥 Download CSV
          </button>
          <button onClick={() => handleExport('excel')} className="export-btn">
            📥 Download Excel
          </button>
        </div>
      </div>

      {/* Benchmark Table */}
      {benchmark.length > 0 && (
        <div className="section">
          <h3>✅ Benchmark Rapide — Moyennes par entreprise</h3>
          <div className="table-container">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th>Moyenne</th>
                  <th>Médiane</th>
                  <th>Min</th>
                  <th>Max</th>
                  <th>Écart-type</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {benchmark.map((company, index) => (
                  <tr key={index}>
                    <td>{company.source_file}</td>
                    <td>{company.mean?.toFixed(2) || '0.00'}</td>
                    <td>{company.median?.toFixed(2) || '0.00'}</td>
                    <td>{company.min?.toFixed(2) || '0.00'}</td>
                    <td>{company.max?.toFixed(2) || '0.00'}</td>
                    <td>{company.std?.toFixed(2) || '0.00'}</td>
                    <td>{company.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="charts-grid">
        {/* Bar Chart - Company Averages */}
        {benchmark.length > 0 && (
          <div className="chart-container">
            <h4>Moyenne des KPIs par entreprise</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={benchmark}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="source_file" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="mean" fill="#8884d8" name="Moyenne" />
                <Bar dataKey="median" fill="#82ca9d" name="Médiane" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Confidence Distribution */}
        {chartData.confidence_distribution && Object.keys(chartData.confidence_distribution).length > 0 && (
          <div className="chart-container">
            <h4>Distribution des scores de confiance</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(chartData.confidence_distribution)
                    .map(([confidence, count]) => ({
                      name: `Conf ${parseFloat(confidence).toFixed(2)}`,
                      value: count
                    }))
                    .filter(item => item.value > 0)
                  }
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(chartData.confidence_distribution)
                    .filter(([_, count]) => count > 0)
                    .map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {benchmark.length === 0 && (
        <div className="no-charts">
          <p>No chart data available. Process some PDFs to see visualizations.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;