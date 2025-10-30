import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import './Statistics.css';

const Statistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getStatistics();
      setStatistics(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="statistics-container">
        <div className="error">
          <h3>Error loading statistics</h3>
          <p>{error}</p>
          <button onClick={loadStatistics} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="statistics-container">
        <div className="no-data">
          <h3>No statistics available</h3>
          <p>Process some PDFs to see statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <h2>📊 Database Statistics</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{statistics.total_kpis}</div>
          <div className="stat-label">Total KPIs</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{statistics.companies}</div>
          <div className="stat-label">Companies</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{statistics.unique_topics}</div>
          <div className="stat-label">Unique Topics</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {statistics.last_extraction !== 'Unknown' 
              ? new Date(statistics.last_extraction).toLocaleString()
              : 'Unknown'
            }
          </div>
          <div className="stat-label">Last Extraction</div>
        </div>
      </div>

      <div className="processed-files">
        <h3>Processed Files</h3>
        {statistics.processed_files.length === 0 ? (
          <p className="no-files">No files processed yet.</p>
        ) : (
          <div className="files-list">
            {statistics.processed_files.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-name">{file.filename}</span>
                <span className="file-count">{file.kpi_count} KPIs</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;