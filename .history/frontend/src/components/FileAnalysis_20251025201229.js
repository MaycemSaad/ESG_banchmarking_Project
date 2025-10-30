import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './FileAnalysis.css';

const FileAnalysis = ({ fileData, onViewGlobalDashboard, onAnalyzeAnotherFile }) => {
  const [analysisData, setAnalysisData] = useState(null);

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
      const topic = kpi.topic_fr || kpi.topic || 'Unknown';
      if (!topicStats[topic]) {
        topicStats[topic] = {
          count: 0,
          totalConfidence: 0,
          values: []
        };
      }
      topicStats[topic].count++;
      topicStats[topic].totalConfidence += kpi.confidence;
      topicStats[topic].values.push(kpi.value);
    });

    // Préparer les données pour les graphiques
    const topicChartData = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      count: stats.count,
      avgConfidence: stats.totalConfidence / stats.count,
      avgValue: stats.values.reduce((a, b) => a + b, 0) / stats.values.length
    }));

    const confidenceDistribution = {};
    results.forEach(kpi => {
      const confidenceLevel = Math.floor(kpi.confidence * 10) / 10;
      confidenceDistribution[confidenceLevel] = (confidenceDistribution[confidenceLevel] || 0) + 1;
    });

    const confidenceChartData = Object.entries(confidenceDistribution).map(([level, count]) => ({
      level: `Conf ${parseFloat(level).toFixed(1)}`,
      count
    }));

    setAnalysisData({
      topicChartData,
      confidenceChartData,
      kpiList: results,
      summary: {
        totalKPIs: results.length,
        uniqueTopics: Object.keys(topicStats).length,
        avgConfidence: results.reduce((sum, kpi) => sum + kpi.confidence, 0) / results.length,
        minValue: Math.min(...results.map(kpi => kpi.value)),
        maxValue: Math.max(...results.map(kpi => kpi.value)),
        avgValue: results.reduce((sum, kpi) => sum + kpi.value, 0) / results.length
      }
    });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (!analysisData) {
    return <div className="file-analysis-loading">Processing analysis data...</div>;
  }

  return (
    <div className="file-analysis-container">
      <div className="analysis-header">
        <h2>🔍 File Analysis: {fileData.pdf_name}</h2>
        <div className="header-actions">
          <button onClick={onAnalyzeAnotherFile} className="action-btn outline">
            📂 Analyze Another File
          </button>
          <button onClick={onViewGlobalDashboard} className="action-btn primary">
            📊 View Global Dashboard
          </button>
        </div>
      </div>

      {/* File Information */}
      <div className="file-info-section">
        <h3>📄 File Information</h3>
        <div className="file-info-grid">
          <div className="info-item">
            <label>PDF File:</label>
            <span>{fileData.pdf_name}</span>
          </div>
          <div className="info-item">
            <label>KPI File:</label>
            <span>{fileData.kpiFile}</span>
          </div>
          <div className="info-item">
            <label>Confidence Threshold:</label>
            <span>{fileData.minConfidence}</span>
          </div>
          <div className="info-item">
            <label>Processing Date:</label>
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="summary-section">
        <h3>📊 Extraction Summary</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{analysisData.summary.totalKPIs}</div>
            <div className="summary-label">Total KPIs Extracted</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{analysisData.summary.uniqueTopics}</div>
            <div className="summary-label">Unique Topics</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{analysisData.summary.avgConfidence.toFixed(3)}</div>
            <div className="summary-label">Average Confidence</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{analysisData.summary.avgValue.toFixed(2)}</div>
            <div className="summary-label">Average KPI Value</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-section">
        <div className="chart-row">
          {/* KPIs by Topic */}
          <div className="chart-container">
            <h4>KPIs by Topic</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysisData.topicChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Number of KPIs" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Confidence Distribution */}
          <div className="chart-container">
            <h4>Confidence Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analysisData.confidenceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analysisData.confidenceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Extracted KPIs Table */}
      <div className="kpi-table-section">
        <h3>📋 Extracted KPIs</h3>
        <div className="table-container">
          <table className="kpi-table">
            <thead>
              <tr>
                <th>KPI Name</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Topic</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {analysisData.kpiList.map((kpi, index) => (
                <tr key={index}>
                  <td>{kpi.kpi_name}</td>
                  <td className="value-cell">{kpi.value}</td>
                  <td>{kpi.unit}</td>
                  <td>{kpi.topic_fr || kpi.topic}</td>
                  <td>
                    <span className={`confidence-badge confidence-${Math.floor(kpi.confidence * 10)}`}>
                      {kpi.confidence.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-section">
        <button onClick={onAnalyzeAnotherFile} className="action-btn outline large">
          📂 Analyze Another File
        </button>
        <button onClick={onViewGlobalDashboard} className="action-btn primary large">
          📊 View Global Dashboard
        </button>
      </div>
    </div>
  );
};

export default FileAnalysis;