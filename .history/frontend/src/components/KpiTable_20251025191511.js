import React, { useState, useMemo } from 'react';
import './KpiTable.css';

const KpiTable = ({ data, title, showFilters = true, showExport = true }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    kpiName: '',
    topic: '',
    unit: '',
    confidenceMin: 0,
    confidenceMax: 1
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Columns configuration
  const columns = [
    { key: 'kpi_name', label: 'KPI Name', sortable: true, filterable: true },
    { key: 'value', label: 'Value', sortable: true, filterable: false },
    { key: 'unit', label: 'Unit', sortable: true, filterable: true },
    { key: 'source_file', label: 'Source File', sortable: true, filterable: true },
    { key: 'topic_fr', label: 'Topic FR', sortable: true, filterable: true },
    { key: 'topic', label: 'Topic', sortable: true, filterable: true },
    { key: 'confidence', label: 'Confidence', sortable: true, filterable: true },
    { key: 'extraction_date', label: 'Extraction Date', sortable: true, filterable: false }
  ];

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!data) return [];

    let filtered = data.filter(item => {
      return (
        item.kpi_name?.toLowerCase().includes(filters.kpiName.toLowerCase()) &&
        (filters.topic === '' || item.topic_fr?.toLowerCase().includes(filters.topic.toLowerCase()) || item.topic?.toLowerCase().includes(filters.topic.toLowerCase())) &&
        (filters.unit === '' || item.unit?.toLowerCase().includes(filters.unit.toLowerCase())) &&
        item.confidence >= filters.confidenceMin &&
        item.confidence <= filters.confidenceMax
      );
    });

    // Sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, filters, sortConfig]);

  // Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  // Handlers
  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const headers = columns.map(col => col.label).join(',');
    const csvContent = filteredAndSortedData.map(row => 
      columns.map(col => {
        const value = row[col.key] || '';
        // Escape commas and quotes in CSV
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');

    const csv = `${headers}\n${csvContent}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kpi_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getConfidenceBadge = (confidence) => {
    const level = Math.floor(confidence * 10);
    let className = 'confidence-badge ';
    
    if (level >= 8) className += 'confidence-high';
    else if (level >= 6) className += 'confidence-medium';
    else className += 'confidence-low';

    return (
      <span className={className}>
        {confidence.toFixed(3)}
      </span>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="kpi-table-container">
        <div className="no-data">
          <h3>No KPI data available</h3>
          <p>Process some PDFs to see KPI data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-table-container">
      {/* Header */}
      <div className="table-header">
        <h3>{title || 'KPI Data'}</h3>
        <div className="table-controls">
          <span className="results-count">
            Showing {paginatedData.length} of {filteredAndSortedData.length} results
          </span>
          {showExport && (
            <button onClick={handleExportCSV} className="export-btn">
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="table-filters">
          <div className="filter-group">
            <label>KPI Name:</label>
            <input
              type="text"
              value={filters.kpiName}
              onChange={(e) => handleFilterChange('kpiName', e.target.value)}
              placeholder="Filter by KPI name..."
            />
          </div>
          
          <div className="filter-group">
            <label>Topic:</label>
            <input
              type="text"
              value={filters.topic}
              onChange={(e) => handleFilterChange('topic', e.target.value)}
              placeholder="Filter by topic..."
            />
          </div>
          
          <div className="filter-group">
            <label>Unit:</label>
            <input
              type="text"
              value={filters.unit}
              onChange={(e) => handleFilterChange('unit', e.target.value)}
              placeholder="Filter by unit..."
            />
          </div>
          
          <div className="filter-group">
            <label>Confidence: {filters.confidenceMin.toFixed(2)} - {filters.confidenceMax.toFixed(2)}</label>
            <div className="confidence-range">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.confidenceMin}
                onChange={(e) => handleFilterChange('confidenceMin', parseFloat(e.target.value))}
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.confidenceMax}
                onChange={(e) => handleFilterChange('confidenceMax', parseFloat(e.target.value))}
              />
            </div>
          </div>

          <button 
            onClick={() => setFilters({
              kpiName: '',
              topic: '',
              unit: '',
              confidenceMin: 0,
              confidenceMax: 1
            })}
            className="clear-filters-btn"
          >
            🗑️ Clear Filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        <table className="kpi-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th 
                  key={column.key}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="th-content">
                    {column.label}
                    {column.sortable && (
                      <span className="sort-indicator">
                        {sortConfig.key === column.key && (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'even' : 'odd'}>
                {columns.map(column => (
                  <td key={column.key}>
                    {column.key === 'confidence' ? (
                      getConfidenceBadge(row[column.key])
                    ) : column.key === 'value' ? (
                      <span className="value-cell">{row[column.key]}</span>
                    ) : (
                      row[column.key] || '-'
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="table-pagination">
        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Previous
          </button>
          
          <span className="page-info">
            Page {currentPage} of {totalPages || 1}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="pagination-btn"
          >
            Next →
          </button>
        </div>
        
        <div className="items-per-page">
          <label>Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="table-summary">
        <div className="summary-item">
          <strong>Total Records:</strong> {data.length}
        </div>
        <div className="summary-item">
          <strong>Filtered Records:</strong> {filteredAndSortedData.length}
        </div>
        <div className="summary-item">
          <strong>Average Confidence:</strong> 
          {(filteredAndSortedData.reduce((sum, item) => sum + (item.confidence || 0), 0) / filteredAndSortedData.length).toFixed(3)}
        </div>
      </div>
    </div>
  );
};

export default KpiTable;