import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileUpload.css';

const FileUpload = ({ onProcess, isLoading }) => {
  const [kpiFile, setKpiFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [rerunIfExists, setRerunIfExists] = useState(false);

  const onKpiDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setKpiFile(acceptedFiles[0]);
    }
  }, []);

  const onPdfDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setPdfFile(acceptedFiles[0]);
    }
  }, []);

  const {
    getRootProps: getKpiRootProps,
    getInputProps: getKpiInputProps,
    isDragActive: isKpiDragActive
  } = useDropzone({
    onDrop: onKpiDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const {
    getRootProps: getPdfRootProps,
    getInputProps: getPdfInputProps,
    isDragActive: isPdfDragActive
  } = useDropzone({
    onDrop: onPdfDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleProcess = () => {
    if (kpiFile && pdfFile) {
      onProcess(kpiFile, pdfFile, minConfidence, rerunIfExists);
    }
  };

  const clearFiles = () => {
    setKpiFile(null);
    setPdfFile(null);
  };

  return (
    <div className="file-upload-container">
      <h2>📂 Upload Files</h2>
      
      <div className="upload-section">
        <div className="upload-group">
          <label>KPI File (.xlsx / .csv)</label>
          <div 
            {...getKpiRootProps()} 
            className={`dropzone ${isKpiDragActive ? 'active' : ''} ${kpiFile ? 'has-file' : ''}`}
          >
            <input {...getKpiInputProps()} />
            {kpiFile ? (
              <div className="file-info">
                <span className="file-name">✓ {kpiFile.name}</span>
                <span className="file-size">({(kpiFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div className="dropzone-content">
                {isKpiDragActive ? (
                  <p>Drop the KPI file here...</p>
                ) : (
                  <p>Drag & drop KPI file here, or click to select</p>
                )}
                <em>(Excel .xlsx/.xls or CSV .csv)</em>
              </div>
            )}
          </div>
        </div>

        <div className="upload-group">
          <label>PDF to Analyze</label>
          <div 
            {...getPdfRootProps()} 
            className={`dropzone ${isPdfDragActive ? 'active' : ''} ${pdfFile ? 'has-file' : ''}`}
          >
            <input {...getPdfInputProps()} />
            {pdfFile ? (
              <div className="file-info">
                <span className="file-name">✓ {pdfFile.name}</span>
                <span className="file-size">({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            ) : (
              <div className="dropzone-content">
                {isPdfDragActive ? (
                  <p>Drop the PDF file here...</p>
                ) : (
                  <p>Drag & drop PDF file here, or click to select</p>
                )}
                <em>(PDF files only)</em>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="setting-group">
          <label htmlFor="min-confidence">
            Min Confidence Filter: <strong>{minConfidence.toFixed(2)}</strong>
          </label>
          <input
            id="min-confidence"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="confidence-slider"
          />
          <div className="slider-labels">
            <span>0.00</span>
            <span>0.50</span>
            <span>1.00</span>
          </div>
        </div>

        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={rerunIfExists}
              onChange={(e) => setRerunIfExists(e.target.checked)}
            />
            Re-process even if PDF was already processed
          </label>
        </div>
      </div>

      <div className="action-buttons">
        <button
          onClick={handleProcess}
          disabled={!kpiFile || !pdfFile || isLoading}
          className={`process-btn ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? (
            <>
              <div className="spinner"></div>
              Processing...
            </>
          ) : (
            '▶️ Process PDF'
          )}
        </button>
        
        <button
          onClick={clearFiles}
          disabled={isLoading}
          className="clear-btn"
        >
          🗑️ Clear Files
        </button>
      </div>

      {(!kpiFile || !pdfFile) && (
        <div className="upload-hint">
          <p>Please upload both KPI file and PDF to start processing.</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;