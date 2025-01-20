import React, { useState, useRef, useEffect } from 'react';
import ImageGallery from 'react-image-gallery';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faExpand, faCompress, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import 'swiper/css/free-mode';
import 'react-image-gallery/styles/css/image-gallery.css';
import './MediaViewer.css';

function MediaViewer({ checklist }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [error, setError] = useState(null);
    const [userInteracted, setUserInteracted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const audioRef = useRef(null);
    const progressRef = useRef(null);
    const spectrogramRef = useRef(null);
    const swiperRef = useRef(null);
    const galleryRef = useRef(null);

    // Tentukan sumber data berdasarkan format ID
    const source = checklist?.id?.toString().startsWith('BN') ? 'burungnesia' : 
                  checklist?.id?.toString().startsWith('KP') ? 'kupunesia' : 
                  'fobi';

    // Persiapkan array media dari checklist
    const allMedia = [];
    
    // Handle images
    if (checklist?.media?.images?.length > 0) {
        allMedia.push(...checklist.media.images.map(img => ({
            type: 'image',
            url: img.images || img.url || img.file_path,
            thumbnail_url: img.thumbnail_url || img.images || img.url || img.file_path
        })));
    }
    
    // Handle sounds
    if (checklist?.media?.sounds?.length > 0) {
        allMedia.push(...checklist.media.sounds.map(sound => ({
            type: 'audio',
            url: sound.url || sound.file_path,
            spectrogram_url: sound.spectrogram_url || sound.spectrogram
        })));
    }

    const formatTime = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleFullscreen = () => {
        const container = document.querySelector('.media-viewer-container');
        if (!document.fullscreenElement) {
            container?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleAudioPlay = (e) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play()
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        setError('Gagal memutar audio');
                    });
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const time = audioRef.current.currentTime;
            const dur = audioRef.current.duration;
            
            if (isNaN(dur)) return;
            
            setCurrentTime(time);
            
            if (progressRef.current) {
                const progress = (time / dur) * 100;
                progressRef.current.style.transform = `scaleX(${progress / 100})`;
            }
        }
    };

    const handleSpectrogramClick = (e) => {
        e.stopPropagation();
        if (audioRef.current && swiperRef.current?.swiper) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const width = rect.width;
            const clickPosition = x / width;
            
            const newTime = audioRef.current.duration * clickPosition;
            if (!isNaN(newTime)) {
                audioRef.current.currentTime = newTime;
                setUserInteracted(true);
            }
        }
    };

    const handleLoadedMetadata = (e) => {
        if (e.target) {
            setDuration(e.target.duration);
        }
    };

    // Auto-scroll effect untuk spectrogram
    useEffect(() => {
        if (isPlaying && !userInteracted && swiperRef.current?.swiper) {
            const updateSpectrogramScroll = () => {
                const swiper = swiperRef.current.swiper;
                if (!swiper) return;

                const spectrogramWidth = swiper.virtualSize - swiper.size;
                const progress = currentTime / duration;
                const newTranslate = -spectrogramWidth * progress;

                requestAnimationFrame(() => {
                    swiper.setTranslate(newTranslate);
                    swiper.updateProgress();
                });
            };

            const intervalId = setInterval(updateSpectrogramScroll, 50);
            return () => clearInterval(intervalId);
        }
    }, [isPlaying, currentTime, duration, userInteracted]);

    const items = allMedia.map(media => ({
        original: media.url,
        thumbnail: media.type === 'audio' ? 
            (media.spectrogram_url || '/path/to/default-spectrogram.png') : 
            media.thumbnail_url || media.url,
        thumbnailClass: media.type === 'audio' ? 'audio-thumbnail' : 'image-thumbnail',
        renderItem: () => {
            if (media.type === 'audio') {
                return (
                    <div className="audio-player-container" onClick={(e) => e.stopPropagation()}>
                        <div className="audio-controls">
                            <button onClick={handleAudioPlay} className="play-button">
                                <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
                            </button>
                            <div className="audio-progress">
                                <div className="time-display">
                                    {formatTime(currentTime)} / {formatTime(duration)}
                                </div>
                                <div className="progress-bar" onClick={handleSpectrogramClick}>
                                    <div className="progress-bar-fill" ref={progressRef} />
                                </div>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFullscreen();
                                }} 
                                className="fullscreen-button"
                            >
                                <FontAwesomeIcon icon={isFullscreen ? faCompress : faExpand} />
                            </button>
                        </div>

                        <audio
                            ref={audioRef}
                            src={media.url}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={() => {
                                setIsPlaying(false);
                                setUserInteracted(false);
                            }}
                        />

                        <div className="spectrogram-container" ref={spectrogramRef}>
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
                                onTouchStart={() => setUserInteracted(true)}
                            >
                                <SwiperSlide>
                                    <div className="spectrogram-content">
                                        <div className="frequency-labels">
                                            <span>20 kHz</span>
                                            <span>15 kHz</span>
                                            <span>10 kHz</span>
                                            <span>5 kHz</span>
                                            <span>0 kHz</span>
                                        </div>
                                        <img
                                            src={media.spectrogram_url}
                                            alt="Audio spectrogram"
                                            className="spectrogram-image cursor-pointer"
                                            onClick={handleSpectrogramClick}
                                        />
                                    </div>
                                </SwiperSlide>
                            </Swiper>
                        </div>
                    </div>
                );
            } else {
                return (
                    <div className="image-container">
                        <img
                            src={media.url}
                            alt="Observation"
                            className="gallery-image"
                        />
                        <div className="license-overlay">
                            {source === 'burungnesia' ? 'BN' : 
                             source === 'kupunesia' ? 'KP' : 'CC BY-NC'}
                        </div>
                    </div>
                );
            }
        }
    }));

    return (
        <div className="media-viewer-container">
            {allMedia.length > 0 ? (
                <ImageGallery
                    ref={galleryRef}
                    items={items}
                    showPlayButton={false}
                    showFullscreenButton={true}
                    showNav={items.length > 1}
                    showThumbnails={items.length > 1}
                    showBullets={items.length > 1}
                    additionalClass="custom-image-gallery"
                    startIndex={currentIndex}
                    onSlide={(index) => {
                        setCurrentIndex(index);
                        if (isPlaying) {
                            setIsPlaying(false);
                            audioRef.current?.pause();
                            setUserInteracted(false);
                        }
                    }}
                />
            ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                    <p className="text-gray-500">Tidak ada media tersedia</p>
                </div>
            )}
        </div>
    );
}

export default MediaViewer;