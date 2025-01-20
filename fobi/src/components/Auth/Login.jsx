import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext'; // Import hook useUser
import './Auth.css';
import { apiFetch } from '../../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  const { setUser } = useUser(); // Dapatkan fungsi setUser dari context

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting login with:', { email, password });

    try {
      const response = await apiFetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'EMAIL_NOT_VERIFIED') {
          setError('Email belum diverifikasi. Silakan cek email Anda untuk link verifikasi.');
          return;
        }
        throw new Error(errorData.error || 'Login failed. Please try again.');
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.user && data.user.id) {
        console.log('Login successful');
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_id', data.user.id);
        localStorage.setItem('username', data.user.uname);
        localStorage.setItem('totalObservations', data.user.totalObservations);
        localStorage.setItem('level', data.user.level);
        localStorage.setItem('email', data.user.email);
        localStorage.setItem('burungnesia_user_id', data.user.burungnesia_user_id);
        localStorage.setItem('kupunesia_user_id', data.user.kupunesia_user_id);
        localStorage.setItem('bio', data.user.bio);
        localStorage.setItem('profile_picture', data.user.profile_picture);

        // Fetch all user data
        const userResponse = await apiFetch(`/fobi-users/${data.user.id}`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data.');
        }

        const userData = await userResponse.json();
        console.log('User data:', userData);

        // Fetch total observations
        const observationsResponse = await apiFetch(`/user-total-observations/${data.user.id}`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (!observationsResponse.ok) {
          throw new Error('Failed to fetch total observations.');
        }

        const observationsData = await observationsResponse.json();
        console.log('Total observations:', observationsData);

        // Update user state
        setUser({
          ...userData,
          id: userData.id,
          uname: userData.uname,
          level: userData.level,
          email: userData.email,
          burungnesia_user_id: userData.burungnesia_user_id,
          kupunesia_user_id: userData.kupunesia_user_id,
          bio: userData.bio,
          profile_picture: userData.profile_picture,
          totalObservations: observationsData.userTotalObservations,
        });

        // Store user data in localStorage
        localStorage.setItem('user_id', userData.id);
        localStorage.setItem('username', userData.uname);
        localStorage.setItem('totalObservations', observationsData.userTotalObservations);
        localStorage.setItem('level', userData.level);
        localStorage.setItem('email', userData.email);
        localStorage.setItem('burungnesia_user_id', userData.burungnesia_user_id);
        localStorage.setItem('kupunesia_user_id', userData.kupunesia_user_id);
        localStorage.setItem('bio', userData.bio);
        localStorage.setItem('profile_picture', userData.profile_picture);

        navigate(from, { replace: true });
        console.log('Navigating to:', from);
      } else {
        throw new Error('User data is missing. Please try again.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>Selamat Datang di Talinara</h2>
            <p className="auth-subtitle">Portal Biodiversity Citizen Science Indonesia</p>
          </div>
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="auth-input"
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="auth-button">
              Masuk
            </button>

            <div className="auth-links">
              <Link to="/forgot-password" className="forgot-password-link">
                Lupa Password?
              </Link>
            </div>
          </form>

          <div className="auth-footer">
            <p>Belum punya akun? <Link to="/register">Daftar di sini</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;