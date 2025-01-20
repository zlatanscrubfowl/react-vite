import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faInfo, faListDots, faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faPlay, faPause, faUsers, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import './GridView.css';
import { useNavigate, Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import defaultBirdLogo from '../../assets/icon/icon.png';
import defaultButterflyLogo from '../../assets/icon/kupnes.png';
import defaultFobiLogo from '../../assets/icon/FOBI.png';

const SpectrogramPlayer = ({ audioUrl, spectrogramUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', () => {
        const duration = audioRef.current.duration;
        const currentTime = audioRef.current.currentTime;
        const progress = (currentTime / duration) * 100;
        setProgress(progress);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      <div className="relative flex-1 w-full h-full bg-gray-900 overflow-hidden">
        <img
          src={spectrogramUrl}
          alt="Spectrogram"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {audioUrl && (
          <>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-700">
              <div
                className="h-full bg-emerald-500 transition-width duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute bottom-1 left-1 w-6 h-6 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-black/80 hover:scale-110 active:scale-95 transition-all duration-200"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <FontAwesomeIcon
                icon={isPlaying ? faPause : faPlay}
                className="text-xs"
              />
            </button>
            <audio
              ref={audioRef}
              src={audioUrl}
              className="hidden"
              preload="metadata"
            />
          </>
        )}
      </div>
    </div>
  );
};

// Pindahkan fungsi getDefaultImage ke luar komponen
const getDefaultImage = (type) => {
  switch(type) {
    case 'bird':
      return defaultBirdLogo;
    case 'butterfly':
      return defaultButterflyLogo;
    default:
      return defaultFobiLogo;
  }
};

// Pindahkan fungsi getImageUrl ke luar komponen dan perbaiki logikanya
const getImageUrl = (item) => {
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    const imageUrl = typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url;
    if (imageUrl) return imageUrl;
  }
  return getDefaultImage(item.type);
};

const MediaSlider = ({ images, spectrogram, audioUrl, type, isEager }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const mediaItems = [];

  // Cek dan tambahkan gambar jika ada
  if (images && Array.isArray(images) && images.length > 0) {
    images.forEach(img => {
      let imageUrl;
      if (typeof img === 'string') {
        imageUrl = img;
      } else if (img && typeof img === 'object') {
        imageUrl = img.url;
      }
      
      if (imageUrl) {
        mediaItems.push({ type: 'image', url: imageUrl });
      }
    });
  }

  // Tambahkan spectrogram jika ada
  if (spectrogram) {
    mediaItems.push({ type: 'spectrogram', url: spectrogram, audioUrl });
  }

  // Tambahkan default image hanya jika tidak ada gambar dan spectrogram
  if (mediaItems.length === 0) {
    mediaItems.push({ 
      type: 'image', 
      url: getDefaultImage(type)
    });
  }

  const safeActiveIndex = Math.min(activeIndex, mediaItems.length - 1);

  return (
    <div className="relative">
      <div className="h-48 overflow-hidden bg-gray-900">
        {mediaItems[safeActiveIndex]?.type === 'spectrogram' ? (
          <SpectrogramPlayer
            spectrogramUrl={mediaItems[safeActiveIndex].url}
            audioUrl={mediaItems[safeActiveIndex].audioUrl}
          />
        ) : (
          <div className="w-full h-full bg-gray-100">
            <img
              src={mediaItems[safeActiveIndex]?.url}
              alt=""
              className={`w-full h-full ${
                mediaItems[safeActiveIndex]?.url?.includes('/assets/icon/') 
                  ? 'object-contain p-4' 
                  : 'object-cover'
              }`}
              loading={isEager ? "eager" : "lazy"}
              onError={(e) => {
                e.target.src = getDefaultImage(type);
              }}
            />
          </div>
        )}
      </div>

      {mediaItems.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
          <div className="flex gap-1 px-2 py-1 rounded-full bg-black/30">
            {mediaItems.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === safeActiveIndex ? 'bg-white' : 'bg-gray-400 hover:bg-gray-300'
                }`}
                onClick={() => setActiveIndex(idx)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
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

const Card = ({ item, isEager }) => {
  const handleClick = (item) => {
    let path;
    const source = item.type || 'fobi';
    
    switch(source) {
      case 'bird':
        path = `/observations/BN${item.id}`;
        break;
      case 'butterfly':
        path = `/observations/KP${item.id}`;
        break;
      default:
        path = `/observations/${item.id}?source=fobi`;
    }
    window.open(path, '_blank');
  };

  // Helper function untuk mendapatkan total count berdasarkan tipe
  const getTotalCount = () => {
    // Untuk FOBI
    if (item.type === 'general') {
      return {
        count: item.fobi_count || 0,
        label: 'FOBI',
        color: 'text-green-700'
      };
    }
    // Untuk Burungnesia
    else if (item.type === 'bird') {
      return [
        {
          count: item.fobi_count || 0,
          label: 'FOBI',
          color: 'text-green-700'
        },
        {
          count: item.burungnesia_count || 0,
          label: 'Burungnesia',
          color: 'text-blue-700'
        }
      ];
    }
    // Untuk Kupunesia
    else if (item.type === 'butterfly') {
      return [
        {
          count: item.fobi_count || 0,
          label: 'FOBI',
          color: 'text-green-700'
        },
        {
          count: item.kupunesia_count || 0,
          label: 'Kupunesia',
          color: 'text-purple-700'
        }
      ];
    }
    return null;
  };

  const totalCount = getTotalCount();

  return (
    <div className="card relative">
      <MediaSlider
        images={item.images || [item.image]}
        spectrogram={item.spectrogram}
        audioUrl={item.audioUrl}
        type={item.type}
        isEager={isEager}
      />

      <div className="card-body p-4 cursor-pointer hover:bg-gray-50" onClick={() => handleClick(item)}>
        <div className="flex items-center justify-between mb-2">
          <Link 
            to={`/profile/${item.observer_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            {item.observer}
          </Link>
          <span className={`px-2 py-1 rounded-full text-xs text-white ${
            item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-500/50' :
            item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500/50' :
            item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500/50' :
            'bg-gray-500/50'
          }`}>
            {getGradeDisplay(item.quality.grade)}
          </span>
        </div>
        <h5 className="font-medium text-lg mb-2">{item.title}</h5>
        <p className="text-sm text-gray-700 whitespace-pre-line">{item.description}</p>
      </div>

      <div className="card-footer p-4 bg-gray-50 cursor-pointer hover:bg-gray-100" onClick={() => handleClick(item)}>
        <div className="flex items-center justify-between">
          <div className="quality-indicators flex gap-2 text-gray-600">
            {item.quality.has_media && <FontAwesomeIcon icon={faImage} title="Has Media" />}
            {item.quality.is_wild && <FontAwesomeIcon icon={faDove} title="Wild" />}
            {item.quality.location_accurate && <FontAwesomeIcon icon={faLocationDot} title="Location Accurate" />}
            {item.quality.needs_id && <FontAwesomeIcon icon={faQuestion} title="Needs ID" />}
            {item.type === 'general' && item.quality.recent_evidence && (
              <FontAwesomeIcon icon={faCheck} title="Recent Evidence" />
            )}
            {item.type === 'general' && item.quality.related_evidence && (
              <FontAwesomeIcon icon={faLink} title="Related Evidence" />
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* ID Count */}
            <div className="flex items-center gap-1 text-gray-600">
              <FontAwesomeIcon icon={faUsers} />
              <span>Total identifikasi: {item.identifications_count || 0}</span>
            </div>

            {/* Total Checklist Count */}
            {totalCount && (Array.isArray(totalCount) ? (
              <div className="flex items-center gap-2">
                {totalCount.map((count, idx) => (
                  <div key={idx} className={`flex items-center gap-1 ${count.color} font-medium`}>
                    <span>{count.count} {count.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex items-center gap-1 ${totalCount.color} font-medium`}>
                <span>{totalCount.count} {totalCount.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Pindahkan defaultFilterParams ke atas sebelum komponen
const defaultFilterParams = {
  start_date: '',
  end_date: '',
  grade: [],
  has_media: false,
  media_type: '',
  radius: 10,
  data_source: ['fobi', 'burungnesia', 'kupunesia']
};

// Tambahkan fungsi helper
const extractScientificName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    const scientificNameParts = parts.filter(part => {
        if (part.includes('(') || part.includes(')')) return false;
        if (/\d/.test(part)) return false;
        if (parts.indexOf(part) > 1 && /^[A-Z]/.test(part)) return false;
        return true;
    });
    return scientificNameParts.join(' ');
};

// Tambahkan fungsi helper untuk format lokasi
const formatLocation = (lat, long) => {
  if (!lat || !long) return '-';
  return `${parseFloat(lat).toFixed(6)}, ${parseFloat(long).toFixed(6)}`;
};

// Komponen untuk header sort yang bisa digunakan di desktop dan mobile
const SortableHeader = ({ title, sortKey, currentSort, onSort, className = "" }) => {
  const getSortIcon = () => {
    if (currentSort.key !== sortKey) return faSort;
    return currentSort.direction === 'asc' ? faSortUp : faSortDown;
  };

  return (
    <div 
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-2 cursor-pointer ${className}`}
    >
      <span>{title}</span>
      <FontAwesomeIcon 
        icon={getSortIcon()} 
        className={`text-xs ${
          currentSort.key === sortKey 
            ? 'text-blue-500' 
            : 'text-gray-400'
        }`}
      />
    </div>
  );
};

// Langkah 1: Tambahkan ListView Desktop Component
const ListViewDesktop = ({ observations, displayedItems, handleClick }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: 
        prevConfig.key === key 
          ? prevConfig.direction === 'asc' 
            ? 'desc' 
            : 'asc'
          : 'desc'
    }));
  };

  const sortedObservations = [...observations].sort((a, b) => {
    if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
    const dateA = new Date(a[sortConfig.key]);
    const dateB = new Date(b[sortConfig.key]);
    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="hidden md:block w-full max-w-[95%] mx-auto mt-14 px-2 md:px-4 overflow-x-auto">
      <div className="min-w-[1000px]">
        <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b border-gray-200">
              <th className="p-8 font-medium text-sm text-gray-600">Verifikasi</th>
              <th className="p-4 font-medium text-sm text-gray-600">Nama</th>
              <th className="p-4 font-medium text-sm text-gray-600">Pengamat</th>
              <th className="p-4 font-medium text-sm text-gray-600">Lokasi</th>
              <th className="p-4 font-medium text-sm text-gray-600">Jumlah observasi</th>
              <th className="p-4 font-medium text-sm text-gray-600">
                <SortableHeader
                  title="Tgl Observasi"
                  sortKey="observation_date"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th className="p-4 font-medium text-sm text-gray-600">
                <SortableHeader
                  title="Tgl Upload"
                  sortKey="created_at"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
              </th>
              <th className="p-4 font-medium text-sm text-gray-600">Informasi tambahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedObservations
              .slice(0, displayedItems)
              .map((item, index) => {
                const imagesCount = Array.isArray(item.images) 
                  ? item.images.length 
                  : (item.image ? 1 : 0);
                
                const firstImageUrl = Array.isArray(item.images) 
                  ? (item.images[0]?.url || item.images[0]) 
                  : (item.image || getDefaultImage(item.type));

                return (
                  <tr 
                    key={index}
                    onClick={() => handleClick(item)}
                    className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                  >
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-100 text-green-700' :
                        item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-100 text-yellow-700' :
                        item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {getGradeDisplay(item.quality.grade)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                            <img 
                              src={firstImageUrl}
                              alt=""
                              className={`w-full h-full ${
                                firstImageUrl.includes('/assets/icon/') 
                                  ? 'object-contain p-2' 
                                  : 'object-cover'
                              }`}
                              loading={index < 10 ? "eager" : "lazy"}
                              onError={(e) => {
                                e.target.src = getDefaultImage(item.type);
                              }}
                            />
                          </div>
                          {imagesCount > 1 && (
                            <div className="absolute -top-2 -right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded-full">
                              {imagesCount}
                            </div>
                          )}
                          {item.spectrogram && (
                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1.5 rounded-full shadow-md">
                              <FontAwesomeIcon icon={faPlay} className="text-xs" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{item.title}</div>
                          <div className="text-sm text-gray-500 italic mt-0.5">
                            {extractScientificName(item.species) || item.nameLat || '-'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Link 
                        to={`/profile/${item.observer_id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          window.open(`/profile/${item.observer_id}`, '_blank');
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {item.observer}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{item.location || '-'}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {item.type === 'bird' && (
                          <>
                            <div className="text-sm text-green-600">{item.fobi_count || 0} FOBI</div>
                            <div className="text-sm text-blue-600">{item.burungnesia_count || 0} Burungnesia</div>
                          </>
                        )}
                        {item.type === 'butterfly' && (
                          <>
                            <div className="text-sm text-green-600">{item.fobi_count || 0} FOBI</div>
                            <div className="text-sm text-purple-600">{item.kupunesia_count || 0} Kupunesia</div>
                          </>
                        )}
                        {item.type === 'general' && (
                          <div className="text-sm text-green-600">{item.fobi_count || 0} FOBI</div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm whitespace-nowrap">
                      {item.observation_date 
                        ? new Date(item.observation_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </td>
                    <td className="p-4 text-sm whitespace-nowrap text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 text-gray-400">
                        {item.quality.has_media && (
                          <FontAwesomeIcon icon={faImage} className="hover:text-gray-600" title="Has Media" />
                        )}
                        {item.quality.is_wild && (
                          <FontAwesomeIcon icon={faDove} className="hover:text-gray-600" title="Wild" />
                        )}
                        {item.quality.location_accurate && (
                          <FontAwesomeIcon icon={faLocationDot} className="hover:text-gray-600" title="Location Accurate" />
                        )}
                        {item.quality.needs_id && (
                          <FontAwesomeIcon icon={faQuestion} className="hover:text-gray-600" title="Needs ID" />
                        )}
                        {item.type === 'general' && item.quality.recent_evidence && (
                          <FontAwesomeIcon icon={faCheck} className="hover:text-gray-600" title="Recent Evidence" />
                        )}
                        {item.type === 'general' && item.quality.related_evidence && (
                          <FontAwesomeIcon icon={faLink} className="hover:text-gray-600" title="Related Evidence" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Tambahkan komponen ListViewMobile
const ListViewMobile = ({ observations, displayedItems, handleClick }) => {
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction: 
        prevConfig.key === key 
          ? prevConfig.direction === 'asc' 
            ? 'desc' 
            : 'asc'
          : 'desc'
    }));
  };

  const sortedObservations = [...observations].sort((a, b) => {
    if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;
    const dateA = new Date(a[sortConfig.key]);
    const dateB = new Date(b[sortConfig.key]);
    return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
  });

  return (
    <div className="md:hidden px-2">
      {/* Sort Controls */}
      <div className="flex gap-4 mb-4 p-3 bg-white rounded-lg shadow-sm">
        <SortableHeader
          title="Tgl Observasi"
          sortKey="observation_date"
          currentSort={sortConfig}
          onSort={handleSort}
          className="text-sm"
        />
        <SortableHeader
          title="Tgl Upload"
          sortKey="created_at"
          currentSort={sortConfig}
          onSort={handleSort}
          className="text-sm"
        />
      </div>

      {/* Cards */}
      {sortedObservations
        .slice(0, displayedItems)
        .map((item, index) => (
          <div 
            key={index}
            onClick={() => handleClick(item)}
            className="bg-white rounded-lg shadow-sm mb-3 overflow-hidden"
          >
            <div className="flex items-start p-3 gap-3">
              {/* Thumbnail dan Badges */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <img 
                    src={item.images?.[0]?.url || item.image || getDefaultImage(item.type)}
                    alt={item.title} 
                    className={`w-full h-full ${
                      (item.images?.[0]?.url || item.image || '').includes('/assets/icon/') 
                        ? 'object-contain p-2' 
                        : 'object-cover'
                    }`}
                    loading={index < 10 ? "eager" : "lazy"}
                    onError={(e) => {
                      e.target.src = getDefaultImage(item.type);
                    }}
                  />
                </div>
                {item.images?.length > 1 && (
                  <div className="absolute -top-1 -right-1 bg-gray-900/80 text-white text-xs px-1.5 rounded-full">
                    {item.images.length}
                  </div>
                )}
                {item.spectrogram && (
                  <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full shadow-md">
                    <FontAwesomeIcon icon={faPlay} className="text-xs" />
                  </div>
                )}
              </div>

              {/* Informasi Utama */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                    <p className="text-sm text-gray-500 italic mt-0.5">
                      {extractScientificName(item.species) || item.nameLat || '-'}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                    item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-100 text-green-700' :
                    item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-100 text-yellow-700' :
                    item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {getGradeDisplay(item.quality.grade)}
                  </span>
                </div>

                {/* Observer dan Lokasi */}
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Link 
                    to={`/profile/${item.observer_id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      window.open(`/profile/${item.observer_id}`, '_blank');
                    }}
                    className="text-blue-600"
                  >
                    {item.observer}
                  </Link>
                  {item.location && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 truncate">{item.location}</span>
                    </>
                  )}
                </div>

                {/* Tanggal */}
                <div className="px-3 pb-3 text-xs text-gray-500">
                  <div className="flex justify-between items-center">
                    <span>
                      Observasi: {item.observation_date 
                        ? new Date(item.observation_date).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </span>
                    <span>
                      Upload: {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                {/* Jumlah Observasi */}
                <div className="mt-2 flex gap-2 text-xs">
                  {item.type === 'bird' && (
                    <>
                      <span className="text-green-600">{item.fobi_count || 0} FOBI</span>
                      <span className="text-blue-600">{item.burungnesia_count || 0} Burungnesia</span>
                    </>
                  )}
                  {item.type === 'butterfly' && (
                    <>
                      <span className="text-green-600">{item.fobi_count || 0} FOBI</span>
                      <span className="text-purple-600">{item.kupunesia_count || 0} Kupunesia</span>
                    </>
                  )}
                  {item.type === 'general' && (
                    <span className="text-green-600">{item.fobi_count || 0} FOBI</span>
                  )}
                </div>

                {/* Icons */}
                <div className="mt-2 flex gap-2 text-gray-400">
                  {item.quality.has_media && (
                    <FontAwesomeIcon icon={faImage} title="Has Media" />
                  )}
                  {item.quality.is_wild && (
                    <FontAwesomeIcon icon={faDove} title="Wild" />
                  )}
                  {item.quality.location_accurate && (
                    <FontAwesomeIcon icon={faLocationDot} title="Location Accurate" />
                  )}
                  {item.quality.needs_id && (
                    <FontAwesomeIcon icon={faQuestion} title="Needs ID" />
                  )}
                  {item.type === 'general' && item.quality.recent_evidence && (
                    <FontAwesomeIcon icon={faCheck} title="Recent Evidence" />
                  )}
                  {item.type === 'general' && item.quality.related_evidence && (
                    <FontAwesomeIcon icon={faLink} title="Related Evidence" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

// Langkah 2: Modifikasi GridView Component untuk menangani view mode
const GridView = ({ searchParams, filterParams = defaultFilterParams, view = 'grid' }) => {
  const [visibleIndex, setVisibleIndex] = useState(null);
  const cardRefs = useRef([]);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayedItems, setDisplayedItems] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
  
  const { ref, inView } = useInView({
    threshold: 0,
  });

  const toggleDescription = (index) => {
    setVisibleIndex(visibleIndex === index ? null : index);
  };

  const handleClickOutside = (event) => {
    if (cardRefs.current.every(ref => ref && !ref.contains(event.target))) {
      setVisibleIndex(null);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setVisibleIndex(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const fetchObservations = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams();

        if (searchParams) {
          if (searchParams.search) queryParams.append('search', searchParams.search);
          if (searchParams.location) {
            queryParams.append('location', searchParams.location);
          }
          if (searchParams.latitude && searchParams.longitude) {
            queryParams.append('latitude', searchParams.latitude);
            queryParams.append('longitude', searchParams.longitude);

            // Gunakan radius dari filterParams jika ada
            const radius = searchParams.radius || filterParams.radius;
            queryParams.append('radius', radius);
          }
        }

        // Update bagian filter params untuk grade
        if (filterParams) {
          if (filterParams.has_media) queryParams.append('has_media', filterParams.has_media);
          if (filterParams.media_type) queryParams.append('media_type', filterParams.media_type);
          if (filterParams.data_source) {
            filterParams.data_source.forEach(source => {
              queryParams.append('data_source[]', source);
            });
          }
          // Pastikan grade adalah array dan tidak kosong
          if (Array.isArray(filterParams.grade) && filterParams.grade.length > 0) {
            filterParams.grade.forEach(grade => {
              queryParams.append('grade[]', grade.toLowerCase()); // Pastikan lowercase
            });
          }
        }

        const queryString = queryParams.toString();
        console.log('Query params being sent:', queryString);

        const baseUrl = `${import.meta.env.VITE_API_URL}`;
        const fetchPromises = [];

        // Sesuaikan dengan data_source yang dipilih
        const selectedSources = filterParams?.data_source || ['fobi', 'burungnesia', 'kupunesia'];

        if (selectedSources.includes('fobi')) {
          fetchPromises.push(
            fetch(`${baseUrl}/general-observations${queryString ? `?${queryString}` : ''}`)
              .then(res => res.json())
              .catch(err => {
                console.error('Error fetching general:', err);
                return { data: [] };
              })
          );
        }

        if (selectedSources.includes('burungnesia')) {
          fetchPromises.push(
            fetch(`${baseUrl}/bird-observations${queryString ? `?${queryString}` : ''}`)
              .then(res => res.json())
              .catch(err => {
                console.error('Error fetching birds:', err);
                return { data: [] };
              })
          );
        }

        if (selectedSources.includes('kupunesia')) {
          fetchPromises.push(
            fetch(`${baseUrl}/butterfly-observations${queryString ? `?${queryString}` : ''}`)
              .then(res => res.json())
              .catch(err => {
                console.error('Error fetching butterflies:', err);
                return { data: [] };
              })
          );
        }

        const responses = await Promise.all(fetchPromises);

        // Ubah cara penggabungan data
        let allObservations = [];
        
        // Proses semua response secara bersamaan
        responses.forEach((response, index) => {
          const data = response?.data || [];
          let formattedData;
          
          if (selectedSources[index] === 'fobi') {
            formattedData = formatGeneralData(data);
          } else if (selectedSources[index] === 'burungnesia') {
            formattedData = formatBirdData(data);
          } else if (selectedSources[index] === 'kupunesia') {
            formattedData = formatButterflyData(data);
          }
          
          // Gabungkan langsung ke array utama
          allObservations = [...allObservations, ...formattedData];
        });

        // Urutkan semua data berdasarkan created_at
        const sortedData = allObservations.sort((a, b) => {
          // Pastikan format tanggal valid
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          
          // Jika tanggal sama, tidak perlu mengurutkan berdasarkan sumber
          if (dateB === dateA) {
            return 0;
          }
          
          return dateB - dateA; // Descending order (terbaru ke terlama)
        });

        setObservations(sortedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };

    fetchObservations();
  }, [searchParams, filterParams]);

  // Fungsi helper untuk memformat data dengan pengecekan null/undefined
  const formatGeneralData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: `${item?.id || ''}`,
      taxa_id: item?.taxa_id || '',
      media_id: item?.media_id || '',
      image: item?.images?.[0]?.url || null,
      title: item?.cname_species || 
             item?.cname_genus || 
             item?.cname_family || 
             item?.cname_order || 
             item?.cname_tribe || 
             extractScientificName(item?.species) ||
             item?.genus || 
             item?.family || 
             'Tidak ada nama',
      description: `Family: ${item?.family || '-'}
      Genus: ${item?.genus || '-'}
      Species: ${extractScientificName(item?.species) || '-'} 
      `,
      observer: item?.observer_name || 'Anonymous',
      observer_id: item?.observer_id || '',
      quality: {
        grade: item?.grade || 'casual',
        has_media: Boolean(item?.has_media),
        is_wild: Boolean(item?.is_wild),
        location_accurate: Boolean(item?.location_accurate),
        recent_evidence: Boolean(item?.recent_evidence),
        related_evidence: Boolean(item?.related_evidence),
        needs_id: Boolean(item?.needs_id),
        community_id_level: item?.community_id_level || null
      },
      observation_date: item?.observation_date || '',
      created_at: item?.created_at || new Date(0).toISOString(),
      updated_at: item?.updated_at || '',
      type: 'general',
      spectrogram: item?.spectrogram || null,
      identifications_count: item?.total_identifications || 0,
      fobi_count: item?.fobi_count || 0,
      location: formatLocation(item?.latitude, item?.longitude),
      locationData: {
        latitude: parseFloat(item?.latitude),
        longitude: parseFloat(item?.longitude)
      },
    }));
  };

  const formatBirdData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: `${item?.id || ''}`,
      fauna_id: item?.fauna_id || '',
      image: item?.images?.[0]?.url || null,
      title: item?.nameId || 'Tidak ada nama',
      description: `${item?.nameLat || '-'}\n${item?.family || '-'}\nGrade: ${item?.grade || '-'}\n${item?.notes || '-'}`,
      observer: item?.observer_name || 'Anonymous',
      observer_id: item?.observer_id || '',
      count: `${item?.count || 0} Individu`,
      breeding: item?.breeding ? 'Breeding' : 'Non-breeding',
      breeding_note: item?.breeding_note || '-',
      quality: {
        grade: item?.grade || 'casual',
        has_media: Boolean(item?.has_media),
        is_wild: Boolean(item?.is_wild),
        location_accurate: Boolean(item?.location_accurate),
        needs_id: Boolean(item?.needs_id),
        community_level: item?.community_id_level || null
      },
      type: 'bird',
      spectrogram: item?.spectrogram || null,
      identifications_count: item?.total_identifications || 0,
      burungnesia_count: item?.burungnesia_count || 0,
      fobi_count: item?.fobi_count || 0,
      created_at: item?.created_at || new Date(0).toISOString(),
      observation_date: item?.observation_date || '',
      location: formatLocation(item?.latitude, item?.longitude),
      locationData: {
        latitude: parseFloat(item?.latitude),
        longitude: parseFloat(item?.longitude)
      },
    }));
  };

  const formatButterflyData = (data) => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: `${item?.id || ''}`,
      fauna_id: item?.fauna_id || '',
      image: item?.images?.[0]?.url || null,
      title: item?.nameId || 'Tidak ada nama',
      description: `${item?.nameLat || '-'}\n${item?.family || '-'}\nGrade: ${item?.grade || '-'}\n${item?.notes || '-'}`,
      observer: item?.observer_name || 'Anonymous',
      observer_id: item?.observer_id || '',
      count: `${item?.count || 0} Individu`,
      breeding: item?.breeding ? 'Breeding' : 'Non-breeding',
      breeding_note: item?.breeding_note || '-',
      quality: {
        grade: item?.grade || 'casual',
        has_media: Boolean(item?.has_media),
        is_wild: Boolean(item?.is_wild),
        location_accurate: Boolean(item?.location_accurate),
        needs_id: Boolean(item?.needs_id),
        community_level: item?.community_id_level || null
      },
      type: 'butterfly',
      spectrogram: item?.spectrogram || null,
      identifications_count: item?.total_identifications || 0,
      kupunesia_count: item?.kupunesia_count || 0,
      fobi_count: item?.fobi_count || 0,
      created_at: item?.created_at || new Date(0).toISOString(),
      observation_date: item?.observation_date || '',
      location: formatLocation(item?.latitude, item?.longitude),
      locationData: {
        latitude: parseFloat(item?.latitude),
        longitude: parseFloat(item?.longitude)
      },
    }));
  };

  const handleMobileClick = (item) => {
    let path;
    switch(item.type) {
      case 'bird':
        path = `/observations/BN${item.id}`;
        break;
      case 'butterfly':
        path = `/observations/KP${item.id}`;
        break;
      default:
        path = `/observations/${item.id}?source=fobi`;
    }
    window.open(path, '_blank');
  };

  // Fungsi untuk memuat lebih banyak item
  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      const nextItems = displayedItems + 10;
      setDisplayedItems(nextItems);
      
      // Cek apakah masih ada item yang bisa dimuat
      if (nextItems >= observations.length) {
        setHasMore(false);
      }
      
      // Setelah 50 item, gunakan tombol
      if (nextItems >= 50) {
        setShowLoadMoreButton(true);
      }
      
      setLoadingMore(false);
    }, 500);
  };

  // Effect untuk infinite scroll
  useEffect(() => {
    if (inView && hasMore && !showLoadMoreButton && !loadingMore) {
      loadMore();
    }
  }, [inView]);

  // Fungsi untuk membuka di tab baru
  const handleRowClick = (item) => {
    let path;
    const source = item.type || 'fobi';
    
    switch(source) {
      case 'bird':
        path = `/observations/BN${item.id}`;
        break;
      case 'butterfly':
        path = `/observations/KP${item.id}`;
        break;
      default:
        path = `/observations/${item.id}?source=fobi`;
    }
    window.open(path, '_blank');
  };

  if (loading) return <div>Memuat data...</div>;
  if (error) return <div>{error}</div>;

  return (
    <>
      {/* Desktop View */}
      {view === 'grid' ? (
        // Existing Grid View Desktop
        <div className="hidden md:grid gap-3 px-4 mx-auto
          md:grid-cols-3 md:max-w-4xl 
          lg:grid-cols-4 lg:max-w-6xl 
          xl:grid-cols-5 xl:max-w-7xl
          2xl:grid-cols-6 2xl:max-w-[90rem]">
          {observations.slice(0, displayedItems).map((item, index) => (
            <Card 
              key={index} 
              item={item} 
              isEager={index < 10}
            />
          ))}
        </div>
      ) : (
        // List View Desktop
        <ListViewDesktop 
          observations={observations}
          displayedItems={displayedItems}
          handleClick={handleRowClick}
        />
      )}

      {/* Mobile View */}
      <div className="md:hidden">
        {view === 'grid' ? (
          // Existing Mobile Grid View
          <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-3">
            {observations.slice(0, displayedItems).map((item, index) => (
              <div key={index} className="card relative rounded-md overflow-hidden shadow-sm">
                <div
                  className="cursor-pointer aspect-square relative"
                  onClick={() => handleMobileClick(item)}
                >
                  {item.spectrogram ? (
                    <SpectrogramPlayer
                      spectrogramUrl={item.spectrogram}
                      audioUrl={item.audioUrl}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100">
                      <img 
                        src={item.images?.[0]?.url || item.image || getDefaultImage(item.type)}
                        alt={item.title} 
                        className={`w-full h-full ${
                          (item.images?.[0]?.url || item.image || '').includes('/assets/icon/') 
                            ? 'object-contain p-4' 
                            : 'object-cover'
                        }`}
                        loading={index < 10 ? "eager" : "lazy"}
                        onError={(e) => {
                          e.target.src = getDefaultImage(item.type);
                        }}
                      />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                    <span className="text-white text-[10px] line-clamp-1">
                      {item.title}
                    </span>
                  </div>
                </div>

                <span className={`absolute top-1 left-1 text-[8px] px-1.5 py-0.5 rounded-full text-white ${
                  item.quality.grade.toLowerCase() === 'research grade' ? 'bg-green-500/70' :
                  item.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500/70' :
                  item.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500/70' :
                  'bg-gray-500/70'
                }`}>
                  {getGradeDisplay(item.quality.grade)}
                </span>

                <button
                  onClick={() => toggleDescription(index)}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                >
                  <FontAwesomeIcon icon={faInfo} className="text-[8px]" />
                </button>

                {visibleIndex === index && (
                  <div className="absolute inset-0 bg-black/90 text-white p-3 text-xs overflow-y-auto">
                    <div className="space-y-2">
                      <p className="font-medium">{item.title}</p>
                      <p className="whitespace-pre-line text-gray-300">{item.description}</p>
                      <p className="text-gray-300">Observer: {item.observer}</p>
                      {item.breeding && <p className="text-gray-300">{item.breeding}</p>}
                      {item.count && <p className="text-gray-300">{item.count}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // New Mobile List View
          <ListViewMobile 
            observations={observations}
            displayedItems={displayedItems}
            handleClick={handleRowClick}
          />
        )}
      </div>

      {/* Loading dan Load More Button */}
      {hasMore && (
        <div className="mt-4 flex justify-center" ref={ref}>
          {loadingMore ? (
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Memuat...</span>
            </div>
          ) : showLoadMoreButton ? (
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
            >
              Muat Lebih Banyak
            </button>
          ) : null}
        </div>
      )}
    </>
  );
};

export default GridView;
