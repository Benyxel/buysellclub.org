import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/TokenDebugger.css';

const TokenDebugger = () => {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawToken, setRawToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setLoading(true);
        // Get token from localStorage
        const token = localStorage.getItem('token');
        setRawToken(token || 'No token found in localStorage');
        
        if (!token) {
          setError('No token found in localStorage');
          setLoading(false);
          return;
        }

        // Call the debug endpoint
        const response = await axios.get('/api/debug/token', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setTokenData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching token data:', err);
        setError(err.response?.data?.message || err.message || 'Unknown error occurred');
        setLoading(false);
      }
    };

    fetchTokenData();
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const decodeToken = (token) => {
    try {
      if (!token || token === 'No token found in localStorage') return null;
      
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decoding token:', e);
      return { error: 'Could not decode token' };
    }
  };

  const decodedToken = decodeToken(rawToken);

  return (
    <div className="token-debugger-container">
      <h1>Token Debugger</h1>
      <button className="back-button" onClick={handleGoBack}>Back</button>
      
      {loading ? (
        <div className="loading">Loading token data...</div>
      ) : error ? (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      ) : (
        <div className="token-data">
          <h3>Token Verification Response</h3>
          <div className="data-section">
            <p><strong>Status:</strong> {tokenData?.success ? 'Valid' : 'Invalid'}</p>
            <p><strong>Message:</strong> {tokenData?.message}</p>
            
            {tokenData?.tokenData && (
              <>
                <h4>Token Data</h4>
                <div className="token-details">
                  <p><strong>User ID:</strong> {tokenData.tokenData.userId}</p>
                  <p><strong>Role:</strong> {tokenData.tokenData.role}</p>
                  <p><strong>Issued At:</strong> {formatTime(tokenData.tokenData.iat)}</p>
                  <p><strong>Expires At:</strong> {formatTime(tokenData.tokenData.exp)}</p>
                </div>
              </>
            )}
          </div>
          
          <h3>Raw Token</h3>
          <div className="raw-token">
            <textarea readOnly value={rawToken}></textarea>
          </div>
          
          <h3>Decoded Token Payload (Client-side)</h3>
          <div className="decoded-token">
            {decodedToken ? (
              <pre>{JSON.stringify(decodedToken, null, 2)}</pre>
            ) : (
              <p>No valid token to decode</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDebugger; 