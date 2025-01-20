// src/components/PilihObservasi.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faTimes, 
  faBell, 
  faEnvelope,
  faUserCircle 
} from '@fortawesome/free-solid-svg-icons';
import Header from './Header';

// Ambil data user dari localStorage
const getUserData = () => {
  return {
    uname: localStorage.getItem('username'),
    level: localStorage.getItem('level'),
    email: localStorage.getItem('email'),
    bio: localStorage.getItem('bio'),
    profile_picture: localStorage.getItem('profile_picture'),
    totalObservations: localStorage.getItem('totalObservations'),
  };
};

const PilihObservasi = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHeaderFixed, setIsHeaderFixed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderFixed(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const roles = {
    1: 'User',
    2: 'Kurator', 
    3: 'Admin',
    4: 'Admin + Kurator'
  };

  const menuItems = [
    { path: '/profile/home', label: 'Profil' },
    { path: '/profile/observasi', label: 'Observasi saya' },
    { path: '/profile/taksa-favorit', label: 'Taksa favorit' },
    { path: '/profile/spesies-saya', label: 'Spesies saya' },
    { path: '/profile/diskusi-identifikasi', label: 'Diskusi identifikasi' },
    { path: '/profile/pilih-observasi', label: 'Unggah Observasi Baru' },
  ];

  const userData = getUserData();

  return (
    <div className="min-h-screen bg-gray-100">
      <Header userData={getUserData()} />
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="md:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center">
                <img 
                  src={userData.profile_picture || "/user.png"}
                  alt="User Profile"
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
                />
                <small className="font-bold text-lg">{userData.uname}</small>
                <span>&nbsp;</span>
                {/* <p className="text-gray-600 text-sm">{userData.email}</p> */}
                <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded-full mt-2">
                  {roles[userData.level]}
                </span>
                {/* {userData.bio && (
                  <p className="text-gray-600 text-sm mt-2 italic">
                    {userData.bio}
                  </p>
                )} */}
                {userData.totalObservations && (
                  <p className="text-gray-600 text-sm mt-2">
                    Total Observasi: {userData.totalObservations}
                  </p>
                )}
              </div>

              {/* Menu */}
              <nav className="mt-8">
                <ul className="space-y-2">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        to={item.path}
                        className={`block px-4 py-2 ${
                          item.path === '/profile/pilih-observasi'
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="md:w-3/4">
            <div className="bg-dark rounded-lg shadow-md p-6">
              <h2 className="text-base font-bold mb-8 pb-4 border-b">Unggah observasi baru</h2>
              
              <h3 className="text-sm font-semibold text-center mb-8">Pilih Observasi Anda</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Burungnesia Card */}
                <div className="bg-white rounded-lg shadow-md p-6 text-sm">
                  <Link to="/burungnesia-upload" className="block text-center">
                    <img 
                      src="/icon.png"
                      alt="Checklist Burungnesia"
                      className="w-24 h-24 mx-auto mb-4"
                    />
                  </Link>
                  <h4 className="text-sm font-semibold mb-2">Checklist Burungnesia</h4>
                  <p className="text-gray-600 mb-4">
                    Observasi burung dengan menggunakan checklist Burungnesia.
                  </p>
                  <div className="space-y-2">
                    <p className="font-semibold">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-1 text-sm text-gray-600">
                      <li>1. Observer dengan kemampuan identifikasi burung medium-mahir</li>
                      <li>2. Observasi multi spesies burung ( {'>'}20 jenis)</li>
                      <li>3. Observasi komplit (mencatat semua jenis yang ada di lokasi observasi)</li>
                      <li>4. Tidak ada audit selidik media foto/audio</li>
                    </ul>
                  </div>
                  <div className="mt-10 text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Coba versi mobile jika anda pengguna Android
                    </p>
                    <a 
                      href="https://play.google.com/store/apps/details?id=com.example.burungnesia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                        alt="Google Play"
                        className="h-12"
                      />
                    </a>
                  </div>
                </div>

                {/* Kupunesia Card */}
                <div className="bg-white rounded-lg shadow-md p-6 text-sm">
                  <Link to="/kupunesia-upload" className="block text-center">
                    <img 
                      src="/kupnes.png"
                      alt="Checklist Kupunesia"
                      className="w-24 h-24 mx-auto mb-4"
                    />
                  </Link>
                  <h4 className="text-sm font-semibold mb-2">Checklist Kupunesia</h4>
                  <p className="text-gray-600 mb-4">
                    Observasi kupu-kupu dengan menggunakan checklist Kupunesia.
                  </p>
                  <div className="space-y-2">
                    <p className="font-semibold">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-1 text-sm text-gray-600">
                      <li>1. Observer dengan kemampuan identifikasi kupu-kupu medium-mahir</li>
                      <li>2. Observasi multi spesies kupu (tidak termasuk ngengat)</li>
                      <li>3. Observasi komplit (mencatat semua jenis yang ada di lokasi observasi)</li>
                      <li>4. Tidak ada audit selidik media foto/audio</li>
                    </ul>
                  </div>
                  <div className="mt-5 text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Coba versi mobile jika anda pengguna Android
                    </p>
                    <a 
                      href="https://play.google.com/store/apps/details?id=com.example.kupunesia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                        alt="Google Play"
                        className="h-12"
                      />
                    </a>
                  </div>
                </div>

                {/* Observasi Bebas Card */}
                <div className="bg-white rounded-lg shadow-md p-6 text-sm">
                  <Link to="/media-upload" className="block text-center">
                    <img 
                      src="/icam.png"
                      alt="Observasi Berbasis Media"
                      className="w-24 h-24 mx-auto mb-4"
                    />
                  </Link>
                  <h4 className="text-sm font-semibold mb-2">Observasi Media</h4>
                  <p className="text-gray-600 mb-4">
                    Unggah observasi dengan media foto atau audio.
                  </p>
                  <div className="space-y-2">
                    <p className="font-semibold">Sangat disarankan untuk:</p>
                    <ul className="list-none space-y-1 text-sm text-gray-600">
                      <li>1. Observasi selain burung & kupu-kupu (tidak termasuk ngengat)</li>
                      <li>2. Tidak ada syarat kemampuan identifikasi</li>
                      <li>3. Observasi tunggal atau sedikit jenis (taksa tunggal maupun multi taksa)</li>
                      <li>4. Bukan observasi komplit</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PilihObservasi;