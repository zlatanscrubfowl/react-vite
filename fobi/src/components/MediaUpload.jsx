import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import LocationPicker from './Observations/LocationPicker';
import Modal from './Observations/LPModal';
import LocationInput from './Observations/LocationInput';
import MediaCard from './MediaCard';
import BulkEditModal from './BulkEditModal';
import Header from './Header';
import { apiFetch } from '../utils/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faPencil, faUpload, faObjectGroup, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import exifr from 'exifr';
import { v4 as uuidv4 } from 'uuid';

function MediaUpload() {
    const [observations, setObservations] = useState([]);
    const [selectedCards, setSelectedCards] = useState([]);
    const [locationName, setLocationName] = useState('');
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        tujuan_pengamatan: 1,
        observer: '',
        scientific_name: '',
        date: '',
        latitude: '',
        longitude: '',
        locationName: '',
        habitat: '',
        description: '',
        type_sound: '',
        kingdom: '',
        phylum: '',
        class: '',
        order: '',
        family: '',
        genus: '',
        species: '',
        common_name: '',
        taxon_rank: ''
    });
    const [bulkFormData, setBulkFormData] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [qualityAssessments, setQualityAssessments] = useState({});
    const [showQualityModal, setShowQualityModal] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadSessionId, setUploadSessionId] = useState(null);
    const [isSelectAll, setIsSelectAll] = useState(false);
    const [combinedObservations, setCombinedObservations] = useState([]);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    const { user, setUser, updateTotalObservations } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('jwt_token');
        const storedUser = {
            id: localStorage.getItem('user_id'),
            uname: localStorage.getItem('username'),
            totalObservations: localStorage.getItem('totalObservations'),
        };

        if (!token || !storedUser.id) {
            navigate('/login', { replace: true });
            return;
        }

        if (!user) {
            setUser(storedUser);
        }
    }, []);

    useEffect(() => {
        const initializeUploadSession = async () => {
            try {
                const response = await apiFetch('/generate-upload-session', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUploadSessionId(data.upload_session_id);
                    localStorage.setItem('currentUploadSession', data.upload_session_id);
                }
            } catch (error) {
                console.error('Error initializing upload session:', error);
                setError('Gagal membuat sesi upload');
            }
        };

        // Cek session yang ada atau buat baru
        const savedSession = localStorage.getItem('currentUploadSession');
        if (savedSession) {
            setUploadSessionId(savedSession);
        } else {
            initializeUploadSession();
        }

        return () => {
            localStorage.removeItem('currentUploadSession');
        };
    }, []);

    const extractExifData = async (file) => {
        try {
            if (file.type.startsWith('image/')) {
                // Gunakan opsi yang lebih spesifik untuk GPS
                const exifData = await exifr.parse(file, {
                    pick: [
                        'DateTimeOriginal',
                        'GPSLatitude',
                        'GPSLongitude',
                        'GPSLatitudeRef',
                        'GPSLongitudeRef',
                        'Make',
                        'Model',
                        'Software'
                    ],
                    gps: true // Aktifkan parsing GPS
                });

                // Validasi data GPS
                const hasValidGPS = exifData?.latitude && exifData?.longitude &&
                                  !isNaN(exifData.latitude) && !isNaN(exifData.longitude);

                let locationName = '';
                if (hasValidGPS) {
                    try {
                        // Gunakan Nominatim untuk reverse geocoding
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${exifData.latitude}&lon=${exifData.longitude}&format=json`,
                            {
                                headers: {
                    'Accept-Language': 'id'
                                }
                            }
                        );
                        const data = await response.json();
        
        // Format location name consistently
        const address = data.address;
        const parts = [];
        
        if (address.city || address.town || address.municipality) {
            parts.push(address.city || address.town || address.municipality);
                    }
        if (address.county || address.regency) {
            parts.push(address.county || address.regency);
                }
        if (address.state) parts.push(address.state);
        if (address.country) parts.push(address.country);

        locationName = parts.join(', ') || 'Lokasi tidak ditemukan';
    } catch (error) {
        console.warn('Error fetching location name:', error);
        locationName = `${exifData.latitude}, ${exifData.longitude}`;
    }
}
                // Validasi tanggal
                let formattedDate = '';
                if (exifData?.DateTimeOriginal) {
                    const date = new Date(exifData.DateTimeOriginal);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toISOString().split('T')[0];
                    }
                }

                return {
                    date: formattedDate,
                    latitude: hasValidGPS ? exifData.latitude : '',
                    longitude: hasValidGPS ? exifData.longitude : '',
                    locationName: locationName,
                    deviceInfo: {
                        make: exifData?.Make || '',
                        model: exifData?.Model || '',
                        software: exifData?.Software || ''
                    }
                };
            }
            return null;
        } catch (error) {
            console.warn('Error extracting EXIF data:', error);
            return null;
        }
    };

    const handleFiles = async (files) => {
        setLoading(true);
        setProgress(0);
        setLoadingMessage('Memproses file...');

        try {
            const newObservations = [];
            let processedFiles = 0;
            const totalFiles = Array.from(files).length;

            // Tambahkan delay kecil untuk memastikan state progress terupdate
            await new Promise(resolve => setTimeout(resolve, 100));

            for (const file of Array.from(files)) {
                const isImage = file.type.startsWith('image/');
                const isAudio = file.type.startsWith('audio/');

                if (isImage || isAudio) {
                    const exifData = await extractExifData(file);

                    const observation = {
                        id: uuidv4(),
                        file,
                        type: isImage ? 'image' : 'audio',
                        scientific_name: '',
                        date: exifData?.date || '',
                        latitude: exifData?.latitude || '',
                        longitude: exifData?.longitude || '',
                        locationName: exifData?.locationName || '',
                        habitat: '',
                        description: '',
                        type_sound: '',
                        kingdom: '',
                        phylum: '',
                        class: '',
                        order: '',
                        family: '',
                        genus: '',
                        species: '',
                        common_name: '',
                        taxon_rank: '',
                        deviceInfo: exifData?.deviceInfo || {},
                        spectrogramUrl: null
                    };

                    if (isAudio) {
                        const formData = new FormData();
                        formData.append('media', file);

                        try {
                            const response = await apiFetch('/observations/generate-spectrogram', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                                },
                                body: formData
                            });

                            if (response.ok) {
                                const data = await response.json();
                                observation.spectrogramUrl = data.spectrogramUrl;
                            }
                        } catch (error) {
                            console.error('Error generating spectrogram:', error);
                        }
                    }

                    newObservations.push(observation);
                }

                processedFiles++;
                const currentProgress = (processedFiles / totalFiles) * 100;
                setProgress(currentProgress);
                setLoadingMessage(`Memproses file ${processedFiles} dari ${totalFiles}...`);

                // Tambahkan delay kecil antara setiap file
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            setProgress(100);
            setLoadingMessage('Selesai memproses file!');

            setObservations(prev => {
                const updatedObservations = [...prev, ...newObservations];
                const exifCount = newObservations.filter(obs => obs.date || obs.latitude).length;
                if (exifCount > 0) {
                    setTimeout(() => {
                        toast.info(`Berhasil mengekstrak metadata dari ${exifCount} file`, {
                            toastId: 'exif-success',
                        });
                    }, 0);
                }
                return updatedObservations;
            });

        } catch (error) {
            setError('Gagal memproses file');
            console.error(error);
            toast.error('Gagal memproses file', {
                toastId: 'process-error',
            });
        } finally {
            // Tambahkan delay sebelum menutup loading
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
                setLoadingMessage('');
            }, 500);
        }
    };

    const handleLocationSave = async (lat, lng, name) => {
        // Jika nama lokasi tidak diberikan, coba dapatkan dari reverse geocoding
        let locationName = name;
        if (!locationName) {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                    {
                        headers: {
                            'Accept-Language': 'id'
                        }
                    }
                );
                const data = await response.json();
                locationName = data.display_name;
            } catch (error) {
                console.warn('Error fetching location name:', error);
                locationName = `${lat}, ${lng}`;
            }
        }

        setObservations(prev =>
            prev.map(obs =>
                selectedCards.includes(obs.id)
                    ? { ...obs, latitude: lat, longitude: lng, locationName: locationName }
                    : obs
            )
        );
        setLocationName(locationName);
        setIsLocationModalOpen(false);
    };

    const handleBulkEdit = (data) => {
        setBulkFormData(data);
        setObservations(prev =>
            prev.map(obs =>
                selectedCards.includes(obs.id)
                    ? {
                        ...obs,
                        ...data,
                        displayName: data.species || data.scientific_name,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        locationName: data.locationName
                    }
                    : obs
            )
        );
        setIsBulkEditOpen(false);
    };

    const handleCardSelect = (id) => {
        setSelectedCards(prev => {
            const newSelection = prev.includes(id)
                ? prev.filter(cardId => cardId !== id)
                : [...prev, id];

            // Update isSelectAll
            setIsSelectAll(newSelection.length === observations.length);

            // Jika card dipilih dan belum ada bulk form data, set dari card yang dipilih
            if (!prev.includes(id) && newSelection.length === 1) {
                const selectedObs = observations.find(obs => obs.id === id);
                if (selectedObs) {
                    setBulkFormData({
                        scientific_name: selectedObs.scientific_name || '',
                        species: selectedObs.species || '',
                        kingdom: selectedObs.kingdom || '',
                        phylum: selectedObs.phylum || '',
                        class: selectedObs.class || '',
                        order: selectedObs.order || '',
                        family: selectedObs.family || '',
                        genus: selectedObs.genus || '',
                        taxon_rank: selectedObs.taxon_rank || '',
                        displayName: selectedObs.displayName || selectedObs.species || selectedObs.scientific_name || '',
                        habitat: selectedObs.habitat || '',
                        description: selectedObs.description || '',
                        type_sound: selectedObs.type_sound || ''
                    });
                }
            }

            return newSelection;
        });
    };

    const handleObservationUpdate = (id, data) => {
        setObservations(prev =>
            prev.map(obs =>
                obs.id === id ? { ...obs, ...data } : obs
            )
        );
    };

    const handleObservationDelete = (id) => {
        setObservations(prev => prev.filter(obs => obs.id !== id));
        setSelectedCards(prev => prev.filter(cardId => cardId !== id));
    };

    const handleConfirmSubmit = () => {
        setIsConfirmModalOpen(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setLoadingMessage('Mengunggah observasi...');

        try {
            for (const observation of observations) {
                const formData = new FormData();

                // Tambahkan data dasar
                formData.append('upload_session_id', uploadSessionId);

                // Handle file tunggal atau kombinasi
                if (observation.isCombined) {
                    // Untuk observasi yang digabungkan
                    observation.files.forEach((file, index) => {
                        formData.append('media[]', file);
                    });
                    formData.append('is_combined', 'true');

                    // Tambahkan informasi tipe untuk setiap file
                    const mediaTypes = observation.files.map(file => {
                        return file.type.startsWith('audio/') ? 'audio' : 'photo';
                    });
                    formData.append('media_types', JSON.stringify(mediaTypes));

                    // Tambahkan spectrogram URLs jika ada
                    if (observation.spectrogramUrls && observation.spectrogramUrls.length > 0) {
                        formData.append('spectrogram_urls', JSON.stringify(observation.spectrogramUrls));
                    }
                } else {
                    // Untuk observasi tunggal
                    formData.append('media', observation.file);
                    formData.append('is_combined', 'false');
                    formData.append('type', observation.type === 'audio' ? 'audio' : 'photo');
                    if (observation.type === 'audio' && observation.spectrogramUrl) {
                        formData.append('spectrogram_url', observation.spectrogramUrl);
                    }
                }

                // Tambahkan data EXIF
                if (observation.date) formData.append('date', observation.date);
                if (observation.latitude && observation.longitude) {
                    formData.append('latitude', observation.latitude);
                    formData.append('longitude', observation.longitude);
                }
                if (observation.deviceInfo) {
                    formData.append('device_info', JSON.stringify(observation.deviceInfo));
                }

                // Tambahkan data taksonomi dan deskriptif
                formData.append('scientific_name', observation.scientific_name || '');
                formData.append('class', observation.class || '');
                formData.append('order', observation.order || '');
                formData.append('family', observation.family || '');
                formData.append('genus', observation.genus || '');
                formData.append('species', observation.species || '');
                formData.append('description', observation.description || '');
                formData.append('habitat', observation.habitat || '');
                formData.append('type_sound', observation.type_sound || '');
                formData.append('locationName', observation.locationName || '');

                // Log untuk debugging
                console.log('Submitting observation:', {
                    isCombined: observation.isCombined,
                    filesCount: observation.isCombined ? observation.files.length : 1,
                    type: observation.type,
                    scientific_name: observation.scientific_name,
                    hasSpectrogram: !!observation.spectrogramUrl || observation.spectrogramUrls?.length > 0
                });

                const response = await apiFetch('/observations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Gagal mengunggah observasi');
                }

                const responseData = await response.json();
                console.log('Upload success:', responseData);
            }

            toast.success('Berhasil mengunggah semua observasi');
            setShowSuccessPopup(true);

            // Update total observasi
            if (user && user.id) {
                await updateTotalObservations();
            }

        } catch (error) {
            console.error('Error submitting observations:', error);
            toast.error(error.message || 'Gagal mengunggah observasi');
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };
    const fetchTaxonomyInfo = async (scientificName) => {
        try {
            setIsLoading(true);
            const response = await apiFetch(`/taxonomy?scientific_name=${encodeURIComponent(scientificName)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Gagal mendapatkan informasi taksonomi');
            }

            const data = await response.json();

            if (data.success) {
                setFormData(prev => ({
                    ...prev,
                    ...data.data
                }));
            }
        } catch (error) {
            console.error('Error fetching taxonomy:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const QualityAssessmentModal = ({ isOpen, onClose, assessments }) => {
        if (!isOpen) return null;

        const getGradeColor = (grade) => {
            switch (grade.toLowerCase()) {
                case 'research grade':
                    return 'bg-green-100 text-green-800';
                case 'needs id':
                    return 'bg-yellow-100 text-yellow-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        };

        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-4">Hasil Penilaian Kualitas</h2>

                    {Object.entries(assessments).map(([obsId, assessment]) => (
                        <div key={obsId} className="mb-4 p-4 border rounded">
                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2 ${getGradeColor(assessment.grade)}`}>
                                {assessment.grade}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center">
                                    <span className={assessment.has_date ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_date ? '✓' : '✗'} Tanggal
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.has_location ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_location ? '✓' : '✗'} Lokasi
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.has_media ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.has_media ? '✓' : '✗'} Media
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.is_wild ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.is_wild ? '✓' : '✗'} Liar
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.location_accurate ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.location_accurate ? '✓' : '✗'} Lokasi Akurat
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className={assessment.recent_evidence ? 'text-green-500' : 'text-red-500'}>
                                        {assessment.recent_evidence ? '✓' : '✗'} Bukti Terbaru
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const handleSelectAll = () => {
        if (isSelectAll) {
            setSelectedCards([]);
        } else {
            setSelectedCards(observations.map(obs => obs.id));
        }
        setIsSelectAll(!isSelectAll);
    };

    const handleDeleteAll = () => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedCards.length} item yang dipilih?`)) {
            setObservations(prev => prev.filter(obs => !selectedCards.includes(obs.id)));
            setSelectedCards([]);
            setIsSelectAll(false);
        }
    };

    const handleCombine = () => {
        if (selectedCards.length < 2) {
            toast.error('Pilih minimal 2 observasi untuk digabungkan');
            return;
        }

        // Ambil observasi yang dipilih
        const selectedObs = observations.filter(obs => selectedCards.includes(obs.id));

        // Hitung jumlah audio dan gambar
        const audioCount = selectedObs.filter(obs => obs.type === 'audio').length;
        const imageCount = selectedObs.filter(obs => obs.type === 'image').length;

        // Validasi kombinasi yang diizinkan
        if (audioCount === 0 && imageCount === 0) {
            toast.error('Tidak ada media yang valid untuk digabungkan');
            return;
        }

        // Gunakan data dari observasi pertama
        const firstObs = selectedObs[0];
        const combinedObs = {
            ...firstObs,
            id: uuidv4(),
            files: [], // Akan diisi dengan file-file yang digabung
            isCombined: true,
            combinedOrder: selectedObs.map((_, index) => index),
            type: 'mixed', // Tipe baru untuk kombinasi audio dan gambar
            audioFiles: [], // Khusus untuk file audio
            imageFiles: [], // Khusus untuk file gambar
            spectrogramUrls: [] // Untuk spectrogram dari file audio
        };

        // Pisahkan file berdasarkan tipenya
        selectedObs.forEach(obs => {
            if (obs.type === 'audio') {
                combinedObs.audioFiles.push(obs.file);
                if (obs.spectrogramUrl) {
                    combinedObs.spectrogramUrls.push(obs.spectrogramUrl);
                }
            } else if (obs.type === 'image') {
                combinedObs.imageFiles.push(obs.file);
            }
        });

        // Gabungkan semua file ke array files untuk kompatibilitas
        combinedObs.files = [...combinedObs.audioFiles, ...combinedObs.imageFiles];

        // Hapus observasi yang digabungkan
        setObservations(prev => prev.filter(obs => !selectedCards.includes(obs.id)));

        // Tambahkan observasi gabungan
        setObservations(prev => [...prev, combinedObs]);

        setSelectedCards([]);
        setIsSelectAll(false);

        toast.success(
            `Berhasil menggabungkan ${audioCount} audio dan ${imageCount} gambar`,
            {
                position: "top-right",
                autoClose: 3000,
                theme: "colored"
            }
        );
    };

    useEffect(() => {
        if (error) {
            toast.error(error, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "colored",
                style: {
                    backgroundColor: '#EF4444', // Warna merah yang sama dengan yang sebelumnya
                    fontSize: '14px',
                }
            });
        }
    }, [error]);

    const SuccessPopup = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <div className="text-center">
                    <div className="mb-4">
                        <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="text-green-500 text-4xl"
                        />
                    </div>
                    <h3 className="text-lg font-medium mb-4">Data Berhasil Diunggah!</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                setShowSuccessPopup(false);
                                window.location.reload();
                            }}
                            className="w-full py-2 px-4 bg-[#679995] text-white rounded-lg hover:bg-[#5a8884] transition-colors"
                        >
                            Upload Lagi
                        </button>
                        <button
                            onClick={() => {
                                if (user && user.id) {
                                    window.location.href = `/profile/${user.id}/observasi`;
                                }
                            }}
                            className="w-full py-2 px-4 border border-[#679995] text-[#679995] rounded-lg hover:bg-[#679995] hover:text-white transition-colors"
                        >
                            Lihat Observasi Saya
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100">
            <Header userData={{
                uname: localStorage.getItem('username'),
                totalObservations: localStorage.getItem('totalObservations')
            }} />

            <div className="container mx-auto px-4 py-0 mt-2">
                {/* File Drop Zone */}
                <div
                    className="border-2 border-dashed border-gray-300 p-40 text-center rounded-lg mb-4 mt-20"
                    onDrop={(e) => {
                        e.preventDefault();
                        handleFiles(e.dataTransfer.files);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <input
                        type="file"
                        multiple
                        accept="image/*,audio/*"
                        onChange={(e) => handleFiles(e.target.files)}
                        className="hidden"
                        id="fileInput"
                    />
                    <label
                        htmlFor="fileInput"
                        className="cursor-pointer text-blue-600 hover:text-blue-800"
                    >
                        Klik untuk memilih atau seret file ke sini
                    </label>
                </div>

                {/* Bulk Actions Bar */}
                {observations.length > 0 && (
                    <div className="sticky top-0 z-10 bg-transparent border-b mb-4">
                        <div className="container mx-auto px-4 py-2">
                            <div className="flex items-center space-x-3">
                                {/* Selection Controls */}
                                <div className="group relative">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isSelectAll}
                                            onChange={handleSelectAll}
                                            className="w-3.5 h-3.5 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-600 border-b border-blue-500">
                                            Pilih Semua ({observations.length})
                                        </span>
                                    </label>
                                    <div className="invisible group-hover:visible absolute left-0 -bottom-12 w-48 bg-gray-800 text-white text-xs rounded p-2 z-50">
                                        Pilih semua observasi untuk diedit atau dihapus sekaligus
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {selectedCards.length > 0 && (
                                    <div className="group relative">
                                        <button
                                            onClick={() => setIsBulkEditOpen(true)}
                                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faPencil} className="text-xs" />
                                            <span>Edit ({selectedCards.length})</span>
                                        </button>
                                        <div className="invisible group-hover:visible absolute left-0 -bottom-12 w-48 bg-gray-800 text-white text-xs rounded p-2 z-50">
                                            Edit data untuk semua item yang dipilih sekaligus
                                        </div>
                                    </div>
                                )}

                                {isSelectAll && (
                                    <div className="group relative">
                                        <button
                                            onClick={handleDeleteAll}
                                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                            <span>Hapus ({selectedCards.length})</span>
                                        </button>
                                        <div className="invisible group-hover:visible absolute left-0 -bottom-8 w-48 bg-gray-800 text-white text-xs rounded p-2 z-50">
                                            Hapus semua item yang dipilih
                                        </div>
                                    </div>
                                )}

                                {selectedCards.length >= 2 && (
                                    <div className="group relative">
                                        <button
                                            onClick={handleCombine}
                                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faObjectGroup} className="text-xs" />
                                            <span>Gabung ({selectedCards.length})</span>
                                        </button>
                                        <div className="invisible group-hover:visible absolute left-0 -bottom-16 w-48 bg-gray-800 text-white text-xs rounded p-2 z-50">
                                            Gabungkan beberapa media (audio/gambar) menjadi satu observasi
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Media Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {observations.map(obs => (
                        <MediaCard
                            key={obs.id}
                            observation={obs}
                            isSelected={selectedCards.includes(obs.id)}
                            onSelect={() => handleCardSelect(obs.id)}
                            onUpdate={(data) => handleObservationUpdate(obs.id, data)}
                            onDelete={() => handleObservationDelete(obs.id)}
                            bulkFormData={bulkFormData}
                            uploadProgress={uploadProgress[obs.id] || 0}
                            uploadSessionId={uploadSessionId}
                        />
                    ))}
                </div>

                {/* Modals */}
                <Modal
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                >
                    <LocationPicker
                        onSave={handleLocationSave}
                        onClose={() => setIsLocationModalOpen(false)}
                    />
                </Modal>

                <BulkEditModal
                    isOpen={isBulkEditOpen}
                    onClose={() => setIsBulkEditOpen(false)}
                    onSave={handleBulkEdit}
                    selectedItems={selectedCards.map(id => observations.find(obs => obs.id === id))}
                />

                {/* Upload Button */}
                {observations.length > 0 && (
                    <button
                        onClick={handleConfirmSubmit}
                        className="fixed bottom-6 right-6 inline-flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors"
                    >
                        <FontAwesomeIcon icon={faUpload} />
                        <span>Upload {observations.length} Observasi</span>
                    </button>
                )}

                {/* Confirm Modal */}
                {isConfirmModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <h2 className="text-xl font-semibold mb-4">Konfirmasi Upload</h2>
                            <p className="text-gray-600 mb-6">
                                Apakah Anda yakin ingin mengupload {observations.length} observasi ini?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                >
                                    Ya, Upload
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg text-center">
                            <div className="mb-4 text-lg font-medium">{loadingMessage}</div>
                            <div className="w-80 h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                    style={{
                                        width: `${progress}%`,
                                        transition: 'width 0.3s ease-out'
                                    }}
                                />
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                                {Math.round(progress)}%
                            </div>
                        </div>
                    </div>
                )}

                {/* Quality Assessment Modal */}
                <QualityAssessmentModal
                    isOpen={showQualityModal}
                    onClose={() => {
                        setShowQualityModal(false);
                        // Reset form setelah menutup modal
                        setObservations([]);
                        setSelectedCards([]);
                        setFormData({
                            tujuan_pengamatan: 1,
                            observer: '',
                            scientific_name: '',
                            date: '',
                            latitude: '',
                            longitude: '',
                            locationName: '',
                            habitat: '',
                            description: '',
                            type_sound: '',
                            kingdom: '',
                            phylum: '',
                            class: '',
                            order: '',
                            family: '',
                            genus: '',
                            species: '',
                            common_name: '',
                            taxon_rank: ''
                        });
                    }}
                    assessments={qualityAssessments}
                />

                {/* Tambahkan ToastContainer */}
                <ToastContainer
                    position="top-right"
                    autoClose={5000}
                    limit={3}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="colored"
                />

                {/* Info Panel */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h3 className="font-medium text-blue-800 mb-2">Panduan Penggunaan:</h3>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                        <li>Seret atau pilih file foto/audio untuk diunggah</li>
                        <li>Pilih satu atau beberapa file untuk mengedit data sekaligus</li>
                        <li>Pastikan mengisi nama spesies dengan benar (contoh: Gallus gallus)</li>
                        <li>Untuk file audio, pilih tipe suara yang sesuai</li>
                        <li>Lokasi dapat diatur untuk satu atau beberapa file sekaligus</li>
                    </ul>
                </div>

                {showSuccessPopup && <SuccessPopup />}
            </div>
        </div>
    );
}

export default MediaUpload;
