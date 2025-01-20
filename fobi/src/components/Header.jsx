import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope, faUserCircle, faBars, faSearch, faArrowLeft, faArrowRight, faSignOutAlt, faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useUser } from '../context/UserContext'; // Import useUser
import axios from 'axios';
import { apiFetch } from '../utils/api';
import { calculateDistance } from '../utils/geoHelpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NotificationBar from './NotificationBar';

// Tambahkan fungsi getGradeDisplay di luar komponen
const getGradeDisplay = (grade) => {
  switch(grade.toLowerCase()) {
    case 'research grade':
      return 'ID Lengkap';
    case 'needs id':
      return 'Bantu Iden';
    case 'low quality id':
      return 'ID Kurang';
    default:
      return 'Casual';
  }
};

const Header = ({ onSearch }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { user, setUser, updateTotalObservations } = useUser();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useState({
        search: '',
        location: '',
        latitude: '',
        longitude: '',
        searchType: 'all',
        boundingbox: null,
        radius: 10
    });
    const [filterParams, setFilterParams] = useState({
        start_date: '',
        end_date: '',
        grade: [],
        has_media: false,
        media_type: '',
        data_source: ['fobi', 'burungnesia', 'kupunesia']
    });
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
    const [isLoadingSpecies, setIsLoadingSpecies] = useState(false);
    const locationDebounceTimer = useRef(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);
    const queryClient = useQueryClient();
    const [showMobileNotifications, setShowMobileNotifications] = useState(false);
    const mobileNotificationRef = useRef(null);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const toggleSearch = () => setIsSearchOpen(!isSearchOpen);
    const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

    const handleLogout = async () => {
      try {
        await apiFetch('/logout', {
          method: 'POST'
        });
        localStorage.clear();
        setUser(null);
        navigate('/');
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    const checkUserAuth = () => {
      const token = localStorage.getItem('jwt_token');
      const storedUser = {
        id: localStorage.getItem('user_id'),
        uname: localStorage.getItem('username'),
        totalObservations: localStorage.getItem('totalObservations'),
      };

      if (token && storedUser.id) {
        setUser(storedUser);
      } else {
        setUser(null);
      }
    };

    useEffect(() => {
      checkUserAuth();
    }, [setUser]);

    useEffect(() => {
      const interval = setInterval(() => {
        if (user?.id) {
          updateTotalObservations();
        }
      }, 30000); // Update setiap 30 detik
    
      return () => clearInterval(interval);
    }, [user]);

    const handleSpeciesSearch = async (query) => {
      if (!query) return;

      setIsLoadingSpecies(true);
      try {
        // Hapus karakter strip dari query pencarian
        const normalizedQuery = query.replace(/-/g, ' ');

        const response = await fetch(`${import.meta.env.VITE_API_URL}/species-suggestions?query=${encodeURIComponent(normalizedQuery)}`);
        const data = await response.json();

        const processedData = data
          .map(item => ({
            ...item,
            // Hapus karakter strip dari nama ilmiah dan nama tampilan
            scientific_name: item.scientific_name
              .replace(/-/g, ' ')
              .replace(/\s+(?:[A-Z][a-z]+(?:\s*&\s*[A-Z][a-z]+)?(?:,\s*\d{4}[a-z]?)?|\([^)]+\))/g, '')
              .trim(),
            display_name: item.display_name
              .replace(/-/g, ' ')
              .replace(/\s+(?:[A-Z][a-z]+(?:\s*&\s*[A-Z][a-z]+)?(?:,\s*\d{4}[a-z]?)?|\([^)]+\))/g, '')
              .trim(),
            taxonomicLevel: item.rank || (
              item.family ? 'family' :
              item.genus ? 'genus' : 'species'
            )
          }))
          .sort((a, b) => {
            // Urutkan berdasarkan level taksonomi
            const levelOrder = { family: 1, genus: 2, species: 3 };
            if (levelOrder[a.taxonomicLevel] !== levelOrder[b.taxonomicLevel]) {
              return levelOrder[a.taxonomicLevel] - levelOrder[b.taxonomicLevel];
            }
            // Jika level sama, urutkan berdasarkan nama
            return a.scientific_name.localeCompare(b.scientific_name);
          });

        setSpeciesSuggestions(processedData);
      } catch (error) {
        console.error('Error searching species:', error);
      } finally {
        setIsLoadingSpecies(false);
      }
    };


    const handleLocationSearch = async (locationName) => {
      if (locationDebounceTimer.current) {
        clearTimeout(locationDebounceTimer.current);
      }

      if (!locationName || locationName.length < 3) {
        setLocationSuggestions([]);
        setIsLoadingLocation(false);
        return;
      }

      setIsLoadingLocation(true);

      locationDebounceTimer.current = setTimeout(async () => {
        try {
          const viewbox = {
            minLon: 95.0,  // Batas barat
            maxLon: 141.0, // Batas timur
            minLat: -11.0, // Batas selatan
            maxLat: 6.0,   // Batas utara
          };

          const params = new URLSearchParams({
            format: 'json',
            q: locationName,
            limit: 5,
            addressdetails: 1,
            bounded: 1,
            countrycodes: 'id',
            viewbox: `${viewbox.minLon},${viewbox.minLat},${viewbox.maxLon},${viewbox.maxLat}`,
          });

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 detik timeout

          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params.toString()}`,
            {
              headers: {
                'Accept-Language': 'id'
              },
              signal: controller.signal
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          const data = await response.json();

          const filteredData = data
            .filter(item => {
              const address = item.address;
              return address.city || address.town || address.municipality || 
                     address.county || address.state || address.country;
            })
            .map(item => {
              const address = item.address;
              const parts = [];
              
              // City/Town/Municipality
              if (address.city || address.town || address.municipality) {
                parts.push(address.city || address.town || address.municipality);
              }
              // County/Regency
              if (address.county || address.regency) {
                parts.push(address.county || address.regency);
              }
              // State/Province
              if (address.state) {
                parts.push(address.state);
              }
              // Country
              if (address.country) {
                parts.push(address.country);
              }

              // Calculate radius based on administrative level
              let radius = 10; // default radius
              if (address.state) radius = 100;
              else if (address.county) radius = 50;
              else if (address.city || address.town || address.municipality) radius = 25;

              return {
                display_name: parts.join(', '),
                lat: item.lat,
                lon: item.lon,
                boundingbox: item.boundingbox,
                type: address.city ? 'Kota' : 
                      address.town ? 'Kota' : 
                      address.municipality ? 'Kota' :
                      address.county ? 'Kabupaten' : 'Wilayah',
                importance: item.importance,
                radius: radius
              };
            })
            .sort((a, b) => b.importance - a.importance);

          setLocationSuggestions(filteredData);
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('Location search request timed out');
          } else {
            console.error('Error searching location:', error);
          }
          setLocationSuggestions([]);
        } finally {
          setIsLoadingLocation(false);
        }
      }, 500); // 500ms debouncing
    };

    const handleLocationSelect = (location) => {
      const lat = parseFloat(location.lat);
      const lon = parseFloat(location.lon);

      setSearchParams(prev => ({
        ...prev,
        location: location.display_name,
        latitude: lat.toFixed(6),
        longitude: lon.toFixed(6),
        radius: location.radius,
        boundingbox: location.boundingbox.map(coord => parseFloat(coord))
      }));

      setLocationSuggestions([]);

      if (typeof onSearch === 'function') {
        onSearch({
          ...searchParams,
          location: location.display_name,
          latitude: lat.toFixed(6),
          longitude: lon.toFixed(6),
          radius: location.radius,
          boundingbox: location.boundingbox.map(coord => parseFloat(coord))
        });
      }
    };

    const handleSearch = () => {
      if (typeof onSearch === 'function') {
        const combinedParams = {
          ...searchParams,
          ...filterParams,
          grade: filterParams.grade.length > 0 ? filterParams.grade : undefined,
          data_source: filterParams.data_source.length > 0 ? filterParams.data_source : ['fobi']
        };

        onSearch(combinedParams);
      }
      setIsSearchOpen(false);
    };

    const handleFilter = () => {
        if (typeof onSearch === 'function') {
            onSearch({
                ...searchParams,
                ...filterParams,
                grade: filterParams.grade.toLowerCase(),
                data_source: filterParams.data_source,
                has_media: filterParams.has_media,
                media_type: filterParams.media_type,
                start_date: filterParams.start_date,
                end_date: filterParams.end_date
            });
        }
        setIsSearchOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchParams.search) {
                handleSpeciesSearch(searchParams.search);
            } else {
                setSpeciesSuggestions([]);
            }
        }, 500); // Delay 500ms untuk menghindari terlalu banyak request

        return () => clearTimeout(delayDebounce);
    }, [searchParams.search]);

    const handleSpeciesSelect = (species) => {
        setSearchParams({
            ...searchParams,
            search: species.display_name,
            searchType: species.taxonomicLevel || 'all'
        });
        setSpeciesSuggestions([]);
    };

    const handleGradeChange = (grade) => {
        setFilterParams(prev => {
            const newGrades = prev.grade.includes(grade)
                ? prev.grade.filter(g => g !== grade)
                : [...prev.grade, grade];

            return {
                ...prev,
                grade: newGrades
            };
        });
    };

    // Query untuk notifikasi
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            if (!user || !localStorage.getItem('jwt_token')) {
                return [];
            }
            const response = await apiFetch('/notifications', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            return data.success ? data.data : [];
        },
        enabled: !!user && !!localStorage.getItem('jwt_token'),
        refetchInterval: 30000
    });

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    const handleMarkAsRead = async (notificationId) => {
        try {
            await apiFetch(`/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            // Invalidate dan refetch notifikasi
            queryClient.invalidateQueries(['notifications']);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await apiFetch('/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            queryClient.invalidateQueries(['notifications']);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Modifikasi fungsi untuk menampilkan notifikasi
    const renderMobileNotifications = () => (
        <div className="relative" ref={mobileNotificationRef}>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    setShowMobileNotifications(!showMobileNotifications);
                    // Otomatis tandai semua dibaca saat membuka notifikasi
                    if (!showMobileNotifications && unreadCount > 0) {
                        handleMarkAllAsRead();
                    }
                    e.stopPropagation();
                }}
                className="w-full flex items-center space-x-3 py-2 text-gray-700 hover:text-[#679995] transition-colors"
            >
                <FontAwesomeIcon icon={faBell} />
                <span>Notifikasi</span>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 ml-auto">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {showMobileNotifications && (
                <div className="fixed inset-x-4 top-20 bg-white rounded-lg shadow-xl z-50 max-h-[70vh] overflow-y-auto">
                    <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
                        <h3 className="text-lg font-medium">Notifikasi</h3>
                        <div className="flex items-center space-x-4">
                            {unreadCount > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAllAsRead();
                                    }}
                                    className="text-sm text-[#679995] hover:text-[#5a8884]"
                                >
                                    Tandai semua dibaca
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMobileNotifications(false);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    </div>
                    <div className="divide-y">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-500">
                                Memuat notifikasi...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                Tidak ada notifikasi baru
                            </div>
                        ) : (
                            notifications.map(notification => {
                                const date = new Date(notification.created_at);
                                const formattedDate = date.toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'numeric',
                                    year: 'numeric'
                                });
                                const formattedTime = date.toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Tandai notifikasi individual dibaca saat diklik
                                            if (!notification.is_read) {
                                                handleMarkAsRead(notification.id);
                                            }
                                            setShowMobileNotifications(false);
                                            toggleSidebar();
                                            navigate(`/observations/${notification.checklist_id}`);
                                        }}
                                    >
                                        <p className="text-sm text-gray-800">{notification.message}</p>
                                        <div className="flex items-center text-xs text-gray-500 mt-1">
                                            <span>{formattedDate}</span>
                                            <span className="mx-1">•</span>
                                            <span>{formattedTime}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    // Gunakan di dalam sidebar navigation
    return (
        <header className="fixed top-0 left-0 w-full bg-[#f2f2f2] shadow-md z-[55] h-14 border-b-4 border-[#679995]">
            <div className="container mx-auto px-4 h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo */}
                    <Link to="/" className="flex items-center">
                        <img src="/FOBI.png" alt="Logo" className="h-8" />
                    </Link>

                    {/* Navigation - Desktop */}
                    <nav className="hidden md:block">
                        <ul className="flex space-x-6 text-xs mt-7">
                            <li><Link to="/" className="hover:text-[#679995] transition-colors">Jelajahi</Link></li>
                            <li>
                                <Link
                                    to={user ? `/profile/${user.id}/observasi` : '/login'}
                                    className="hover:text-[#679995] transition-colors"
                                >
                                    Eksplorasi Saya
                                </Link>
                            </li>
                            <li><Link to="/bantu-ident" className="hover:text-[#679995] transition-colors">Bantu Ident</Link></li>
                            <li><Link to="/community" className="hover:text-[#679995] transition-colors">Komunitas</Link></li>
                        </ul>
                    </nav>

                    {/* User Menu - Desktop */}
                    <div className="hidden md:flex items-center space-x-4">
                        {/* Upload Button - Selalu Tampil */}
                        <Link
                            to="/pilih-observasi"
                            className="bg-[#679995] text-white px-4 py-2 rounded-md hover:bg-[#527b78] text-sm font-medium transition duration-150 ease-in-out"
                        >
                            Observasi Baru
                        </Link>

                        {user ? (
                            <>
                                {/* User Profile dengan Dropdown */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={toggleDropdown}
                                        className="flex items-center space-x-2 cursor-pointer"
                                    >
                                        <FontAwesomeIcon icon={faUserCircle} className="text-xl text-[#679995]" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{user.uname}</span>
                                            <span className="text-xs text-gray-600">{user.totalObservations} Observasi</span>
                                        </div>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                                            <Link
                                                to={`/profile/${user.id}`}
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Profil Saya
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                            >
                                                <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
                                                <span>Logout</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Notifications & Messages */}
                                <div className="flex items-center space-x-4">
                                    {/* Notifications */}
                                    <div className="relative" ref={notificationRef}>
                                        <button
                                            onClick={() => setShowNotifications(!showNotifications)}
                                            className="relative p-2 text-gray-600 hover:text-gray-900"
                                        >
                                            <FontAwesomeIcon icon={faBell} className="text-xl" />
                                            {!isLoading && notifications.filter(n => !n.is_read).length > 0 && (
                                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                                                    {notifications.filter(n => !n.is_read).length > 99 ? '99+' : notifications.filter(n => !n.is_read).length}
                                                </span>
                                            )}
                                        </button>
                                        {showNotifications && !isLoading && (
                                            <NotificationBar
                                                notifications={notifications}
                                                onClose={() => setShowNotifications(false)}
                                                onMarkAsRead={handleMarkAsRead}
                                            />
                                        )}
                                    </div>

                                    {/* Messages */}
                                    <Link
                                        to="/messages"
                                        className="relative group"
                                    >
                                        <FontAwesomeIcon
                                            icon={faEnvelope}
                                            className="text-gray-600 group-hover:text-[#679995] transition-colors text-xl"
                                        />
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                                            3
                                        </span>
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <div className="relative">
                                <button
                                    onClick={toggleDropdown}
                                    className="flex items-center space-x-2 cursor-pointer text-gray-700 hover:text-[#679995]"
                                >
                                    <FontAwesomeIcon icon={faUserCircle} className="text-xl" />
                                    <span className="text-[12px]">Masuk/Daftar</span>
                                </button>

                                {/* Dropdown untuk Guest */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                                        <Link
                                            to="/login"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            to="/register"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Daftar
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile Controls */}
                    <div className="flex items-center space-x-3 md:hidden">
                        <button onClick={toggleSearch} className="p-2 text-gray-600">
                            <FontAwesomeIcon icon={faSearch} className="text-xl" />
                        </button>
                        <button onClick={toggleSidebar} className="p-2 text-gray-600">
                            <FontAwesomeIcon icon={faBars} className="text-xl" />
                        </button>
                    </div>
                </div>
            </div>

            {isSearchOpen && (
                <div className="fixed inset-0 z-40 bg-white">
                    <div className="p-4">
                        <button className="text-gray-600 mb-4" onClick={toggleSearch}>
                            <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
                        </button>

                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Spesies/ genus/ famili"
                                    value={searchParams.search}
                                    onChange={(e) => setSearchParams({...searchParams, search: e.target.value})}
                                    className="w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#679995]"
                                />

                                {/* Loading indicator */}
                                {isLoadingSpecies && (
                                    <div className="absolute right-3 top-3">
                                        <div className="w-5 h-5 border-2 border-[#679995] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {/* Species suggestions */}
                                {speciesSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {speciesSuggestions.map((species, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSpeciesSelect(species)}
                                                className="w-full p-3 text-left text-sm hover:bg-gray-100 border-b last:border-b-0"
                                            >
                                                <div className="font-medium">{species.common_name || species.display_name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {species.family}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Lokasi"
                                    value={searchParams.location}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchParams(prev => ({ ...prev, location: value }));
                                        handleLocationSearch(value);
                                    }}
                                    className="w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#679995]"
                                />

                                {/* Loading indicator */}
                                {isLoadingLocation && (
                                    <div className="absolute right-3 top-3">
                                        <div className="w-5 h-5 border-2 border-[#679995] border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}

                                {/* Location suggestions */}
                                {locationSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {locationSuggestions.map((location, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleLocationSelect(location)}
                                                className="w-full p-3 text-left text-sm hover:bg-gray-100 border-b last:border-b-0"
                                            >
                                                {location.display_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Filter Options */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Filter Data</span>
                                </div>

                                {/* Grade Filter */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Grade</label>
                                    {['research grade', 'needs id', 'low quality id', 'casual'].map((grade) => (
                                        <label key={grade} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={filterParams.grade.includes(grade)}
                                                onChange={() => handleGradeChange(grade)}
                                                className="rounded text-[#679995]"
                                            />
                                            <span className="text-sm capitalize">{getGradeDisplay(grade)}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Data Source Filter */}
                                <div className="space-y-2">
                                    {['fobi', 'burungnesia', 'kupunesia'].map((source) => (
                                        <label key={source} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={filterParams.data_source.includes(source)}
                                                onChange={(e) => {
                                                    const newSources = e.target.checked
                                                        ? [...filterParams.data_source, source]
                                                        : filterParams.data_source.filter(s => s !== source);
                                                    setFilterParams({...filterParams, data_source: newSources});
                                                }}
                                                className="mr-2"
                                            />
                                            <span className="text-sm text-gray-700 capitalize">{source}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Media Type Filter */}
                                <select
                                    value={filterParams.media_type}
                                    onChange={(e) => setFilterParams({...filterParams, media_type: e.target.value})}
                                    className="w-full p-2 border rounded text-sm"
                                >
                                    <option value="">Semua Media</option>
                                    <option value="photo">Foto</option>
                                    <option value="audio">Audio</option>
                                </select>

                                {/* Has Media Checkbox */}
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={filterParams.has_media}
                                        onChange={(e) => setFilterParams({...filterParams, has_media: e.target.checked})}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Hanya tampilkan dengan media</span>
                                </label>
                            </div>

                            {/* Tombol Pencarian */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleSearch}
                                    className="flex-1 bg-[#679995] text-white py-2 px-4 rounded-lg text-sm hover:bg-[#5a8884] transition-colors"
                                >
                                    <FontAwesomeIcon icon={faArrowRight} className="mr-2" />
                                    Cari
                                </button>
                            </div>

                            {/* Filter section */}
                            <div className="mt-4">
                                {/* Tombol terapkan filter */}
                                <button
                                    onClick={handleSearch}
                                    className="w-full bg-[#679995] text-white py-2 px-4 rounded-lg text-sm hover:bg-[#5a8884] transition-colors mt-4"
                                >
                                    Terapkan Filter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleSidebar} />
                    <div className="fixed right-0 top-0 bottom-0 w-72 bg-white shadow-xl">
                        <button
                            onClick={toggleSidebar}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close sidebar"
                        >
                            <FontAwesomeIcon icon={faTimes} className="text-gray-600 text-lg" />
                        </button>

                        <div className="p-4">
                            {/* User Profile Section dengan padding tambahan di kanan untuk tombol close */}
                            {user ? (
                                <div className="flex items-center space-x-3 mb-6 pb-4 border-b pr-8">
                                    <FontAwesomeIcon icon={faUserCircle} className="text-[#679995] text-3xl" />
                                    <div>
                                        <p className="font-medium text-gray-700">{user.uname}</p>
                                        <p className="text-sm text-gray-500">{user.totalObservations} Observasi</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 pb-4 border-b space-y-3 pr-8">
                                    <p className="text-gray-600">Guest</p>
                                    <div className="space-y-2">
                                        <Link
                                            to="/login"
                                            className="block w-full text-center py-2 text-[#679995] border border-[#679995] rounded-lg hover:bg-[#679995] hover:text-white transition-colors"
                                            onClick={toggleSidebar}
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            to="/register"
                                            className="block w-full text-center py-2 bg-[#679995] text-white rounded-lg hover:bg-[#5a8884] transition-colors"
                                            onClick={toggleSidebar}
                                        >
                                            Daftar
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <nav className="space-y-4">
                                {user && (
                                    <Link
                                        to="/pilih-observasi"
                                        className="flex items-center py-2 text-white bg-[#679995] rounded-lg px-3 hover:bg-[#5a8884] transition-colors"
                                        onClick={toggleSidebar}
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                        <span>Observasi Baru</span>
                                    </Link>
                                )}

                                <Link
                                    to="/"
                                    className="flex items-center py-2 text-gray-700 hover:text-[#679995] transition-colors"
                                    onClick={toggleSidebar}
                                >
                                    Jelajahi
                                </Link>
                                <Link
                                    to={user ? `/profile/${user.id}/observasi` : '/login'}
                                    className="flex items-center py-2 text-gray-700 hover:text-[#679995] transition-colors"
                                    onClick={toggleSidebar}
                                >
                                    Eksplorasi Saya
                                </Link>
                                <Link
                                    to="/bantu-ident"
                                    className="flex items-center py-2 text-gray-700 hover:text-[#679995] transition-colors"
                                    onClick={toggleSidebar}
                                >
                                    Bantu Ident
                                </Link>
                                <Link
                                    to="/community"
                                    className="flex items-center py-2 text-gray-700 hover:text-[#679995] transition-colors"
                                    onClick={toggleSidebar}
                                >
                                    Komunitas
                                </Link>

                                {user && (
                                    <>
                                        <div className="border-t pt-4 mt-4 space-y-4">
                                            <Link
                                                to={`/profile/${user.id}`}
                                                className="flex items-center space-x-3 py-2 text-gray-700 hover:text-[#679995] transition-colors"
                                                onClick={toggleSidebar}
                                            >
                                                <FontAwesomeIcon icon={faUserCircle} />
                                                <span>Profil Saya</span>
                                            </Link>
                                            {renderMobileNotifications()}
                                            <Link
                                                to="/messages"
                                                className="flex items-center space-x-3 py-2 text-gray-700 hover:text-[#679995] transition-colors"
                                                onClick={toggleSidebar}
                                            >
                                                <FontAwesomeIcon icon={faEnvelope} />
                                                <span>Pesan</span>
                                                <span className="bg-red-500 text-white text-xs rounded-full px-2 ml-auto">3</span>
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left flex items-center space-x-3 py-2 text-gray-700 hover:text-[#679995] transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faSignOutAlt} />
                                                <span>Keluar</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
