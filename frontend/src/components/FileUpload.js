import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  FileText, 
  BarChart3, 
  Settings, 
  Play,
  Trash2,
  Zap,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import './FileUpload.css';

const FileUpload = ({ onProcess, isLoading, darkMode = false }) => {
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

  const getFileIcon = (file) => {
    if (!file) return <FileText size={24} />;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText size={24} className="file-icon pdf" />;
      case 'xlsx':
      case 'xls':
        return <BarChart3 size={24} className="file-icon excel" />;
      case 'csv':
        return <BarChart3 size={24} className="file-icon csv" />;
      default:
        return <FileText size={24} />;
    }
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return { label: 'Élevée', color: '#10b981' };
    if (confidence >= 0.6) return { label: 'Bonne', color: '#f59e0b' };
    if (confidence >= 0.4) return { label: 'Moyenne', color: '#f59e0b' };
    return { label: 'Faible', color: '#ef4444' };
  };

  const confidenceLevel = getConfidenceLevel(minConfidence);

  return (
    <div className={`file-upload-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="upload-header">
        <div className="header-content">
          <div className="header-title">
            <Upload size={28} className="header-icon" />
            <div>
              <h2>Traitement de fichiers ESG</h2>
              <p>Importez vos fichiers pour l'analyse automatique des KPIs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Sections */}
      <div className="upload-sections">
        {/* KPI File Upload */}
        <div className="upload-section">
          <div className="section-header">
            <div className="section-title">
              <BarChart3 size={20} />
              <h3>Fichier de définition des KPIs</h3>
            </div>
            <div className="supported-formats">
              Formats supportés: .xlsx, .xls, .csv
            </div>
          </div>
          
          <div 
            {...getKpiRootProps()} 
            className={`dropzone ${isKpiDragActive ? 'active' : ''} ${kpiFile ? 'has-file' : ''}`}
          >
            <input {...getKpiInputProps()} />
            {kpiFile ? (
              <div className="file-info">
                <div className="file-icon-container">
                  {getFileIcon(kpiFile)}
                  <CheckCircle size={16} className="file-status success" />
                </div>
                <div className="file-details">
                  <span className="file-name">{kpiFile.name}</span>
                  <span className="file-meta">
                    {(kpiFile.size / 1024).toFixed(1)} KB • 
                    {kpiFile.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="dropzone-content">
                <div className="dropzone-icon">
                  <BarChart3 size={48} className="upload-icon" />
                </div>
                <div className="dropzone-text">
                  {isKpiDragActive ? (
                    <p className="drag-active">Déposez le fichier KPI ici...</p>
                  ) : (
                    <p className="drag-inactive">Glissez-déposez votre fichier KPI ou cliquez pour sélectionner</p>
                  )}
                  <p className="format-info">Excel (.xlsx, .xls) ou CSV (.csv)</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PDF File Upload */}
        <div className="upload-section">
          <div className="section-header">
            <div className="section-title">
              <FileText size={20} />
              <h3>Rapport PDF à analyser</h3>
            </div>
            <div className="supported-formats">
              Format supporté: .pdf
            </div>
          </div>
          
          <div 
            {...getPdfRootProps()} 
            className={`dropzone ${isPdfDragActive ? 'active' : ''} ${pdfFile ? 'has-file' : ''}`}
          >
            <input {...getPdfInputProps()} />
            {pdfFile ? (
              <div className="file-info">
                <div className="file-icon-container">
                  {getFileIcon(pdfFile)}
                  <CheckCircle size={16} className="file-status success" />
                </div>
                <div className="file-details">
                  <span className="file-name">{pdfFile.name}</span>
                  <span className="file-meta">
                    {(pdfFile.size / 1024 / 1024).toFixed(1)} MB • PDF
                  </span>
                </div>
              </div>
            ) : (
              <div className="dropzone-content">
                <div className="dropzone-icon">
                  <FileText size={48} className="upload-icon" />
                </div>
                <div className="dropzone-text">
                  {isPdfDragActive ? (
                    <p className="drag-active">Déposez le fichier PDF ici...</p>
                  ) : (
                    <p className="drag-inactive">Glissez-déposez votre rapport PDF ou cliquez pour sélectionner</p>
                  )}
                  <p className="format-info">Document PDF (.pdf)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="settings-section">
        <div className="section-header">
          <Settings size={20} />
          <h3>Paramètres de traitement</h3>
        </div>

        <div className="settings-grid">
          {/* Confidence Slider */}
          <div className="setting-card">
            <div className="setting-header">
              <Shield size={18} />
              <label htmlFor="min-confidence">
                Niveau de confiance minimum
              </label>
              <div className="confidence-value">
                <span className="value">{minConfidence.toFixed(2)}</span>
                <span 
                  className="confidence-level"
                  style={{ color: confidenceLevel.color }}
                >
                  {confidenceLevel.label}
                </span>
              </div>
            </div>
            
            <div className="slider-container">
              <input
                id="min-confidence"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="confidence-slider"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)`
                }}
              />
              <div className="slider-labels">
                <span>0.00</span>
                <span>0.50</span>
                <span>1.00</span>
              </div>
            </div>
            
            <div className="setting-description">
              Définissez le niveau de confiance minimum pour l'extraction des KPIs
            </div>
          </div>

          {/* Processing Options */}
          <div className="setting-card">
            <div className="setting-header">
              <Zap size={18} />
              <label>Options de traitement</label>
            </div>
            
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rerunIfExists}
                  onChange={(e) => setRerunIfExists(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">
                  Retraiter même si le PDF a déjà été analysé
                </span>
              </label>
            </div>
            
            <div className="setting-description">
              Forcer le retraitement et écraser les résultats existants
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-section">
        <div className="action-buttons">
          <button
            onClick={handleProcess}
            disabled={!kpiFile || !pdfFile || isLoading}
            className={`process-btn ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? (
              <>
                <Loader size={18} className="spinner" />
                <span>Traitement en cours...</span>
              </>
            ) : (
              <>
                <Play size={18} />
                <span>Démarrer l'analyse</span>
              </>
            )}
          </button>
          
          <button
            onClick={clearFiles}
            disabled={isLoading || (!kpiFile && !pdfFile)}
            className="clear-btn"
          >
            <Trash2 size={18} />
            <span>Effacer les fichiers</span>
          </button>
        </div>

        {(!kpiFile || !pdfFile) && (
          <div className="upload-hint">
            <AlertCircle size={16} />
            <p>Veuillez sélectionner les deux fichiers pour démarrer le traitement</p>
          </div>
        )}

        {kpiFile && pdfFile && !isLoading && (
          <div className="ready-hint">
            <CheckCircle size={16} />
            <div>
              <p className="ready-title">Prêt pour l'analyse !</p>
              <p className="ready-description">
                Les fichiers sont validés. Cliquez sur "Démarrer l'analyse" pour lancer l'extraction des KPIs.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="stats-section">
        <div className="stat-item">
          <div className="stat-icon">
            <Zap size={16} />
          </div>
          <div className="stat-content">
            <div className="stat-value">95%</div>
            <div className="stat-label">Précision IA</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">
            <BarChart3 size={16} />
          </div>
          <div className="stat-content">
            <div className="stat-value">50+</div>
            <div className="stat-label">KPIs standards</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon">
            <Shield size={16} />
          </div>
          <div className="stat-content">
            <div className="stat-value">100%</div>
            <div className="stat-label">Données sécurisées</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;