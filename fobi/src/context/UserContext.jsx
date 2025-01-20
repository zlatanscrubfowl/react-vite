import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
const UserContext = createContext({
  user: null,
  setUser: () => {},
  updateTotalObservations: () => {}, 
  isLoading: false
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId) => {
    try {
      const response = await apiFetch(`/user-total-observations/${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data.userTotalObservations;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return 0;
    }
  };

  const updateTotalObservations = async () => {
    if (user?.id) {
      try {
        const total = await fetchUserData(user.id);
        // Update context state
        setUser(prev => ({
          ...prev,
          totalObservations: total
        }));
        // Update localStorage
        localStorage.setItem('totalObservations', total.toString());
        return total;
      } catch (error) {
        console.error('Error updating observations:', error);
      }
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // Get user profile
      const response = await apiFetch('/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        // Fetch total observations
        const totalObservations = await fetchUserData(response.data.id);
        
        setUser({
          ...response.data, // Simpan semua data user
          totalObservations: totalObservations
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await apiFetch('/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      setUser(null);
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      logout, 
      isLoading, 
      checkAuth,
      updateTotalObservations 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);