import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [totalObservations, setTotalObservations] = useState(0);

  const checkTokenValidity = () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setIsLoggedIn(false);
      setUsername('');
      setTotalObservations(0);
    }
  };

  const fetchUserData = async (userId) => {
    try {
      const userResponse = await axios.get(`http://localhost:8000/api/fobi-users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
      });

      if (userResponse.status === 200) {
        setIsLoggedIn(true);
        setUsername(userResponse.data.uname);

        const observationsResponse = await axios.get(`http://localhost:8000/api/user-total-observations/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
          },
        });
        setTotalObservations(observationsResponse.data.userTotalObservations);
      }
    } catch (error) {
      console.error('Error fetching user data or total observations:', error);
      setIsLoggedIn(false);
      setUsername('');
      setTotalObservations(0);
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_id');
    }
  };

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    if (userId) {
      fetchUserData(userId);
    } else {
      setIsLoggedIn(false);
      setUsername('');
      setTotalObservations(0);
    }

    const intervalId = setInterval(checkTokenValidity, 60000); // Cek setiap 60 detik

    return () => clearInterval(intervalId); // Bersihkan interval saat komponen unmount
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, totalObservations }}>
      {children}
    </AuthContext.Provider>
  );
};