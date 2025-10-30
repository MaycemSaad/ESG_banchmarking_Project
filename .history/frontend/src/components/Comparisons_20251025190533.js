import React, { useState, useEffect } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import apiService from '../services/api';
import './Comparisons.css';

const Comparisons = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compareBy, setCompareBy] = useState('topic_fr');
  const [minConfidence, setMinConfidence] = useState(0.5);

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
      setSelectedCompanies(response.data.slice(0, 3));
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
    }
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (companies.length === 0) {
    return (
      <div className="comparisons-container">
        <div className="no-data">
          <h3>No companies available</h3>
          <p>Process some PDFs to see comparisons.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="comparisons-container">
      <h2>⚖️ Comparaisons multi-entreprises</h2>

      <div className="controls-section">
        <div className="control-group">
          <label>Sélectionner les entreprises à comparer (max 6):</label>
          <div className="companies-checkboxes">
            {companies.map(company => (
              <label key={company} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedCompanies.includes(company)}
                  onChange={() => handleCompanyToggle(company)}
                  disabled={!selectedCompanies.includes(company) && selectedCompanies.length >= 6}
                />
                {company}
              </label>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Comparer par:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="topic_fr"
                checked={compareBy === 'topic_fr'}
                onChange={(e) => setCompareBy(e.target.value)}
              />
              Topic Français
            </label>
            <label>
              <input
                type="radio"
                value="kpi_name"
                checked={compareBy === 'kpi_name'}
                onChange={(e) => setCompareBy(e.target.value)}
              />
              KPI Name
            </label>
          </div>
        </div>

        <div className="control-group">
          <label>Confiance min: {minConfidence.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="confidence-slider"
          />
        </div>
      </div>

      {loading && (
        <div className="loading">Loading comparison data...</div>
      )}

      {error && (
        <div className="error">
          <h3>Error loading comparison data</h3>
          <p>{error}</p>
          <button onClick={loadComparisonData} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      )}

      {comparisonData && !loading && selectedCompanies.length > 0 && (
        <>
          {/* Radar Chart */}
          <div className="chart-section">
            <h3>🌍 Radar Chart — profil comparatif</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart data={comparisonData.radar_data.categories.map((category, index) => {
                  const dataPoint = { category };
                  selectedCompanies.forEach(company => {
                    dataPoint[company] = comparisonData.radar_data.companies[company]?.[index] || 0;
                  });
                  return dataPoint;
                })}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis />
                  {selectedCompanies.map((company, index) => (
                    <Radar
                      key={company}
                      name={company}
                      dataKey={company}
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Similarity Matrix */}
          {comparisonData.similarity_data && (
            <div className="chart-section">
              <h3>🔁 Similarité entre entreprises (cosine)</h3>
              <div className="similarity-matrix">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      {comparisonData.similarity_data.companies.map(company => (
                        <th key={company}>{company}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.similarity_data.matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="company-name">{comparisonData.similarity_data.companies[i]}</td>
                        {row.map((value, j) => (
                          <td 
                            key={j}
                            className="similarity-cell"
                            style={{
                              backgroundColor: `rgba(0, 136, 254, ${value})`,
                              color: value > 0.5 ? 'white' : 'black'
                            }}
                          >
                            {value.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bar Charts for each category */}
          {comparisonData.radar_data.categories.length > 0 && (
            <div className="chart-section">
              <h3>📊 Comparaison par catégorie</h3>
              <div className="bar-charts-grid">
                {comparisonData.radar_data.categories.slice(0, 6).map(category => (
                  <div key={category} className="bar-chart-container">
                    <h4>{category}</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={selectedCompanies.map(company => ({
                          company,
                          value: comparisonData.radar_data.companies[company]?.[
                            comparisonData.radar_data.categories.indexOf(category)
                          ] || 0
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="company" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedCompanies.length === 0 && !loading && (
        <div className="no-selection">
          <p>Veuillez sélectionner au moins une entreprise pour voir les comparaisons.</p>
        </div>
      )}
    </div>
  );
};

export default Comparisons;