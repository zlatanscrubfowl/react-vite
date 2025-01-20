import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationPicker from './Observations/LocationPicker';
import Modal from './Observations/LPModal';
import LocationInput from './Observations/LocationInput';
import { useUser } from '../context/UserContext';
import Header from './Header';
import { apiFetch } from '../utils/api';
import { toast, ToastContainer } from 'react-toastify';

function KupunesiaUpload() {
    const [faunaName, setFaunaName] = useState('');
    const [faunaId, setFaunaId] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [formData, setFormData] = useState({
        latitude: '',
        longitude: '',
        tujuan_pengamatan: 0,
        observer: '',
        additional_note: '',
        active: 0,
        tgl_pengamatan: '',
        start_time: '',
        end_time: '',
        completed: 0,
        count: '',
        notes: '',
        images: []
    });

    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFileModalOpen, setIsFileModalOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [locationName, setLocationName] = useState('');
    const [butterflyList, setButterflyList] = useState([]);
    const [editIndex, setEditIndex] = useState(null);
    const [selectedButterflyIndex, setSelectedButterflyIndex] = useState(null);

    const { user, setUser, updateTotalObservations } = useUser(); // Tambahkan ini di bagian atas file
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

    const simulateProgress = (duration = 1000, message = 'Memproses...') => {
        setLoading(true);
        setLoadingMessage(message);
        setProgress(0);
        
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 10;
            });
        }, duration / 10);

        return () => clearInterval(interval);
    };

    const handleFaunaNameChange = async (name) => {
        setFaunaName(name);
        setFaunaId('');
        
        if (name.length > 2) {
            setIsSearching(true);
            try {
                const token = localStorage.getItem('jwt_token');
                if (!token || !user) {
                    throw new Error('Silakan login terlebih dahulu');
                }

                    const response = await fetch(`${import.meta.env.VITE_API_URL}/kupunesia/faunas?name=${encodeURIComponent(name)}`, {
                        headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.status === 401) {
                    navigate('/login', { replace: true });
                    return;
                }
                
                if (!response.ok) throw new Error('Gagal mengambil data kupu-kupu');
                
                const data = await response.json();
                if (data.success) {
                    setSuggestions(data.data);
                    setShowSuggestions(true);
                }
            } catch (error) {
                console.error('Error:', error);
                setError(error.message);
                if (error.response?.status === 401) {
                    navigate('/login', { replace: true });
                }
            } finally {
                setIsSearching(false);
            }
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectFauna = (fauna) => {
        setFaunaName(`${fauna.nameId} (${fauna.nameLat})`);
        setFaunaId(parseInt(fauna.id));
        setShowSuggestions(false);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setFormData(prevData => ({
            ...prevData,
            images: [...prevData.images, ...files]
        }));
    };

    const handleRemoveMedia = (type, imgIndex, butterflyIndex) => {
        if (!butterflyList[butterflyIndex] || !butterflyList[butterflyIndex].images) {
            return; // Guard clause untuk mencegah error jika data tidak valid
        }

        setButterflyList(prevList => {
            const newList = [...prevList];
            if (newList[butterflyIndex] && Array.isArray(newList[butterflyIndex].images)) {
                const butterfly = {...newList[butterflyIndex]};
                butterfly.images = butterfly.images.filter((_, i) => i !== imgIndex);
                newList[butterflyIndex] = butterfly;
            }
            return newList;
        });
    };

    const handleLocationSave = (lat, lng, name) => {
        setFormData(prevFormData => ({
            ...prevFormData,
            latitude: lat,
            longitude: lng
        }));
        setLocationName(name);
        setIsLocationModalOpen(false);
    };
    const handleAddButterfly = () => {
        if (!faunaId || !formData.count) {
            setError('Silakan lengkapi data kupu-kupu');
            return;
        }

        const newButterfly = {
            faunaId: parseInt(faunaId),
            faunaName,
            count: formData.count,
            notes: formData.notes,
            images: formData.images || [] // Pastikan images selalu array
        };

        if (editIndex !== null) {
            setButterflyList(prevList => {
                const newList = [...prevList];
                newList[editIndex] = newButterfly;
                return newList;
            });
            setEditIndex(null);
        } else {
            setButterflyList(prevList => [...prevList, newButterfly]);
        }

        // Reset form
        setFaunaName('');
        setFaunaId('');
        setFormData(prevData => ({
            ...prevData,
            count: '',
            notes: '',
            images: []
        }));
        setIsModalOpen(false);
    };

    const handleEditButterfly = (index) => {
        const butterfly = butterflyList[index];
        setFaunaName(butterfly.faunaName);
        setFaunaId(butterfly.faunaId);
        setFormData(prevData => ({
            ...prevData,
            count: butterfly.count,
            notes: butterfly.notes,
            images: butterfly.images
        }));
        setEditIndex(index);
        setIsModalOpen(true);
    };

    const handleDeleteButterfly = (index) => {
        setButterflyList(prevList => prevList.filter((_, i) => i !== index));
    };

    const handleFileModalOpen = (index) => {
        setSelectedButterflyIndex(index);
        setIsFileModalOpen(true);
    };
    
    const handleFileModalClose = () => {
        setIsFileModalOpen(false);
        setSelectedButterflyIndex(null);
        setFormData(prev => ({
            ...prev,
            images: []
        }));
    };
    
    const handleFileSave = () => {
        if (selectedButterflyIndex !== null) {
            setButterflyList(prevList => {
                const newList = [...prevList];
                newList[selectedButterflyIndex] = {
                    ...newList[selectedButterflyIndex],
                    images: [
                        ...newList[selectedButterflyIndex].images,
                        ...formData.images
                    ]
                };
                return newList;
            });
        }
        handleFileModalClose();
    };

    const handleSubmit = async () => {
        if (!formData.latitude || !formData.longitude) {
            setError('Silakan pilih lokasi pengamatan');
            return;
        }

        if (butterflyList.length === 0) {
            setError('Silakan tambahkan minimal satu kupu-kupu');
            return;
        }

        setError('');
        setIsConfirmModalOpen(false);
        setLoading(true);
        setProgress(0);

        try {
            const progressInterval = setInterval(() => {
                setProgress(prev => prev >= 90 ? 90 : prev + 10);
            }, 500);

            const formDataToSend = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'images') {
                    formDataToSend.append(key, formData[key]);
                }
            });

            butterflyList.forEach((butterfly, index) => {
                formDataToSend.append(`fauna_id[${index}]`, butterfly.faunaId);
                formDataToSend.append(`count[${index}]`, butterfly.count);
                formDataToSend.append(`notes[${index}]`, butterfly.notes);
                
                butterfly.images.forEach((image) => {
                    formDataToSend.append(`images[${index}][]`, image);
                });
            });

            const response = await apiFetch('/kupunesia/checklist-fauna', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: formDataToSend
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Gagal mengunggah data');
            }

            const data = await response.json();
            setProgress(100);
            clearInterval(progressInterval);

            if (data.success) {
                // Update total observasi
                await updateTotalObservations();
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
                toast.success('Data berhasil diunggah!');
                
                // Reset form
                setFormData({
                    latitude: '',
                    longitude: '',
                    tujuan_pengamatan: 0,
                    observer: '',
                    additional_note: '',
                    active: 0,
                    tgl_pengamatan: '',
                    start_time: '',
                    end_time: '',
                    completed: 0,
                    count: '',
                    notes: '',
                    images: []
                });
                setButterflyList([]);
                setLocationName('');

                // Redirect ke halaman profil setelah berhasil
                navigate(`/profile/${user.id}/observasi`);
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error.message);
            toast.error(error.message);
        } finally {
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
            }, 500);
        }
    };

    const handleRemoveFormImage = (imgIndex) => {
        setFormData(prevData => ({
            ...prevData,
            images: prevData.images.filter((_, i) => i !== imgIndex)
        }));
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Header userData={{
                uname: localStorage.getItem('username'),
                totalObservations: localStorage.getItem('totalObservations')
            }} />
            
            <div className="container mx-auto px-4 py-8">
                <h2 className="text-xl font-bold mb-6">Cheklist Kupunesia</h2>

                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-4 rounded-lg text-center">
                            <div className="mb-2">Mengunggah data... {progress}%</div>
                            <div className="w-64 h-2 bg-gray-200 rounded">
                                <div 
                                    className="h-full bg-blue-500 rounded" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Form Lokasi */}
        {/* Lokasi */}
        <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Lokasi Pengamatan</h3>
            <LocationInput
                locationName={locationName}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onTrigger={() => setIsLocationModalOpen(true)}
            />
        </div>

                <Modal 
                    isOpen={isLocationModalOpen} 
                    onClose={() => setIsLocationModalOpen(false)}
                >
                    <LocationPicker 
                        onSave={handleLocationSave} 
                        onClose={() => setIsLocationModalOpen(false)}
                    />
                </Modal>
                

    {/* Form Pengamatan */}
    <div className="space-y-6 mt-6">
        {/* Data Waktu Pengamatan */}
        <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Waktu Pengamatan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input 
                    type="date" 
                    name="tgl_pengamatan"
                    className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.tgl_pengamatan}
                    onChange={handleInputChange}
                    placeholder="Tanggal Pengamatan"
                />
                <input 
                    type="time" 
                    name="start_time"
                    className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    placeholder="Waktu Mulai"
                />
                <input 
                    type="time" 
                    name="end_time"
                    className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    placeholder="Waktu Selesai"
                />
            </div>
        </div>

        {/* Data Pengamat */}
        <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Data Pengamat</h3>
            <div className="grid grid-cols-1 gap-4">
                <input 
                    type="text" 
                    name="observer"
                    className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.observer}
                    onChange={handleInputChange}
                    placeholder="Nama Pengamat"
                />
                <select 
                    name="tujuan_pengamatan"
                    className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.tujuan_pengamatan}
                    onChange={handleInputChange}
                    required
                >
                    <option value="">Pilih Tujuan Pengamatan</option>
                    <option value="1">Terencana/Terjadwal (Survey, Inventarisasi, Pengamatan Rutin, dll)</option>
                    <option value="2">Insidental/tidak ditujukan untuk pengamatan</option>
                </select>
                <textarea 
                    name="additional_note"
                    className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.additional_note}
                    onChange={handleInputChange}
                    placeholder="Catatan Tambahan"
                    rows="3"
                />
            </div>
        </div>

        {/* Status Pengamatan */}
        <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Status Pengamatan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-sm">
                    <input 
                        type="checkbox" 
                        name="active"
                        id="active"
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        checked={formData.active === 1}
                        onChange={(e) => {
                            setFormData(prev => ({
                                ...prev,
                                active: e.target.checked ? 1 : 0
                            }));
                        }}
                    />
                    <label htmlFor="active" className="text-gray-700">Aktifitas</label>
                </div>
                <div className="flex items-center space-x-2 bg-white p-3 rounded-lg shadow-sm">
                    <input 
                        type="checkbox" 
                        name="completed"
                        id="completed"
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        checked={formData.completed === 1}
                        onChange={(e) => {
                            setFormData(prev => ({
                                ...prev,
                                completed: e.target.checked ? 1 : 0
                            }));
                        }}
                    />
                    <label htmlFor="completed" className="text-gray-700">Checklist Lengkap</label>
                </div>
            </div>
        </div>
    </div>


                {/* Daftar Kupu-kupu */}
                <div className="mb-4 mt-8">
                    <button 
                        type="button" 
                        onClick={() => setIsModalOpen(true)} 
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Tambah Jenis
                    </button>

                    {butterflyList.length > 0 && (
                        <div className="mt-8">
                            <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-semibold mb-6">Daftar Kupu-kupu</h2>
                                
                                {/* Desktop View - Tabel */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Media</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                        {butterflyList.map((butterfly, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    {/* Tampilan Media */}
                                                    <div className="space-y-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-3 gap-3">
                                                        {butterfly.images.map((image, imgIndex) => (
                                                            <div key={imgIndex} className="relative group aspect-square max-w-[300px] w-full mx-auto">
                                                                <img 
                                                                    src={URL.createObjectURL(image)} 
                                                                    alt="Foto Kupu-kupu" 
                                                                    className="w-full h-full object-cover rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                                                />
                                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg" />
                                                                <button 
                                                                    onClick={() => handleRemoveMedia('images', imgIndex, index)}
                                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{butterfly.faunaName}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {butterfly.count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <div className="max-w-xs overflow-hidden text-ellipsis">
                                                        {butterfly.notes}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <button 
                                                            onClick={() => handleEditButterfly(index)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteButterfly(index)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                        >
                                                            Hapus
                                                        </button>
                                                        <button 
                                                            onClick={() => handleFileModalOpen(index)}
                                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                        >
                                                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                            </svg>
                                                            Tambah Foto
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile View - Cards */}
                                <div className="md:hidden space-y-4">
                                    {butterflyList.map((butterfly, index) => (
                                        <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                                            {/* Gambar Grid */}
                                            {butterfly.images.length > 0 && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {butterfly.images.map((image, imgIndex) => (
                                                        <div key={imgIndex} className="relative group aspect-square">
                                                            <img 
                                                                src={URL.createObjectURL(image)} 
                                                                alt="Foto Kupu-kupu" 
                                                                className="w-full h-full object-cover rounded-lg"
                                                            />
                                                            <button 
                                                                onClick={() => handleRemoveMedia('images', imgIndex, index)}
                                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Info Kupu-kupu */}
                                            <div className="space-y-2">
                                                <div className="font-medium text-sm text-gray-900">
                                                    {butterfly.faunaName}
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm text-gray-500">Jumlah:</span>
                                                    <span className="px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                                                        {butterfly.count}
                                                    </span>
                                                </div>
                                                {butterfly.notes && (
                                                    <div className="text-sm text-gray-500">
                                                        <span className="font-medium">Catatan:</span>
                                                        <p className="mt-1">{butterfly.notes}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Tombol Aksi */}
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                <button 
                                                    onClick={() => handleEditButterfly(index)}
                                                    className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteButterfly(index)}
                                                    className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                                                >
                                                    Hapus
                                                </button>
                                                <button 
                                                    onClick={() => handleFileModalOpen(index)}
                                                    className="flex-1 inline-flex justify-center items-center px-3 py-1.5 text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                                                >
                                                    {/* <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                    </svg> */}
                                                    Tambah Foto
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Tambah/Edit Kupu-kupu */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded shadow-lg w-96 relative">
                            {isSearching && (
                                <div className="absolute top-2 right-2 z-[700]">
                                    <div className="bg-white p-2 rounded-lg shadow-md flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#696969] border-t-transparent"></div>
                                        <span className="text-sm">Mencari...</span>
                                    </div>
                                </div>
                            )}
                            
                            <h2 className="text-xl font-semibold mb-4">
                                {editIndex !== null ? 'Edit Kupu-kupu' : 'Tambah Kupu-kupu'}
                            </h2>
                            
                            <div className="relative">
                                <input 
                                    type="text" 
                                    id="fauna_name" 
                                    placeholder="Jenis kupu-kupu" 
                                    required 
                                    className="border p-2 w-full mb-2" 
                                    value={faunaName} 
                                    onChange={(e) => handleFaunaNameChange(e.target.value)} 
                                    autoComplete="off"
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {suggestions.map((fauna) => (
                                            <div
                                                key={fauna.id}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => handleSelectFauna(fauna)}
                                            >
                                                <span className="font-medium">{fauna.nameId}</span>
                                                <span className="text-sm text-gray-600 ml-2">({fauna.nameLat})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <input 
                                type="number" 
                                name="count"
                                placeholder="Jumlah" 
                                required 
                                className="border p-2 w-full mb-2" 
                                value={formData.count}
                                onChange={handleInputChange}
                            />
                            
                            <textarea 
                                name="notes"
                                placeholder="Catatan" 
                                className="border p-2 w-full mb-2" 
                                value={formData.notes}
                                onChange={handleInputChange}
                            />

                            <input 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                onChange={handleFileChange}
                                className="mb-2"
                            />

                            {formData.images.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="font-semibold mb-2">Preview Foto:</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {formData.images.map((image, index) => (
                                            <div key={index} className="relative group">
                                                <img 
                                                    src={URL.createObjectURL(image)} 
                                                    alt={`Preview ${index}`} 
                                                    className="w-full h-20 object-cover rounded"
                                                />
                                                <button 
                                                    onClick={() => handleRemoveFormImage(index)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <button 
                                    onClick={handleAddButterfly}
                                    className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                                >
                                    {editIndex !== null ? 'Simpan Perubahan' : 'Tambah'}
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditIndex(null);
                                        setFaunaName('');
                                        setFaunaId('');
                                        setFormData(prev => ({
                                            ...prev,
                                            count: '',
                                            notes: '',
                                            images: []
                                        }));
                                    }}
                                    className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

    {isFileModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center p-4">
            <div className="bg-white p-4 md:p-6 rounded shadow-lg w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4">Tambah Foto</h2>
                <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange} 
                    className="border p-2 w-full mb-4" 
                    multiple 
                />
                
                {/* Preview Foto */}
                {formData.images.length > 0 && (
                    <div className="mb-4">
                        <h3 className="font-semibold mb-2">Preview Foto:</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {formData.images.map((image, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <img 
                                        src={URL.createObjectURL(image)} 
                                        alt="Preview" 
                                        className="w-full h-full object-cover rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg" />
                                    <button 
                                        onClick={() => handleRemoveFormImage(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 shadow-lg"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between gap-2">
                    <button 
                        onClick={handleFileSave} 
                        className="bg-green-500 text-white p-2 rounded hover:bg-green-600"
                    >
                        Simpan
                    </button>
                    <button 
                        onClick={handleFileModalClose} 
                        className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    )}

                {/* Tombol Submit */}
                {butterflyList.length > 0 && (
                    <div className="mt-4">
                        <button 
                            onClick={() => setIsConfirmModalOpen(true)}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            Upload Data
                        </button>
                    </div>
                )}

                {/* Modal Konfirmasi */}
                {isConfirmModalOpen && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded shadow-lg max-w-2xl w-full mx-4">
                            <h2 className="text-xl font-semibold mb-4">Konfirmasi Upload</h2>
                            
                            {/* Preview Data */}
                            <div className="mb-6 max-h-96 overflow-y-auto">
                                <h3 className="font-medium mb-3">Data yang akan diupload:</h3>
                                
                                <div className="space-y-4">
                                    {butterflyList.map((butterfly, index) => (
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                {/* Foto Preview */}
                                                <div className="flex-shrink-0">
                                                    <div className="grid grid-cols-2 gap-2 w-32">
                                                        {butterfly.images.slice(0, 4).map((image, imgIndex) => (
                                                            <div key={imgIndex} className="aspect-square">
                                                                <img 
                                                                    src={URL.createObjectURL(image)} 
                                                                    alt={`Preview ${imgIndex}`}
                                                                    className="w-full h-full object-cover rounded"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {butterfly.images.length > 4 && (
                                                        <div className="text-sm text-gray-500 mt-1 text-center">
                                                            +{butterfly.images.length - 4} foto lainnya
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Info Kupu-kupu */}
                                                <div className="flex-grow">
                                                    <h4 className="font-medium">{butterfly.faunaName}</h4>
                                                    <div className="mt-1 text-sm text-gray-600">
                                                        Jumlah: <span className="font-medium">{butterfly.count}</span>
                                                    </div>
                                                    {butterfly.notes && (
                                                        <div className="mt-1 text-sm text-gray-500">
                                                            Catatan: {butterfly.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <p className="mb-4 text-gray-600">Apakah Anda yakin ingin mengupload data ini?</p>
                            
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={handleSubmit}
                                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                >
                                    Ya, Upload
                                </button>
                                <button 
                                    onClick={() => setIsConfirmModalOpen(false)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-500"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default KupunesiaUpload;