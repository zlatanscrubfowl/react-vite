import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faCheck, faTimes, faArrowLeft, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@mui/material/Tooltip';
import Modal from '@mui/material/Modal';
import burungnesiaLogo from '../../assets/icon/icon.png';
import kupunesiaLogo from '../../assets/icon/kupnes.png';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const SyncAccountsContent = () => {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [syncStatus, setSyncStatus] = useState({
    burungnesia: {
      synced: false,
      email: '',
      loading: false,
      error: ''
    },
    kupunesia: {
      synced: false,
      email: '',
      loading: false,
      error: ''
    }
  });
  const [syncForm, setSyncForm] = useState({
    burungnesia: {
      email: '',
      password: '',
      showPassword: false,
      recaptcha: null
    },
    kupunesia: {
      email: '',
      password: '',
      showPassword: false,
      recaptcha: null
    }
  });
  const [openModal, setOpenModal] = useState(false);
  const [platformToUnlink, setPlatformToUnlink] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    // Load reCAPTCHA v3 script
    const loadRecaptchaScript = () => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${import.meta.env.VITE_RECAPTCHA_SITE_KEY}`;
      script.async = true;
      document.body.appendChild(script);
    };
    loadRecaptchaScript();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil data profil');
      }

      const data = await response.json();
      if (data.success) {
        setUserData(data.data);
        setSyncStatus(prev => ({
          burungnesia: {
            ...prev.burungnesia,
            synced: !!data.data.burungnesia_email_verified_at,
            email: data.data.burungnesia_email || ''
          },
          kupunesia: {
            ...prev.kupunesia,
            synced: !!data.data.kupunesia_email_verified_at,
            email: data.data.kupunesia_email || ''
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSync = async (platform) => {
    setSyncStatus(prev => ({
      ...prev,
      [platform]: { ...prev[platform], loading: true, error: '' }
    }));

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha();
      const token = localStorage.getItem('jwt_token');
      
      // Log data yang akan dikirim untuk debugging
      console.log('Sending data:', {
        email: syncForm[platform].email,
        password: syncForm[platform].password,
        recaptcha_token: recaptchaToken
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/sync-platform-email/${platform}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: syncForm[platform].email,
          password: syncForm[platform].password,
          recaptcha_token: recaptchaToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mensinkronkan akun');
      }

      if (data.success) {
        navigate('/platform-verification', {
          state: {
            email: syncForm[platform].email,
            platform: platform
          }
        });
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        [platform]: { 
          ...prev[platform], 
          error: error.message, 
          loading: false 
        }
      }));
    }
  };

  const UnlinkConfirmationModal = ({ platform, isOpen, onClose, onConfirm }) => {
    if (!platform) return null;
    
    const platformName = platform === 'burungnesia' ? 'Burungnesia' : 'Kupunesia';
    
    return (
      <Modal
        open={isOpen}
        onClose={onClose}
        className="flex items-center justify-center"
      >
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md mx-4">
          <h3 className="text-lg font-semibold mb-4">Konfirmasi Pelepasan Akun</h3>
          <p className="text-gray-600 mb-4">
            Melepaskan akun tidak akan menghapus akun {platformName} Anda, 
            tapi Anda akan kehilangan stats observasi dari {platformName} saat ini.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Ya, Lepaskan
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  const confirmUnlink = async () => {
    setOpenModal(false);
    setPlatformToUnlink(null);

    if (!platformToUnlink) return;

    setSyncStatus(prev => ({
      ...prev,
      [platformToUnlink]: { ...prev[platformToUnlink], loading: true, error: '' }
    }));

    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/unlink-platform-account/${platformToUnlink}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal melepaskan akun');
      }

      setSyncForm(prev => ({
        ...prev,
        [platformToUnlink]: {
          email: '',
          password: '',
          showPassword: false
        }
      }));

      setSyncStatus(prev => ({
        ...prev,
        [platformToUnlink]: {
          synced: false,
          email: '',
          loading: false,
          error: ''
        }
      }));

      await fetchUserData();

    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        [platformToUnlink]: {
          ...prev[platformToUnlink],
          error: error.message,
          loading: false
        }
      }));
    }
  };

  const renderPlatformForm = (platform) => {
    const isLoading = syncStatus[platform].loading;
    const error = syncStatus[platform].error;
    const isSynced = syncStatus[platform].synced;
    const formData = syncForm[platform];

    const handleUnlink = () => {
      setPlatformToUnlink(platform);
      setOpenModal(true);
    };

    if (isSynced) {
      return (
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center text-green-700">
            <FontAwesomeIcon icon={faCheck} className="mr-2" />
            <div>
              <p className="font-medium">Akun Tersinkronisasi</p>
              <p className="text-sm">{syncStatus[platform].email}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Tooltip title={`Melepaskan akun akan menghilangkan stats observasi dari ${platform === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}`} arrow>
              <button
                onClick={handleUnlink}
                className="text-sm text-red-600 hover:text-red-700 px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSync} spin className="mr-2" />
                ) : 'Unlink'}
              </button>
            </Tooltip>
          </div>
          {error && (
            <div className="mt-2 text-red-500 text-sm">
              <FontAwesomeIcon icon={faTimes} className="mr-2" />
              {error}
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email {platform === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'}
          </label>
          <input
            type="email"
            placeholder={`Masukkan email ${platform === 'burungnesia' ? 'Burungnesia' : 'Kupunesia'} Anda`}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
            value={formData.email}
            onChange={(e) => setSyncForm(prev => ({
              ...prev,
              [platform]: { ...prev[platform], email: e.target.value }
            }))}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <Tooltip title="Gunakan password yang sama dengan akun Talinara(Fobi) Anda" arrow>
            <div className="relative">
              <input
                type={formData.showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                value={formData.password}
                onChange={(e) => setSyncForm(prev => ({
                  ...prev,
                  [platform]: { ...prev[platform], password: e.target.value }
                }))}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                onClick={() => setSyncForm(prev => ({
                  ...prev,
                  [platform]: { ...prev[platform], showPassword: !prev[platform].showPassword }
                }))}
              >
                <FontAwesomeIcon icon={formData.showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </Tooltip>
        </div>

        <button
          onClick={() => handleSync(platform)}
          className="w-full bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 disabled:opacity-50"
          disabled={isLoading || !formData.email || !formData.password}
        >
          {isLoading ? (
            <FontAwesomeIcon icon={faSync} spin className="mr-2" />
          ) : 'Sinkronkan Akun'}
        </button>

        {error && (
          <div className="mt-2 text-red-500 text-sm">
            <FontAwesomeIcon icon={faTimes} className="mr-2" />
            {error}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="text-gray-600 hover:text-gray-800 mr-4"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h1 className="text-2xl font-bold">Sinkronisasi Akun</h1>
      </div>

      {/* Burungnesia Section */}
      <div className="mb-8 p-6 border rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
          <img 
            src={burungnesiaLogo} 
            alt="Burungnesia Logo" 
            className="w-8 h-8 mr-2 object-contain"
          />
          <h2 className="text-xl font-semibold">Burungnesia</h2>
        </div>
        {renderPlatformForm('burungnesia')}
      </div>

      {/* Kupunesia Section */}
      <div className="p-6 border rounded-lg shadow-sm">
        <div className="flex items-center mb-4">
          <img 
            src={kupunesiaLogo} 
            alt="Kupunesia Logo" 
            className="w-8 h-8 mr-2 object-contain"
          />
          <h2 className="text-xl font-semibold">Kupunesia</h2>
        </div>
        {renderPlatformForm('kupunesia')}
      </div>

      {/* Modal konfirmasi unlink */}
      <UnlinkConfirmationModal 
        platform={platformToUnlink}
        isOpen={openModal}
        onClose={() => {
          setOpenModal(false);
          setPlatformToUnlink(null);
        }}
        onConfirm={confirmUnlink}
      />
    </div>
  );
};

const SyncAccounts = () => {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
      scriptProps={{
        async: true,
        defer: true,
        appendTo: 'head'
      }}
    >
      <SyncAccountsContent />
    </GoogleReCaptchaProvider>
  );
};

export default SyncAccounts; 