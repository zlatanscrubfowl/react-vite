import React, { useState, useRef, useEffect } from 'react';
import LocationPicker from './Observations/LocationPicker';
import Modal from './Observations/LPModal';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faDna, 
    faCalendar, 
    faLocationDot,
    faTree,
    faNoteSticky,
    faMusic,
    faPlay,
    faPause,
    faChevronLeft,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import 'swiper/css/free-mode';
import './MediaCard.css';
import SpectrogramModal from './SpectrogramModal';
import QualityBadge from './QualityBadge';
import PropTypes from 'prop-types';
import { apiFetch } from '../utils/api';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';


function MediaCard({ observation, isSelected, onSelect, onUpdate, onDelete, bulkFormData, qualityGrade, uploadSessionId }) {
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [audioTime, setAudioTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [error, setError] = useState(null);
    const [isSpectrogramModalOpen, setIsSpectrogramModalOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const audioRef = useRef(null);
    const spectrogramRef = useRef(null);
    const progressRef = useRef(null);
    const audioUrlRef = useRef(null);
    const spectrogramContainerRef = useRef(null);
    const [spectrogramWidth, setSpectrogramWidth] = useState(0);
    const swiperRef = useRef(null);

    const [formData, setFormData] = useState({
        ...observation,
        scientific_name: observation.scientific_name || '',
        date: observation.date || '',
        latitude: observation.latitude || '',
        longitude: observation.longitude || '',
        locationName: observation.locationName || '',
        habitat: observation.habitat || '',
        description: observation.description || '',
        type_sound: observation.type_sound || '',
        kingdom: observation.kingdom || '',
        phylum: observation.phylum || '',
        class: observation.class || '',
        order: observation.order || '',
        family: observation.family || '',
        genus: observation.genus || '',
        species: observation.species || '',
        common_name: observation.common_name || '',
        taxon_rank: observation.taxon_rank || ''
    });

    useEffect(() => {
        if (isSelected && bulkFormData) {
            setFormData(prev => ({
                ...prev,
                ...Object.fromEntries(
                    Object.entries(bulkFormData).map(([key, value]) => [key, value || prev[key] || ''])
                )
            }));
        }
    }, [bulkFormData, isSelected]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            upload_session_id: uploadSessionId
        }));
    }, [uploadSessionId]);

    const getAudioUrl = () => {
        if (!observation?.file) return '';
        return URL.createObjectURL(observation.file);
    };

    const [audioUrl, setAudioUrl] = useState('');

    useEffect(() => {
        const url = getAudioUrl();
        setAudioUrl(url);

        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [observation.file]);

    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        const handlePlay = () => {
            setIsPlaying(true);
            setError(null);
        };

        const handlePause = () => setIsPlaying(false);
        
        const handleEnded = () => {
            setIsPlaying(false);
            if (progressRef.current) {
                progressRef.current.style.width = '0%';
            }
            if (swiperRef.current?.swiper) {
                swiperRef.current.swiper.setTranslate(0);
            }
        };

        const handleWaiting = () => setIsBuffering(true);
        
        const handleCanPlay = () => setIsBuffering(false);
        
        const handleError = (e) => {
            console.error('Audio error:', e);
            setError('Terjadi kesalahan saat memutar audio');
            setIsPlaying(false);
            setIsBuffering(false);
        };

        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
        };
    }, []);

    useEffect(() => {
        if (spectrogramRef.current) {
            const updateWidth = () => {
                setSpectrogramWidth(spectrogramRef.current.scrollWidth);
            };
            updateWidth();
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }
    }, [observation.spectrogramUrl]);

    useEffect(() => {
        if (audioRef.current && swiperRef.current?.swiper) {
            const audio = audioRef.current;
            const swiper = swiperRef.current.swiper;
            
            const handleTimeUpdate = () => {
                const progress = audio.currentTime / audio.duration;
                const slideSize = swiper.size;
                const totalWidth = swiper.virtualSize - slideSize;
                
                swiper.translateTo(-totalWidth * progress, 300, true);
            };

            audio.addEventListener('timeupdate', handleTimeUpdate);
            return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
        }
    }, []);
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            
            if (isNaN(duration)) return;
            
            setAudioTime(currentTime);
            
            if (progressRef.current) {
                const progress = (currentTime / duration) * 100;
                progressRef.current.style.transform = `scaleX(${progress / 100})`;
            }

            if (swiperRef.current?.swiper) {
                const swiper = swiperRef.current.swiper;
                const slideSize = swiper.size;
                const totalWidth = swiper.virtualSize - slideSize;
                const progress = currentTime / duration;
                
                requestAnimationFrame(() => {
                    swiper.translateTo(-totalWidth * progress, 300, true);
                });
            }
        }
    };
    
    const handleLoadedMetadata = () => {
        try {
            if (audioRef.current) {
                const duration = audioRef.current.duration;
                if (!isNaN(duration)) {
                    setAudioDuration(duration);
                }
            }
        } catch (error) {
            console.error('Error loading metadata:', error);
        }
    };

    const handleSpectrogramClick = (e) => {
        if (audioRef.current && swiperRef.current?.swiper) {
            const swiper = swiperRef.current.swiper;
            const rect = swiper.el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const clickPosition = x / width;
            
            const newTime = audioRef.current.duration * clickPosition;
            if (!isNaN(newTime)) {
                audioRef.current.currentTime = newTime;
                
                const totalWidth = swiper.virtualSize - swiper.size;
                swiper.setTranslate(-totalWidth * clickPosition);
                
                if (!isPlaying) {
                    audioRef.current.play()
                        .catch(error => {
                            console.error('Error playing audio:', error);
                            setError('Gagal memutar audio');
                        });
                }
            }
        }
    };

    const handleLocationSave = (lat, lng, name) => {
        const updatedData = {
            ...formData,
            latitude: lat,
            longitude: lng,
            locationName: name
        };
        
        setFormData(updatedData);
        onUpdate(updatedData);
        setIsLocationModalOpen(false);
    };

    const handleOpenLocationModal = () => {
        setIsLocationModalOpen(true);
    };

    useEffect(() => {
        console.log('Current formData:', formData);
    }, [formData.latitude, formData.longitude, formData.locationName]);

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [page, setPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const suggestionsRef = useRef(null);

    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    const handleInputChange = async (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => ({
            ...prev,
            [name]: value,
            displayName: name === 'scientific_name' ? value : prev.displayName
        }));

        if (name === 'scientific_name') {
            if (!value) {
                setFormData(prev => ({
                    ...prev,
                    scientific_name: '',
                    species: '',
                    common_name: '',
                    kingdom: '',
                    phylum: '',
                    class: '',
                    order: '',
                    family: '',
                    genus: '',
                    taxon_rank: '',
                    displayName: ''
                }));
                setSuggestions([]);
                setShowSuggestions(false);
                return;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(async () => {
                if (value.length > 2) {
                    try {
                        if (abortControllerRef.current) {
                            abortControllerRef.current.abort();
                        }
                        
                        abortControllerRef.current = new AbortController();
                        
                        const response = await apiFetch(
                            `/taxonomy/search?q=${encodeURIComponent(value)}&page=${1}`,
                            {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                signal: abortControllerRef.current.signal
                            }
                        );

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const data = await response.json();
                        
                        if (data.success) {
                            setSuggestions(data.data.slice(0, 5));
                            setShowSuggestions(true);
                            setHasMore(data.data.length >= 5);
                        } else {
                            setSuggestions([]);
                            setShowSuggestions(false);
                            setHasMore(false);
                        }
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            console.error('Error fetching suggestions:', error);
                            setSuggestions([]);
                            setShowSuggestions(false);
                            setHasMore(false);
                        }
                    }
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setHasMore(false);
                }
            }, 300);
        }
    };

    const loadMoreSuggestions = async () => {
        if (!hasMore || isLoadingMore) return;

        try {
            setIsLoadingMore(true);
            const nextPage = page + 1;
            const value = formData.scientific_name;

            const response = await apiFetch(`/taxonomy/search?q=${encodeURIComponent(value)}&page=${nextPage}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                setSuggestions(prev => [...prev, ...data.data.slice(0, 5)]);
                setPage(nextPage);
                setHasMore(data.data.length >= 5);
            }
        } catch (error) {
            console.error('Error loading more suggestions:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleSuggestionsScroll = (e) => {
        const element = e.target;
        if (element.scrollHeight - element.scrollTop === element.clientHeight) {
            loadMoreSuggestions();
        }
    };

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

    const displayName = extractScientificName(formData.scientific_name);

    const handleSuggestionClick = (suggestion) => {
        const updatedData = {
            ...formData,
            species: suggestion.species,
            common_name: suggestion.common_name,
            scientific_name: suggestion.scientific_name,
            kingdom: suggestion.kingdom,
            phylum: suggestion.phylum,
            class: suggestion.class,
            order: suggestion.order,
            family: suggestion.family,
            genus: suggestion.genus,
            taxon_rank: suggestion.taxon_rank,
            displayName: extractScientificName(suggestion.common_name || suggestion.species || suggestion.scientific_name)
        };
        
        setFormData(updatedData);
        onUpdate(updatedData);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleInputBlur = () => {
        setTimeout(() => {
            setShowSuggestions(false);
        }, 200);
    };

    const handleSave = () => {
        if (!observation.locationName) {
            toast.error('Lokasi harus diisi!', {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            });
            return;
        }

        onUpdate({
            ...formData,
            upload_session_id: uploadSessionId
        });
        setIsEditing(false);
    };

    const handleSpectrogramModalOpen = () => {
        setIsSpectrogramModalOpen(true);
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        setError(null);
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        setError('Gagal memutar audio');
                    });
            }
        }
    };

    useEffect(() => {
        if (onUpdate) {
            onUpdate({
                ...formData,
                common_name: formData.common_name || '',
                species: formData.species || '',
                scientific_name: formData.scientific_name || '',
                upload_session_id: uploadSessionId
            });
        }
    }, [formData, uploadSessionId]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleUpdate = (data) => {
        if (!data.scientific_name || !data.date || !observation.locationName || !data.habitat) {
            toast.error('Mohon lengkapi semua field yang wajib diisi!', {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            });
            return;
        }

        onUpdate(id, {
            ...data,
            scientific_name: data.scientific_name,
            common_name: data.common_name,
            class: data.class,
            order: data.order,
            family: data.family,
            genus: data.genus,
            species: data.species,
            description: data.description,
            habitat: data.habitat,
            type_sound: data.type_sound
        });
    };

    const formatCoordinate = (coord) => {
        if (typeof coord === 'number') {
            return coord.toFixed(6);
        }
        return '';
    };

    const analyzeAudio = async (audioUrl) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Setup analyzer
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            
            // Membuat source buffer
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(analyser);
            
            // Mengambil data frekuensi
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            analyser.getFloatFrequencyData(dataArray);

            // Menghitung frekuensi maksimum
            const nyquistFrequency = audioContext.sampleRate / 2;
            const binSize = nyquistFrequency / bufferLength;
            
            // Mencari frekuensi tertinggi dengan amplitudo signifikan
            let maxFreq = 0;
            for (let i = 0; i < bufferLength; i++) {
                const amplitude = dataArray[i];
                const frequency = i * binSize;
                
                // Threshold untuk amplitudo yang signifikan
                if (amplitude > -100 && frequency > maxFreq) {
                    maxFreq = frequency;
                }
            }

            // Pembulatan ke atas ke kHz terdekat
            maxFreq = Math.ceil(maxFreq / 1000) * 1000;
            
            // Membuat label frekuensi
            const labels = [];
            const steps = [1, 0.5, 0.25, 0]; // Proporsi untuk pembagian label
            
            steps.forEach(step => {
                const freq = maxFreq * step;
                if (freq === 0) {
                    labels.push('0 Hz');
                } else if (freq >= 1000) {
                    labels.push(`${Math.round(freq/1000)} kHz`);
                } else {
                    labels.push(`${Math.round(freq)} Hz`);
                }
            });

            return labels;
        } catch (error) {
            console.error('Error analyzing audio:', error);
            // Label default jika terjadi error
            return ['20 kHz', '10 kHz', '5 kHz', '0 Hz'];
        }
    };

    const [frequencyLabels, setFrequencyLabels] = useState(['20 kHz', '10 kHz', '5 kHz', '0 Hz']);

    useEffect(() => {
        if (observation.audioUrl) {
            analyzeAudio(observation.audioUrl)
                .then(labels => {
                    setFrequencyLabels(labels);
                })
                .catch(error => {
                    console.error('Error setting frequency labels:', error);
                });
        }
    }, [observation.audioUrl]);

    return (
        <div className={`relative border rounded-lg p-4 ${isSelected ? 'border-blue-500' : 'border-gray-200'}`}>
            <div className="absolute top-2 left-2 z-10">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(observation.id)}
                    className="w-5 h-5"
                />
            </div>

            <div className="relative">
                {observation.type === 'mixed' ? (
                    <div className="combined-media-container">
                        {/* Audio Section */}
                        {observation.audioFiles.length > 0 && (
                            <div className="audio-section mb-4">
                                <h3 className="text-sm font-medium mb-2">Audio Files ({observation.audioFiles.length})</h3>
                                {observation.audioFiles.map((file, index) => (
                                    <div key={index} className="audio-container mb-2">
                                        <audio
                                            ref={index === 0 ? audioRef : null}
                                            src={URL.createObjectURL(file)}
                                            preload="auto"
                                            onTimeUpdate={handleTimeUpdate}
                                            onLoadedMetadata={handleLoadedMetadata}
                                            className="w-full"
                                            controls
                                        />
                                        {observation.spectrogramUrls[index] && (
                                            <img 
                                                src={observation.spectrogramUrls[index]}
                                                alt={`Spectrogram ${index + 1}`}
                                                className="w-full h-24 object-cover mt-2"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Image Section */}
                        {observation.imageFiles.length > 0 && (
                            <div className="image-section">
                                <h3 className="text-sm font-medium mb-2">Images ({observation.imageFiles.length})</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {observation.imageFiles.map((file, index) => (
                                        <img
                                            key={index}
                                            src={URL.createObjectURL(file)}
                                            alt={`Combined image ${index + 1}`}
                                            className="w-full h-40 object-cover rounded-lg"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    observation.type === 'audio' ? (
                        <div className="audio-container">
                            {audioUrl && (
                                <audio
                                    ref={audioRef}
                                    src={audioUrl}
                                    preload="auto"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            )}

                            <div className="spectrogram-wrapper relative">
                                {observation.spectrogramUrl ? (
                                    <>
                                        <button 
                                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                                                      bg-black/50 hover:bg-black/70 text-white rounded-full p-4 z-10
                                                      transition-opacity duration-300 group-hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                togglePlay();
                                            }}
                                        >
                                            <FontAwesomeIcon 
                                                icon={isPlaying ? faPause : faPlay} 
                                                className="w-6 h-6"
                                            />
                                        </button>

                                        <Swiper
                                            ref={swiperRef}
                                            className="spectrogram-swiper"
                                            modules={[FreeMode]}
                                            freeMode={{
                                                enabled: true,
                                                momentum: true,
                                                momentumRatio: 0.8,
                                                momentumVelocityRatio: 0.6
                                            }}
                                            slidesPerView="auto"
                                            resistance={true}
                                            resistanceRatio={0}
                                            touchRatio={1.5}
                                            speed={300}
                                            cssMode={false}
                                        >
                                            <SwiperSlide>
                                                <div className="spectrogram-container z-2">
                                                    {/* <div className="frequency-labels">
                                                        <span>20 kHz</span>
                                                        <span>15 kHz</span>
                                                        <span>10 kHz</span>
                                                        <span>5 kHz</span>
                                                        <span>0 kHz</span>
                                                    </div> */}
                                                    <img
                                                        src={observation.spectrogramUrl}
                                                        alt="Spectrogram"
                                                        className="spectrogram-image cursor-pointer z-2"
                                                        onClick={(e) => {
                                                            handleSpectrogramClick(e);
                                                            handleSpectrogramModalOpen();
                                                        }}
                                                    />
                                                    <div 
                                                        ref={progressRef}
                                                        className="progress-overlay"
                                                    />
                                                </div>
                                            </SwiperSlide>
                                        </Swiper>
                                    </>
                                ) : (
                                    <div className="spectrogram-loading">
                                        <div className="loading-spinner" />
                                        <span>Generating spectrogram...</span>
                                    </div>
                                )}
                            </div>

                            <div className="audio-controls flex items-center justify-between px-4 py-2 bg-gray-100 rounded-b-lg">
                                <button 
                                    className="play-pause-btn flex items-center space-x-2"
                                    onClick={togglePlay}
                                >
                                    <FontAwesomeIcon 
                                        icon={isPlaying ? faPause : faPlay} 
                                        className="w-4 h-4"
                                    />
                                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                                </button>

                                <div className="time-info text-sm">
                                    <span>{formatTime(audioTime)} / {formatTime(audioDuration)}</span>
                                </div>

                                <span className="format-info text-sm">
                                    {observation?.file?.type?.split('/')[1]?.toUpperCase() || 'AUDIO'}
                                </span>
                            </div>

                            {error && <div className="error-message text-red-500 text-sm mt-2">{error}</div>}
                            {isBuffering && (
                                <div className="buffering-message text-gray-500 text-sm mt-2">
                                    <div className="loading-spinner" />
                                    <span>Buffering...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        observation.isCombined ? (
                            <div className="relative">
                                <div className="aspect-w-16 aspect-h-9">
                                    {observation.files.map((file, index) => (
                                        <img
                                            key={index}
                                            src={URL.createObjectURL(file)}
                                            alt={`Combined image ${index + 1}`}
                                            className={`object-cover w-full h-full rounded-lg ${
                                                index === currentSlide ? 'block' : 'hidden'
                                            }`}
                                        />
                                    ))}
                                </div>
                                
                                {observation.files.length > 1 && (
                                    <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                                        {observation.files.map((_, index) => (
                                            <button
                                                key={index}
                                                className={`w-2 h-2 rounded-full ${
                                                    index === currentSlide ? 'bg-blue-500' : 'bg-gray-300'
                                                }`}
                                                onClick={() => setCurrentSlide(index)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <img
                                src={URL.createObjectURL(observation.file)}
                                alt="Observation"
                                className="object-cover w-full h-full rounded-lg"
                            />
                        )
                    )
                )}
            </div>

            <div className="form-container">
                <div className="form-group space-y-4">
                    <div className="relative">
                        <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
                            <FontAwesomeIcon icon={faDna} className="text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                name="scientific_name"
                                placeholder="Nama Spesies"
                                className="w-full focus:outline-none text-gray-700"
                                value={formData.displayName || formData.scientific_name}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                            />
                            <span className="text-red-500 text-sm">*</span>
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <div 
                                ref={suggestionsRef}
                                className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                                onScroll={handleSuggestionsScroll}
                            >
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        <div className="font-medium truncate">
                                            <i>{extractScientificName(suggestion.common_name || suggestion.species || suggestion.scientific_name)}</i>
                                        </div>
                                        <div className="text-sm text-gray-600 truncate">
                                            {suggestion.family} › {suggestion.species}
                                        </div>
                                    </div>
                                ))}
                                {isLoadingMore && (
                                    <div className="p-2 text-center text-gray-500">
                                        <div className="loading-spinner inline-block mr-2" />
                                        Memuat...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {formData.kingdom && (
                        <div className="mt-2 text-sm text-gray-600">
                            <div className="grid grid-cols-2 gap-2">
                                <div>Kingdom: {formData.kingdom}</div>
                                <div>Phylum: {formData.phylum}</div>
                                <div>Class: {formData.class}</div>
                                <div>Order: {formData.order}</div>
                                <div>Family: {formData.family}</div>
                                <div>Genus: {formData.genus}</div>
                                <div>Species: {extractScientificName(formData.species)} ({formData.common_name})</div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
                        <FontAwesomeIcon icon={faCalendar} className="text-gray-500 w-5 h-5" />
                        <input
                            type="date"
                            name="date"
                            className="w-full focus:outline-none text-gray-700"
                            value={formData.date}
                            onChange={handleInputChange}
                        />
                        <span className="text-red-500 text-sm">*</span>
                    </div>

                    <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
                        <FontAwesomeIcon icon={faLocationDot} className="text-gray-500 w-5 h-5" />
                        <button
                            onClick={handleOpenLocationModal}
                            className="w-full text-left text-gray-700"
                        >
                            {formData.locationName || formData.latitude && formData.longitude ? (
                                <div>
                                    <div className="text-gray-700">
                                        {formData.locationName || `${formData.latitude}, ${formData.longitude}`}
                                    </div>
                                    {formData.latitude && formData.longitude && (
                                        <div className="text-xs text-gray-500">
                                            {`${formatCoordinate(formData.latitude)}, ${formatCoordinate(formData.longitude)}`}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <span className="text-gray-400">Pilih lokasi</span>
                            )}
                        </button>
                        <span className="text-red-500 text-sm">*</span>
                    </div>

                    <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
                        <FontAwesomeIcon icon={faTree} className="text-gray-500 w-5 h-5" />
                        <input
                            type="text"
                            name="habitat"
                            placeholder="Habitat"
                            className="w-full focus:outline-none text-gray-700"
                            value={formData.habitat}
                            onChange={handleInputChange}
                        />
                        <span className="text-red-500 text-sm">*</span>
                    </div>

                    <div className="flex space-x-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
                        <FontAwesomeIcon icon={faNoteSticky} className="text-gray-500 w-5 h-5 mt-1" />
                        <textarea
                            name="description"
                            placeholder="Keterangan"
                            rows="3"
                            className="w-full focus:outline-none text-gray-700 resize-none"
                            value={formData.description}
                            onChange={handleInputChange}
                        />
                    </div>

                    {observation.type === 'audio' && (
                        <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
                            <FontAwesomeIcon icon={faMusic} className="text-gray-500 w-5 h-5" />
                            <select
                                name="type_sound"
                                className="w-full focus:outline-none text-gray-700 bg-transparent"
                                value={formData.type_sound}
                                onChange={handleInputChange}
                            >
                                <option value="">Pilih tipe suara</option>
                                <option value="song">Song</option>
                                <option value="call">Call</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="mt-4 text-xs text-gray-500">
                    <span className="text-red-500">*</span> Wajib diisi
                </div>

                <div className="action-buttons">
                    <button
                        onClick={onDelete}
                        className="delete-button"
                    >
                        Hapus
                    </button>
                </div>
            </div>

            <input 
                type="hidden" 
                name="upload_session_id" 
                value={uploadSessionId} 
            />

            <Modal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            >
                <LocationPicker 
                    onSave={handleLocationSave} 
                    onClose={() => setIsLocationModalOpen(false)}
                    initialPosition={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                    initialLocationName={formData.locationName}
                />
            </Modal>
        </div>
    );
}

const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

MediaCard.propTypes = {
    uploadSessionId: PropTypes.string.isRequired
};

export default MediaCard;