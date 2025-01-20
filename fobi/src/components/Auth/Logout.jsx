import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
const Logout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleLogout = async () => {
    console.log('Attempting to logout...');
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        console.error('No JWT token found in localStorage');
        return;
      }
  
      const response = await apiFetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        console.log('Logout successful');
        localStorage.clear(); // Hapus semua data dari localStorage
        navigate(from, { replace: true });
        console.log('Logged out and navigating to:', from);
      } else {
        const errorData = await response.json();
        console.error('Logout failed:', errorData.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  return (
    <div className="logout-container">
      <h2>Logout</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Logout;