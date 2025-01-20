import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faDna, 
    faTree, 
    faNoteSticky, 
    faMusic, 
    faXmark, 
    faInfoCircle,
    faLocationDot,
    faCalendar
} from '@fortawesome/free-solid-svg-icons';
import Modal from './Observations/LPModal';
import LocationPicker from './Observations/LocationPicker';

function BulkEditModal({ isOpen, onClose, onSave, selectedItems }) {
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [tempFormData, setTempFormData] = useState({
        scientific_name: '',
        habitat: '',
        description: '',
        type_sound: '',
        source: 'live',
        status: 'pristine',
        latitude: '',
        longitude: '',
        locationName: '',
        date: ''
    });

    // Tambahkan state baru
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const suggestionsRef = useRef(null);

    // Tambahkan state yang diperlukan
    const [hasMore, setHasMore] = useState(true);
    const [errors, setErrors] = useState({});
    const [showTooltip, setShowTooltip] = useState('');

    // Tambahkan useRef untuk menyimpan timeout dan controller
    const timeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    const tooltipContent = {
        scientific_name: "Nama ilmiah spesies (contoh: Gallus gallus). Wajib diisi dengan benar untuk identifikasi spesies.",
        habitat: "Lingkungan tempat spesies ditemukan (contoh: Hutan Primer, Kebun).",
        description: "Catatan tambahan tentang pengamatan.",
        type_sound: "Jenis suara yang direkam (khusus untuk file audio)."
    };

    // Cek apakah ada file audio yang dipilih
    const hasAudioFiles = selectedItems.some(item => item.type === 'audio');
    const hasImageFiles = selectedItems.some(item => item.type === 'image');

    // Animasi untuk modal
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Modifikasi fetchSuggestions untuk menggunakan AbortController
    const fetchSuggestions = async (searchTerm, pageNum = 1) => {
        if (searchTerm.length > 2) {
            try {
                setIsLoadingMore(true);
                
                // Batalkan request sebelumnya jika ada
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                }
                
                // Buat controller baru
                abortControllerRef.current = new AbortController();
                
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/taxonomy/search?q=${encodeURIComponent(searchTerm)}&page=${pageNum}`,
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
                    if (pageNum === 1) {
                        setSuggestions(data.data.slice(0, 5));
                        setShowSuggestions(true);
                        setHasMore(data.data.length >= 5);
                    } else {
                        setSuggestions(prev => [...prev, ...data.data.slice(0, 5)]);
                        setHasMore(data.data.length >= 5);
                    }
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
            } finally {
                setIsLoadingMore(false);
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
            setHasMore(false);
        }
    };

    // Modifikasi handleChange
    const handleChange = async (e) => {
        const { name, value } = e.target;
        
        if (name === 'scientific_name') {
            // Selalu update nilai input terlebih dahulu
            setTempFormData(prev => ({
                ...prev,
                [name]: value,
                displayName: value
            }));

            // Jika input kosong, reset semua field
            if (!value) {
                setTempFormData(prev => ({
                    ...prev,
                    scientific_name: '',
                    species: '',
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

            // Debounce fetch suggestions
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setPage(1);
                fetchSuggestions(value, 1);
            }, 300); // Tunggu 300ms sebelum melakukan fetch
        } else {
            setTempFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    // Fungsi untuk memuat lebih banyak saran
    const loadMoreSuggestions = async () => {
        if (!hasMore || isLoadingMore) return;

        const nextPage = page + 1;
        await fetchSuggestions(tempFormData.scientific_name, nextPage);
        setPage(nextPage);
    };

    // Modifikasi handleSuggestionsScroll
    const handleSuggestionsScroll = (e) => {
        const element = e.target;
        if (element.scrollHeight - element.scrollTop === element.clientHeight) {
            loadMoreSuggestions();
        }
    };

    // Modifikasi handleSuggestionClick
    const handleSuggestionClick = (suggestion) => {
        const updatedData = {
            ...tempFormData,
            scientific_name: suggestion.scientific_name,
            common_name: suggestion.common_name,
            species: suggestion.species || '',
            kingdom: suggestion.kingdom || '',
            phylum: suggestion.phylum || '',
            class: suggestion.class || '',
            order: suggestion.order || '',
            family: suggestion.family || '',
            genus: suggestion.genus || '',
            taxon_rank: suggestion.taxon_rank || '',
            displayName: extractScientificName(suggestion.common_name || suggestion.species || suggestion.scientific_name)
        };
        
        setTempFormData(updatedData);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // Tambahkan useEffect untuk menutup suggestions ketika klik di luar
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset form ketika modal ditutup
    useEffect(() => {
        if (!isOpen) {
            setTempFormData({
                scientific_name: '',
                habitat: '',
                description: '',
                type_sound: '',
                source: 'live',
                status: 'pristine',
                latitude: '',
                longitude: '',
                locationName: '',
                date: ''
            });
        }
    }, [isOpen]);

    // Cleanup pada unmount
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

    // Tambahkan useEffect untuk mengambil data lokasi dari item yang dipilih
    useEffect(() => {
        if (isOpen && selectedItems.length > 0) {
            const firstItem = selectedItems[0];
            setTempFormData(prev => ({
                ...prev,
                latitude: firstItem.latitude || '',
                longitude: firstItem.longitude || '',
                locationName: firstItem.locationName || '',
                date: firstItem.date || '',
                scientific_name: firstItem.scientific_name || '',
                species: firstItem.species || '',
                common_name: firstItem.common_name || '',
                kingdom: firstItem.kingdom || '',
                phylum: firstItem.phylum || '',
                class: firstItem.class || '',
                order: firstItem.order || '',
                family: firstItem.family || '',
                genus: firstItem.genus || '',
                taxon_rank: firstItem.taxon_rank || '',
                displayName: firstItem.displayName || firstItem.common_name || firstItem.species || firstItem.scientific_name || '',
                habitat: firstItem.habitat || '',
                description: firstItem.description || '',
                type_sound: firstItem.type_sound || '',
                is_combined: firstItem.isCombined || false,
                files: firstItem.files || [firstItem.file]
            }));
        }
    }, [isOpen, selectedItems]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!tempFormData.scientific_name.trim()) {
            newErrors.scientific_name = "Nama spesies wajib diisi";
        }

        if (!tempFormData.date) {
            newErrors.date = "Tanggal wajib diisi";
        }

        if (!tempFormData.locationName) {
            newErrors.location = "Lokasi wajib diisi";
        }

        if (hasAudioFiles && !tempFormData.type_sound) {
            newErrors.type_sound = "Tipe suara wajib dipilih untuk file audio";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validateForm()) {
            // Pastikan data lokasi termasuk dalam data yang disimpan
            const dataToSave = {
                ...tempFormData,
                latitude: tempFormData.latitude,
                longitude: tempFormData.longitude,
                locationName: tempFormData.locationName
            };
            onSave(dataToSave);
            onClose();
        }
    };

    const handleLocationSave = (lat, lng, name) => {
        setTempFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            locationName: name
        }));
        setIsLocationModalOpen(false);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-800 overflow-y-auto mt-10">
            <div 
                className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-2xl transform rounded-xl bg-white shadow-2xl transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                            Isi Form Sekaligus ({selectedItems.length} item)
                        </h3>
                        <button 
                            onClick={onClose}
                            className="rounded-full p-1 hover:bg-gray-100"
                        >
                            <FontAwesomeIcon icon={faXmark} className="h-6 w-6 text-gray-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 space-y-4">
                        {/* Form Fields untuk Semua Tipe */}
                        <div className="space-y-4">
                            {/* Nama Taksa */}
                            <div className="form-group relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Spesies <span className="text-red-500">*</span>
                                    <FontAwesomeIcon 
                                        icon={faInfoCircle} 
                                        className="ml-2 text-gray-400 cursor-help"
                                        onMouseEnter={() => setShowTooltip('scientific_name')}
                                        onMouseLeave={() => setShowTooltip('')}
                                    />
                                </label>
                                {showTooltip === 'scientific_name' && (
                                    <div className="absolute z-50 bg-black text-white p-2 rounded text-sm -mt-1 ml-8">
                                        {tooltipContent.scientific_name}
                                    </div>
                                )}
                                <div className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${
                                    errors.scientific_name ? 'border-red-500' : 'border-gray-200 hover:border-purple-500'
                                }`}>
                                    <FontAwesomeIcon icon={faDna} className="text-gray-400" />
                                    <input
                                        type="text"
                                        name="scientific_name"
                                        className="w-full focus:outline-none"
                                        value={tempFormData.displayName || tempFormData.common_name || tempFormData.species || tempFormData.scientific_name}
                                        onChange={handleChange}
                                        placeholder="Masukkan nama taksa"
                                    />
                                </div>
                                {errors.scientific_name && (
                                    <p className="mt-1 text-sm text-red-500">{errors.scientific_name}</p>
                                )}
                            </div>
                            {showSuggestions && suggestions.length > 0 && (
                            <div 
                                ref={suggestionsRef}
                                className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto"
                                style={{
                                    maxHeight: 'calc(70vh - 400px)',
                                    minHeight: '100px'
                                }}
                                onScroll={handleSuggestionsScroll}
                            >
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        <div className="font-medium truncate">
                                            <i>
                                                {extractScientificName(
                                                    suggestion.common_name || 
                                                    suggestion.species || 
                                                    suggestion.scientific_name
                                                )}
                                            </i>
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


                            {/* Lokasi */}
                            <div className="form-group relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Lokasi <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-purple-500 focus-within:border-purple-500 transition-colors">
                                    <FontAwesomeIcon icon={faLocationDot} className="text-gray-400" />
                                    <button
                                        onClick={() => setIsLocationModalOpen(true)}
                                        className="w-full text-left text-gray-700 hover:text-gray-900"
                                    >
                                        {tempFormData.locationName || 'Pilih lokasi'}
                                    </button>
                                </div>
                            </div>



                            {/* Habitat */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Habitat
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-purple-500 focus-within:border-purple-500 transition-colors">
                                    <FontAwesomeIcon icon={faTree} className="text-gray-400" />
                                    <input
                                        type="text"
                                        name="habitat"
                                        className="w-full focus:outline-none"
                                        value={tempFormData.habitat}
                                        onChange={handleChange}
                                        placeholder="Masukkan habitat"
                                    />
                                </div>
                            </div>

                            {/* Keterangan */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Keterangan
                                </label>
                                <div className="flex space-x-3 rounded-lg border border-gray-200 p-3 hover:border-purple-500 focus-within:border-purple-500 transition-colors">
                                    <FontAwesomeIcon icon={faNoteSticky} className="text-gray-400 mt-1" />
                                    <textarea
                                        name="description"
                                        rows="3"
                                        className="w-full focus:outline-none resize-none"
                                        value={tempFormData.description}
                                        onChange={handleChange}
                                        placeholder="Masukkan keterangan"
                                    />
                                </div>
                            </div>

                            {/* Tanggal */}
                            <div className="form-group">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tanggal <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-purple-500 focus-within:border-purple-500 transition-colors">
                                    <FontAwesomeIcon icon={faCalendar} className="text-gray-400" />
                                    <input
                                        type="date"
                                        name="date"
                                        className="w-full focus:outline-none"
                                        value={tempFormData.date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Form Fields khusus Audio */}
                        {hasAudioFiles && (
                            <div className="space-y-4 border-t pt-4">
                                <h4 className="font-medium text-gray-900">Pengaturan Audio</h4>
                                
                                {/* Tipe Suara */}
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tipe Suara
                                    </label>
                                    <div className="flex items-center space-x-3 rounded-lg border border-gray-200 p-3 hover:border-purple-500 focus-within:border-purple-500 transition-colors">
                                        <FontAwesomeIcon icon={faMusic} className="text-gray-400" />
                                        <select
                                            name="type_sound"
                                            className="w-full focus:outline-none bg-transparent"
                                            value={tempFormData.type_sound}
                                            onChange={handleChange}
                                        >
                                            <option value="">Pilih tipe suara</option>
                                            <option value="song">Song</option>
                                            <option value="call">Call</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Radio Groups */}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t px-6 py-4 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:text-gray-900"
                        >
                            Batal
                        </button>
                        <button
                            onClick={() => handleSave()}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Simpan
                        </button>
                    </div>
                </div>
            </div>

            {/* Tambahkan Modal Lokasi */}
            <Modal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
            >
                <LocationPicker 
                    onSave={handleLocationSave} 
                    onClose={() => setIsLocationModalOpen(false)}
                    initialPosition={tempFormData.latitude && tempFormData.longitude ? [tempFormData.latitude, tempFormData.longitude] : null}
                    initialLocationName={tempFormData.locationName}
                />
            </Modal>

            {tempFormData.is_combined && (
                <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Gambar Gabungan</h4>
                    <div className="grid grid-cols-4 gap-2">
                        {tempFormData.files.map((file, index) => (
                            <div key={index} className="relative">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Combined image ${index + 1}`}
                                    className="w-full h-24 object-cover rounded"
                                />
                                <div className="absolute top-1 right-1 bg-black/50 text-white px-2 rounded-full text-sm">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default BulkEditModal;