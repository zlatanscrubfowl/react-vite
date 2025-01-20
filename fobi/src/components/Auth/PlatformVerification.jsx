import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import './Auth.css';
import burungnesiaBirdIcon from '../../assets/icon/icon.png';
import kupunesiaIcon from '../../assets/icon/kupnes.png';

const PlatformVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, platform } = location.state || {};
  const [verificationStatus, setVerificationStatus] = useState({
    loading: false,
    success: false,
    error: ''
  });

  const handleResendVerification = async () => {
    setVerificationStatus({ loading: true, success: false, error: '' });
    
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/resend-platform-verification/${platform}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengirim ulang email verifikasi');
      }

      setVerificationStatus({
        loading: false,
        success: true,
        error: ''
      });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setVerificationStatus(prev => ({ ...prev, success: false }));
      }, 5000);

    } catch (err) {
      setVerificationStatus({
        loading: false,
        success: false,
        error: err.message
      });
    }
  };

  const getPlatformInfo = () => {
    switch (platform) {
      case 'burungnesia':
        return {
          name: 'Burungnesia',
          icon: '/icon.png',
          color: 'bg-blue-500'
        };
      case 'kupunesia':
        return {
          name: 'Kupunesia',
          icon: '/kupnes.png',
          color: 'bg-purple-500'
        };
      default:
        return {
          name: 'Platform',
          icon: '📱',
          color: 'bg-gray-500'
        };
    }
  };

  const platformInfo = getPlatformInfo();

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Verifikasi {platformInfo.name}</h2>
            <p className="auth-subtitle">Silakan periksa email Anda</p>
          </div>

          <div className="verification-info">
            <div className="verification-step">
              <div className={`step-number ${platformInfo.color}`}>
                {platform === 'default' ? (
                  <span>{platformInfo.icon}</span>
                ) : (
                  <img 
                    src={platformInfo.icon}
                    alt={`${platformInfo.name} Icon`}
                    className="w-6 h-6"
                  />
                )}
              </div>
              <div className="step-content">
                <h3>Email {platformInfo.name}</h3>
                <p>Link verifikasi telah dikirim ke: <strong>{email}</strong></p>
                <p>Silakan klik link dalam email untuk menautkan akun {platformInfo.name} Anda.</p>
              </div>
            </div>

            <div className="verification-actions">
              <button 
                onClick={() => window.location.href = `mailto:${email}`}
                className="auth-button secondary"
              >
                <span className="button-icon">📧</span>
                Buka Email
              </button>
              <button 
                onClick={() => navigate('/sync-accounts')}
                className="auth-button"
              >
                <span className="button-icon">⚙️</span>
                Kembali ke Pengaturan
              </button>
            </div>

            <div className="verification-help">
              <p>Tidak menerima email? Periksa folder spam atau</p>
              <button 
                onClick={handleResendVerification}
                className="text-button"
                disabled={verificationStatus.loading}
              >
                {verificationStatus.loading ? 'Mengirim...' : 'kirim ulang email verifikasi'}
              </button>

              {verificationStatus.success && (
                <div className="success-message">
                  Email verifikasi telah dikirim ulang!
                </div>
              )}

              {verificationStatus.error && (
                <div className="error-message">
                  {verificationStatus.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformVerification; 