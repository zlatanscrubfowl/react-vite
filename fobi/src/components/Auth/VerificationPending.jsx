import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import './Auth.css';

const VerificationPending = () => {
  const location = useLocation();
  const { email, hasBurungnesia, hasKupunesia } = location.state || {};
  const [resendStatus, setResendStatus] = useState({
    loading: false,
    success: false,
    error: ''
  });

  const handleResendVerification = async () => {
    setResendStatus({ loading: true, success: false, error: '' });
    
    try {
      const response = await apiFetch('/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal mengirim ulang email verifikasi');
      }

      setResendStatus({
        loading: false,
        success: true,
        error: ''
      });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setResendStatus(prev => ({ ...prev, success: false }));
      }, 5000);

    } catch (err) {
      setResendStatus({
        loading: false,
        success: false,
        error: err.message
      });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Verifikasi Email</h2>
            <p className="auth-subtitle">Silakan periksa email Anda</p>
          </div>

          <div className="verification-info">
            <div className="verification-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Email Talinara</h3>
                <p>Link verifikasi telah dikirim ke: <strong>{email}</strong></p>
                <p>Silakan klik link dalam email untuk mengaktifkan akun Anda.</p>
              </div>
            </div>

            {(hasBurungnesia || hasKupunesia) && (
              <div className="verification-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>Integrasi Akun</h3>
                  {hasBurungnesia && (
                    <div className="integration-item">
                      <span className="integration-icon">
                        <img 
                          src="/icon.png"
                          alt="Burungnesia Icon"
                          className="w-6 h-6 inline-block"
                        />
                      </span>
                      <p>Email verifikasi Burungnesia akan dikirim setelah verifikasi Talinara selesai</p>
                    </div>
                  )}
                  {hasKupunesia && (
                    <div className="integration-item">
                      <span className="integration-icon">
                        <img 
                          src="/kupnes.png"
                          alt="Kupunesia Icon"
                          className="w-6 h-6 inline-block"
                        />
                      </span>
                      <p>Email verifikasi Kupunesia akan dikirim setelah verifikasi Talinara selesai</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="verification-actions">
              <button 
                onClick={() => window.location.href = `mailto:${email}`}
                className="auth-button secondary"
              >
                <span className="button-icon">📧</span>
                Buka Email
              </button>
              <Link to="/login" className="auth-button">
                <span className="button-icon">➜</span>
                Lanjut ke Login
              </Link>
            </div>

            <div className="verification-help">
              <p>Tidak menerima email? Periksa folder spam atau</p>
              <button 
                onClick={handleResendVerification}
                className="text-button"
                disabled={resendStatus.loading}
              >
                {resendStatus.loading ? 'Mengirim...' : 'kirim ulang email verifikasi'}
              </button>

              {resendStatus.success && (
                <div className="success-message">
                  Email verifikasi telah dikirim ulang!
                </div>
              )}

              {resendStatus.error && (
                <div className="error-message">
                  {resendStatus.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;