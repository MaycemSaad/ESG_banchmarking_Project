import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import './ConnectionTest.css';

const ConnectionTest = () => {
  const [status, setStatus] = useState('testing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setStatus('testing');
      setMessage('Testing connection to backend...');
      
      const response = await apiService.healthCheck();
      
      setStatus('connected');
      setMessage(`✅ Backend connected successfully! Server: ${response.data.message}`);
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Connection failed: ${error.message}`);
    }
  };

  return (
    <div className={`connection-test ${status}`}>
      <div className="connection-content">
        <strong>Backend Connection:</strong> {message}
        {status === 'error' && (
          <button 
            onClick={testConnection}
            className="retry-btn"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ConnectionTest;