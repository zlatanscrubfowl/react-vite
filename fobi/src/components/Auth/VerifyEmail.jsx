import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import './Auth.css';

const VerifyEmail = () => {
  const { token, tokenType } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyEmail();
  }, [token, tokenType]);

  const verifyEmail = async () => {
    try {
      // Ubah method dari POST ke GET
      const response = await apiFetch(`/verify-email/${token}/${tokenType}`, {
        method: 'GET', // Ubah ke GET
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(getSuccessMessage(tokenType));
        
        // Jika ini verifikasi email utama FOBI
        if (tokenType === 'email_verification_token') {
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                verificationSuccess: true,
                message: 'Email berhasil diverifikasi. Silakan login.'
              }
            });
          }, 1500);
        } else {
          // Untuk verifikasi Burungnesia/Kupunesia, kembali ke dashboard
          setTimeout(() => {
            navigate('/', { 
              state: { 
                verificationSuccess: true,
                message: getSuccessMessage(tokenType)
              }
            });
          }, 1500);
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Verifikasi email gagal. Token mungkin sudah kadaluarsa.');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Terjadi kesalahan saat memverifikasi email.');
      console.error('Error during email verification:', err);
    }
  };

  const getSuccessMessage = (type) => {
    switch (type) {
      case 'email_verification_token':
        return 'Email Talinara Anda berhasil diverifikasi!';
      case 'burungnesia_email_verification_token':
        return 'Email Burungnesia Anda berhasil diverifikasi! Data Burungnesia Anda akan segera tersinkronisasi.';
      case 'kupunesia_email_verification_token':
        return 'Email Kupunesia Anda berhasil diverifikasi! Data Kupunesia Anda akan segera tersinkronisasi.';
      default:
        return 'Email berhasil diverifikasi!';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Verifikasi Email</h2>
          </div>

          <div className={`verification-status ${status}`}>
            {status === 'verifying' && (
              <div className="verification-loading">
                <div className="spinner"></div>
                <p>Memverifikasi email Anda...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="verification-success">
                <div className="success-icon">✓</div>
                <h3>Verifikasi Berhasil!</h3>
                <p>{message}</p>
              </div>
            )}

            {status === 'error' && (
              <div className="verification-error">
                <div className="error-icon">✕</div>
                <h3>Verifikasi Gagal</h3>
                <p>{message}</p>
                <button 
                  onClick={() => navigate('/login')}
                  className="auth-button"
                >
                  Kembali ke Login
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;