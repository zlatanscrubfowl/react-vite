import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faInfo, faListDots, faImage, faDove, faLocationDot, faQuestion, faCheck, faLink, faUsers, faPause, faPlay, faSearch, faFilter, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import ChecklistDetail from '../DetailObservations/ChecklistDetail';
import { useInView } from 'react-intersection-observer';
import defaultBirdLogo from '../../assets/icon/icon.png';
import defaultButterflyLogo from '../../assets/icon/kupnes.png';
import defaultFobiLogo from '../../assets/icon/FOBI.png';

// Tambahkan fungsi helper untuk mendapatkan gambar default
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

// Tambahkan fungsi untuk mendapatkan URL gambar
const getImageUrl = (item) => {
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
        const imageUrl = typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url;
        if (imageUrl) return imageUrl;
    }
    return getDefaultImage(item.type);
};

// Tambahkan fungsi getGradeDisplay
const getGradeDisplay = (grade) => {
    if (!grade) return '-';
    
    switch (grade.toLowerCase()) {
        case 'research grade':
            return 'Research';
        case 'needs id':
            return 'Needs ID';
        case 'low quality id':
            return 'Low Quality';
        case 'casual':
            return 'Casual';
        default:
            return grade;
    }
};

// Update fungsi getSourceAndCleanId
const getSourceAndCleanId = (id) => {
    if (!id) {
        return { source: 'fobi', cleanId: '' };
    }

    const idString = String(id);
    
    // Cek prefix untuk menentukan source
    if (idString.startsWith('BN')) {
        return { source: 'burungnesia', cleanId: idString.substring(2) };
    }
    if (idString.startsWith('KP')) {
        return { source: 'kupunesia', cleanId: idString.substring(2) };
    }

    // Default case untuk FOBI
    return { source: 'fobi', cleanId: idString };
};

// Komponen ObservationCard
const ObservationCard = ({ observation, onClick }) => {
    const getGradeDisplay = (grade) => {
        switch(grade.toLowerCase()) {
            case 'needs id':
                return 'Bantu Iden';
            case 'low quality id':
                return 'ID Kurang';
            default:
                return 'Casual';
        }
    };

    const getTypeLabel = (type) => {
        switch(type) {
            case 'bird':
                return 'Burungnesia';
            case 'butterfly':
                return 'Kupunesia';
            default:
                return 'FOBI';
        }
    };

    return (
        <div className="card bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300" 
             onClick={onClick}>
            <div className="relative h-48 bg-gray-200">
                {observation.spectrogram ? (
                    <SpectrogramPlayer
                        spectrogramUrl={observation.spectrogram}
                        audioUrl={observation.audioUrl}
                    />
                ) : (
                    <div className="w-full h-full bg-gray-100">
                        <img 
                            src={getImageUrl(observation)}
                            alt=""
                            className={`w-full h-full ${
                                getImageUrl(observation).includes('/assets/icon/') 
                                    ? 'object-contain p-4' 
                                    : 'object-cover'
                            }`}
                            loading="lazy"
                            onError={(e) => {
                                e.target.src = getDefaultImage(observation.type);
                            }}
                        />
                    </div>
                )}
                <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs text-white ${
                        observation.quality.grade.toLowerCase().includes('needs') ? 'bg-yellow-500' :
                        observation.quality.grade.toLowerCase().includes('low') ? 'bg-orange-500' :
                        'bg-gray-500'
                    }`}>
                        {getGradeDisplay(observation.quality.grade)}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-gray-600">{observation.observer}</span>
                    <span className="text-xs font-medium text-gray-500">
                        {getTypeLabel(observation.type)}
                    </span>
                </div>

                <h5 className="font-medium text-lg mb-2 line-clamp-2">{observation.title}</h5>

                <div className="flex items-center justify-between mt-4">
                    <div className="quality-indicators flex gap-2 text-gray-600">
                        {observation.quality.has_media && 
                            <FontAwesomeIcon icon={faImage} title="Has Media" />}
                        {observation.quality.is_wild && 
                            <FontAwesomeIcon icon={faDove} title="Wild" />}
                        {observation.quality.location_accurate && 
                            <FontAwesomeIcon icon={faLocationDot} title="Location Accurate" />}
                        {observation.quality.needs_id && 
                            <FontAwesomeIcon icon={faQuestion} title="Needs ID" />}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FontAwesomeIcon icon={faUsers} />
                        <span>{observation.identifications_count}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Update ObservationModal untuk menangani ID dengan prefix
const ObservationModal = ({ isOpen, onClose, observation }) => {
    const queryClient = useQueryClient();
    const formattedId = observation ? 
        (observation.type === 'bird' ? `BN${observation.id}` :
         observation.type === 'butterfly' ? `KP${observation.id}` :
         observation.id) : null;

    const updateMutation = useMutation({
        mutationFn: async (updatedData) => {
            const { source, cleanId } = getSourceAndCleanId(updatedData.id);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/observations/${cleanId}?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['observations']);
            onClose();
        },
        onError: (error) => {
            console.error('Update error:', error);
        }
    });

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-100"
                onClose={onClose}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                                {observation && (
                                    <ChecklistDetail 
                                        id={formattedId}
                                        isModal={true}
                                        onClose={onClose}
                                        onUpdate={(data) => updateMutation.mutate(data)}
                                    />
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

// Tambahkan komponen SpectrogramPlayer
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

// Tambahkan fungsi helper untuk membuat unique key
const generateUniqueKey = (observation) => {
    const timestamp = Date.parse(observation.created_at);
    const randomSuffix = Math.random().toString(36).substring(7);
    return `${observation.type}-${observation.id}-${timestamp}-${randomSuffix}`;
};

// Komponen utama BantuIdent dengan React Query
const BantuIdent = () => {
    const [selectedObservation, setSelectedObservation] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const queryClient = useQueryClient();
    const [displayedItems, setDisplayedItems] = useState(5);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);
    const [visibleIndex, setVisibleIndex] = useState(null);
    const [filters, setFilters] = useState({
        grades: ['needs id', 'low quality id'],
        searchQuery: '',
        searchType: 'species' // default search by species
    });

    const { ref, inView } = useInView({
        threshold: 0,
    });

    const formatGeneralData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            id: item?.id || '',
            taxa_id: item?.taxa_id || '',
            media_id: item?.media_id || '',
            images: item?.images || [],
            title: item?.cname_species || 
                   item?.cname_genus || 
                   item?.cname_family || 
                   item?.cname_order || 
                   item?.cname_tribe || 
                   item?.family || 
                   item?.genus || 
                   item?.species || 
                   'Tidak ada nama',
            description: `Family: ${item?.family || '-'}
            Genus: ${item?.genus || '-'}
            Species: ${item?.species || '-'}`,
            observer: item?.observer_name || 'Anonymous',
            quality: {
                grade: item?.grade || 'casual',
                has_media: Boolean(item?.has_media),
                is_wild: Boolean(item?.is_wild),
                location_accurate: Boolean(item?.location_accurate),
                needs_id: Boolean(item?.needs_id)
            },
            type: 'general',
            spectrogram: item?.spectrogram || null,
            audioUrl: item?.audio_url || null,
            created_at: item?.created_at || new Date().toISOString(),
            identifications_count: item?.identifications_count || 0,
            fobi_count: item?.fobi_count || 0,
        }));
    };

    const formatBirdData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            ...formatGeneralData([item])[0],
            type: 'bird',
            spectrogram: item?.spectrogram || null,
            audioUrl: item?.audio_url || null,
            burungnesia_count: item?.burungnesia_count || 0
        }));
    };

    const formatButterflyData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            ...formatGeneralData([item])[0],
            type: 'butterfly',
            spectrogram: item?.spectrogram || null,
            audioUrl: item?.audio_url || null,
            kupunesia_count: item?.kupunesia_count || 0
        }));
    };

    const fetchObservations = async () => {
        const baseUrl = `${import.meta.env.VITE_API_URL}`;
        
        // Tambahkan query params untuk grade
        const queryParams = new URLSearchParams();
        queryParams.append('grade[]', 'needs id');
        queryParams.append('grade[]', 'low quality id');
        const queryString = queryParams.toString();

        const fetchPromises = [
            fetch(`${baseUrl}/general-observations?${queryString}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json'
                }
            }).then(res => res.json())
            .catch(err => {
                console.error('Error fetching general:', err);
                return { data: [] };
            }),
            fetch(`${baseUrl}/bird-observations?${queryString}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json'
                }
            }).then(res => res.json())
            .catch(err => {
                console.error('Error fetching birds:', err);
                return { data: [] };
            }),
            fetch(`${baseUrl}/butterfly-observations?${queryString}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json'
                }
            }).then(res => res.json())
            .catch(err => {
                console.error('Error fetching butterflies:', err);
                return { data: [] };
            })
        ];

        const responses = await Promise.all(fetchPromises);

        const combinedData = responses.reduce((acc, response, index) => {
            if (!response.success) {
                console.error(`Error in response ${index}:`, response);
                return acc;
            }

            const data = response.data || [];
            let formattedData;
            if (index === 0) formattedData = formatGeneralData(data);
            if (index === 1) formattedData = formatBirdData(data);
            if (index === 2) formattedData = formatButterflyData(data);

            // Filter hanya needs id dan low quality id
            const filteredData = formattedData.filter(item => 
                item.quality.grade.toLowerCase() === 'needs id' || 
                item.quality.grade.toLowerCase() === 'low quality id'
            );

            return [...acc, ...filteredData];
        }, []);

        return combinedData;
    };

    // Implementasi React Query
    const { data: observations, isLoading, error } = useQuery({
        queryKey: ['observations'],
        queryFn: fetchObservations,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 30000, // Data dianggap stale setelah 30 detik
        cacheTime: 5 * 60 * 1000, // Cache bertahan 5 menit
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    const handleCardClick = (observation) => {
        setSelectedObservation(observation);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        queryClient.invalidateQueries(['observations']);
    };

    // Fungsi untuk memuat lebih banyak item
    const loadMore = () => {
        setLoadingMore(true);
        setTimeout(() => {
            const nextItems = displayedItems + 5;
            setDisplayedItems(nextItems);
            
            // Cek apakah masih ada item yang bisa dimuat
            if (nextItems >= (observations?.length || 0)) {
                setHasMore(false);
            }
            
            // Setelah 20 item, gunakan tombol
            if (nextItems >= 20) {
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

    const toggleDescription = (index) => {
        setVisibleIndex(visibleIndex === index ? null : index);
    };

    // Update fungsi filter
    const filterObservations = (data) => {
        if (!data) return [];
        
        return data.filter(item => {
            // Filter berdasarkan grade
            if (!filters.grades.includes(item.quality.grade.toLowerCase())) {
                return false;
            }

            // Filter berdasarkan search query
            if (filters.searchQuery) {
                switch (filters.searchType) {
                    case 'species':
                        return item.title.toLowerCase().includes(filters.searchQuery.toLowerCase());
                    case 'date':
                        const itemDate = new Date(item.created_at).toLocaleDateString();
                        const searchDate = new Date(filters.searchQuery).toLocaleDateString();
                        return itemDate === searchDate;
                    default:
                        return true;
                }
            }

            return true;
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600">Gagal memuat data</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 overflow-hidden mb-2">
            <h1 className="text-2xl font-bold mb-6">Bantu Identifikasi</h1>

            {/* Filter dan Search Section */}
            <div className="mb-6 space-y-4">
                {/* Grade Filters */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['needs id', 'low quality id']
                        }))}
                        className={`px-4 py-2 rounded-full text-sm ${
                            filters.grades.length === 2 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        Semua
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['needs id']
                        }))}
                        className={`px-4 py-2 rounded-full text-sm ${
                            filters.grades.length === 1 && filters.grades[0] === 'needs id'
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        Bantu Ident
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({
                            ...prev,
                            grades: ['low quality id']
                        }))}
                        className={`px-4 py-2 rounded-full text-sm ${
                            filters.grades.length === 1 && filters.grades[0] === 'low quality id'
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-gray-200 text-gray-700'
                        }`}
                    >
                        ID Kurang
                    </button>
                </div>

                {/* Search Section */}
                <div className="flex flex-wrap gap-2">
                    <div className="flex-1 relative">
                        {filters.searchType === 'date' ? (
                            <input
                                type="date"
                                value={filters.searchQuery}
                                onChange={(e) => setFilters(prev => ({
                                    ...prev,
                                    searchQuery: e.target.value
                                }))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Cari species..."
                                    value={filters.searchQuery}
                                    onChange={(e) => {
                                        setFilters(prev => ({
                                            ...prev,
                                            searchQuery: e.target.value
                                        }));
                                    }}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                <FontAwesomeIcon 
                                    icon={faSearch} 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                />
                            </div>
                        )}
                    </div>
                    <select
                        value={filters.searchType}
                        onChange={(e) => {
                            setFilters(prev => ({
                                ...prev,
                                searchQuery: '', // Reset search query when changing type
                                searchType: e.target.value
                            }));
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                        <option value="species">Species</option>
                        <option value="date">Tanggal</option>
                    </select>
                </div>
            </div>

            {/* Tampilan Desktop - Update untuk menggunakan filtered data */}
            <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filterObservations(observations)?.slice(0, displayedItems).map((observation) => (
                    <ObservationCard 
                        key={generateUniqueKey(observation)}
                        observation={observation}
                        onClick={() => handleCardClick(observation)}
                    />
                ))}
            </div>

            {/* Tampilan Mobile - Update untuk menggunakan filtered data */}
            <div className="grid grid-cols-3 gap-1 md:hidden mx-1">
                {filterObservations(observations)?.slice(0, displayedItems).map((observation) => (
                    <div 
                        key={generateUniqueKey(observation)}
                        className="card relative rounded-md overflow-hidden shadow-sm"
                    >
                        <div
                            className="cursor-pointer aspect-square relative"
                            onClick={() => handleCardClick(observation)}
                        >
                            {observation.spectrogram ? (
                                <SpectrogramPlayer
                                    spectrogramUrl={observation.spectrogram}
                                    audioUrl={observation.audioUrl}
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-100">
                                    <img 
                                        src={getImageUrl(observation)} 
                                        alt={observation.title} 
                                        className={`w-full h-full ${
                                            getImageUrl(observation).includes('/assets/icon/') 
                                                ? 'object-contain p-4' 
                                                : 'object-cover'
                                        }`}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.src = getDefaultImage(observation.type);
                                        }}
                                    />
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                                <span className="text-white text-[10px] line-clamp-1">
                                    {observation.title}
                                </span>
                            </div>
                        </div>

                        <span className={`absolute top-1 left-1 text-[8px] px-1.5 py-0.5 rounded-full text-white ${
                            observation.quality.grade.toLowerCase() === 'needs id' ? 'bg-yellow-500/70' :
                            observation.quality.grade.toLowerCase() === 'low quality id' ? 'bg-orange-500/70' :
                            'bg-gray-500/70'
                        }`}>
                            {observation.quality.grade.toLowerCase() === 'needs id' ? 'Bantu Iden' :
                             observation.quality.grade.toLowerCase() === 'low quality id' ? 'ID Kurang' :
                             'Casual'}
                        </span>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleDescription(observation.id);
                            }}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors"
                        >
                            <FontAwesomeIcon icon={faInfo} className="text-[8px]" />
                        </button>

                        {visibleIndex === observation.id && (
                            <div className="absolute inset-0 bg-black/90 text-white p-3 text-xs overflow-y-auto">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium">{observation.title}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setVisibleIndex(null);
                                            }}
                                            className="text-white/80 hover:text-white"
                                        >
                                            <FontAwesomeIcon icon={faTimes} className="text-xs" />
                                        </button>
                                    </div>
                                    <p className="whitespace-pre-line text-gray-300">{observation.description}</p>
                                    <p className="text-gray-300">Observer: {observation.observer}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Loading dan Load More Button */}
            {hasMore && observations?.length > 0 && (
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

            {observations?.length === 0 && !isLoading && (
                <div className="text-center text-gray-600 mt-8">
                    Tidak ada data yang perlu diidentifikasi
                </div>
            )}

            <ObservationModal 
                isOpen={showModal}
                onClose={handleModalClose}
                observation={selectedObservation}
            />
        </div>
    );
};

export default BantuIdent;