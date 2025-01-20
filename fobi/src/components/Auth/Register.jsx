import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';
import { apiFetch } from '../../utils/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    uname: '',
    password: '',
    phone: '',
    organization: '',
    burungnesia_email: '',
    kupunesia_email: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Hapus pesan error saat user mengetik
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const response = await apiFetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify(formData),
      });

      // Debug response headers
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Get raw response text first
      const rawText = await response.text();
      console.log('Raw response:', rawText);

      // Try parsing manually
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('Parse error details:', parseError);
        throw new Error(`Failed to parse response: ${rawText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else if (data.error) {
          // Handle specific error messages
          switch (data.error) {
            case 'EMAIL_EXISTS':
              setErrors({ email: 'Email sudah terdaftar' });
              break;
            case 'USERNAME_EXISTS':
              setErrors({ uname: 'Username sudah digunakan' });
              break;
            default:
              setErrors({ general: data.error || 'Terjadi kesalahan saat mendaftar' });
          }
        }
        return;
      }

      // Registrasi berhasil
      setSuccessMessage(
        `Pendaftaran berhasil! Silakan cek email Anda di ${formData.email} untuk verifikasi akun.
         ${formData.burungnesia_email ? '\nEmail Burungnesia akan diverifikasi secara terpisah.' : ''}
         ${formData.kupunesia_email ? '\nEmail Kupunesia akan diverifikasi secara terpisah.' : ''}`
      );
      
      // Tunggu sebentar sebelum redirect
      setTimeout(() => {
        navigate('/verification-pending', { 
          state: { 
            email: formData.email,
            hasBurungnesia: !!formData.burungnesia_email,
            hasKupunesia: !!formData.kupunesia_email
          }
        });
      }, 3000);

    } catch (err) {
      console.error('Error during registration:', err);
      setErrors({
        general: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Daftar Akun FOBI</h2>
            <p className="auth-subtitle">Bergabunglah dengan Komunitas Citizen Science Indonesia</p>
          </div>

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="fname">Nama Depan <span className="required">*</span></label>
              <input
                id="fname"
                type="text"
                name="fname"
                value={formData.fname}
                onChange={handleChange}
                required
                className={`auth-input ${errors.fname ? 'error' : ''}`}
              />
              {errors.fname && <span className="error-message">{errors.fname}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="lname">Nama Belakang <span className="required">*</span></label>
              <input
                id="lname"
                type="text"
                name="lname"
                value={formData.lname}
                onChange={handleChange}
                required
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email <span className="required">*</span></label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className={`auth-input ${errors.email ? 'error' : ''}`}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="uname">Username <span className="required">*</span></label>
              <input
                id="uname"
                type="text"
                name="uname"
                value={formData.uname}
                onChange={handleChange}
                required
                className={`auth-input ${errors.uname ? 'error' : ''}`}
              />
              {errors.uname && <span className="error-message">{errors.uname}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password <span className="required">*</span></label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Nomor Telepon <span className="required">*</span></label>
              <input
                id="phone"
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="organization">Organisasi <span className="required">*</span></label>
              <input
                id="organization"
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleChange}
                required
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="burungnesia_email">Email Burungnesia (Opsional)</label>
              <input
                id="burungnesia_email"
                type="email"
                name="burungnesia_email"
                value={formData.burungnesia_email}
                onChange={handleChange}
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="kupunesia_email">Email Kupunesia (Opsional)</label>
              <input
                id="kupunesia_email"
                type="email"
                name="kupunesia_email"
                value={formData.kupunesia_email}
                onChange={handleChange}
                className="auth-input"
              />
            </div>

            {errors.general && (
              <div className="error-message general-error">
                {errors.general}
              </div>
            )}

            <button 
              type="submit" 
              className="auth-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Mendaftar...' : 'Daftar'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Sudah punya akun? <a href="/login">Masuk di sini</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;