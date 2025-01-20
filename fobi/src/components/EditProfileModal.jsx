import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCamera, faUser } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
// Import logo
import burungnesiaLogo from '../assets/icon/icon.png';
import kupunesiaLogo from '../assets/icon/kupnes.png';

function EditProfileModal({ isOpen, onClose, userData, onSave }) {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'email', atau 'sync'
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [password, setPassword] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [error, setError] = useState('');

    // Fungsi untuk mendapatkan URL gambar yang benar
    const getImageUrl = (profilePicture) => {
        if (!profilePicture) return '/default-avatar.png';
        
        if (profilePicture.startsWith('http')) {
            return profilePicture;
        }
        
        const cleanPath = profilePicture
            .replace(/^\/storage\//, '')
            .replace(/^\/api\/storage\//, '')
            .replace(/^storage\//, '')
            .replace(/^api\/storage\//, '');
        
        // Gunakan VITE_API_URL untuk base URL
        return `https://api.talinara.com/storage/${cleanPath}`;
    };

    const [formData, setFormData] = useState({
        fname: userData?.fname || '',
        lname: userData?.lname || '',
        uname: userData?.uname || '',
        organization: userData?.organization || '',
        phone: userData?.phone || '',
        bio: userData?.bio || '',
        profile_picture: null,
        previewUrl: userData?.profile_picture ? getImageUrl(userData.profile_picture) : null
    });

    // Update formData ketika userData berubah
    useEffect(() => {
        if (userData) {
            console.log('Setting form data with:', userData);
            setFormData(prev => ({
                ...prev,
                fname: userData.fname || prev.fname,
                lname: userData.lname || prev.lname,
                uname: userData.uname || prev.uname,
                organization: userData.organization || prev.organization,
                phone: userData.phone || prev.phone,
                bio: userData.bio || prev.bio,
                previewUrl: userData.profile_picture ? getImageUrl(userData.profile_picture) : prev.previewUrl
            }));
        }
    }, [userData]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                profile_picture: file,
                previewUrl: URL.createObjectURL(file)
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formDataToSend = new FormData();
        
        // Log untuk debugging
        console.log('Submitting form data:', formData);
        
        // Append semua field ke FormData
        Object.keys(formData).forEach(key => {
            if (key !== 'previewUrl') {
                if (key === 'profile_picture' && formData[key] === null) {
                    // Skip jika tidak ada perubahan foto
                    return;
                }
                formDataToSend.append(key, formData[key]);
            }
        });

        try {
            const token = localStorage.getItem('jwt_token');
            console.log('Sending request with token:', token);
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/update`, {
                method: 'POST',
                body: formDataToSend,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            console.log('Update response:', data);

            if (response.ok) {
                await onSave(); // Refresh data profil
                onClose();
            } else {
                throw new Error(data.message || 'Gagal mengupdate profil');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Gagal mengupdate profil: ' + error.message);
        }
    };

    const handleEmailUpdate = async (e) => {
        e.preventDefault();
        
        try {
            const recaptchaToken = await executeRecaptcha('email_update');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/update-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({
                    email: newEmail,
                    password: password,
                    recaptcha_token: recaptchaToken
                })
            });

            const data = await response.json();

            if (data.success) {
                onClose();
                // Navigasi ke halaman verifikasi dengan state yang diperlukan
                navigate('/verification-pending', {
                    state: {
                        email: data.data.email,
                        hasBurungnesia: data.data.state.hasBurungnesia,
                        hasKupunesia: data.data.state.hasKupunesia
                    }
                });
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Gagal mengupdate email');
            console.error('Error:', err);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.')) {
            return;
        }

        try {
            const recaptchaToken = await executeRecaptcha('delete_account');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({
                    password: password,
                    recaptcha_token: recaptchaToken
                })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.removeItem('jwt_token');
                navigate('/login');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            alert('Gagal menghapus akun: ' + error.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Pengaturan Akun</h2>
                    <button onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} className="text-gray-500" />
                    </button>
                </div>

                <div className="mb-4">
                    <div className="flex border-b">
                        <button
                            className={`px-4 py-2 ${activeTab === 'profile' ? 'border-b-2 border-teal-500' : ''}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            Profil
                        </button>
                        <button
                            className={`px-4 py-2 ${activeTab === 'email' ? 'border-b-2 border-teal-500' : ''}`}
                            onClick={() => setActiveTab('email')}
                        >
                            Email
                        </button>
                        <button
                            className={`px-4 py-2 ${activeTab === 'sync' ? 'border-b-2 border-teal-500' : ''}`}
                            onClick={() => setActiveTab('sync')}
                        >
                            Sinkronisasi
                        </button>
                    </div>
                </div>

                {activeTab === 'profile' && (
                    // Form profil yang sudah ada
                    <form onSubmit={handleSubmit}>
                        {/* Foto Profil */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Foto Profil
                            </label>
                            <div className="relative w-32 h-32 mx-auto">
                                <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                                    {(formData.previewUrl || userData?.profile_picture) ? (
                                        <img
                                            src={formData.previewUrl || getImageUrl(userData?.profile_picture)}
                                            alt="Foto Profil"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                console.log('Error loading image:', e.target.src);
                                                if (!e.target.src.includes('default-avatar.png')) {
                                                    e.target.src = '/default-avatar.png';
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <FontAwesomeIcon icon={faCamera} className="text-gray-400 text-3xl" />
                                        </div>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-teal-600 rounded-full p-2 cursor-pointer">
                                    <FontAwesomeIcon icon={faCamera} className="text-white" />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Nama Depan */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Depan
                            </label>
                            <input
                                type="text"
                                value={formData.fname}
                                onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Nama Belakang */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nama Belakang
                            </label>
                            <input
                                type="text"
                                value={formData.lname}
                                onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Username */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={formData.uname}
                                onChange={(e) => setFormData({ ...formData, uname: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Organisasi */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Organisasi
                            </label>
                            <input
                                type="text"
                                value={formData.organization}
                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Nomor Telepon */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nomor Telepon
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Bio */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bio
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full h-32 p-2 border rounded focus:ring-2 focus:ring-teal-500"
                                placeholder="Tulis bio Anda di sini..."
                            />
                        </div>

                        {/* Tombol Submit */}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                )}

                {activeTab === 'email' && (
                    <div>
                        <h3 className="text-lg font-medium mb-4">Email FOBI</h3>
                        <form onSubmit={handleEmailUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Saat Ini
                                </label>
                                <p className="text-gray-600">{userData?.email}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Baru
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-2 border rounded"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-teal-600 text-white py-2 rounded hover:bg-teal-700"
                            >
                                Update Email
                            </button>
                        </form>

                        <div className="border-t pt-6">
                            <h3 className="text-lg font-medium mb-4 text-red-600">Zona Berbahaya</h3>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
                            >
                                Hapus Akun
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'sync' && (
                    <div>
                        <h3 className="text-lg font-medium mb-4">Sinkronisasi Platform</h3>
                        
                        {/* Burungnesia Section */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Akun Burungnesia
                            </label>
                            {userData?.burungnesia_email_verified_at ? (
                                <div className="flex items-center justify-between p-2 border rounded bg-gray-50">
                                    <div className="flex items-center">
                                        <img 
                                            src={burungnesiaLogo} 
                                            alt="Burungnesia Logo" 
                                            className="w-6 h-6 mr-2 object-contain"
                                        />
                                        <div>
                                            <p className="font-medium">{userData.burungnesia_email}</p>
                                            <p className="text-sm text-gray-500">Akun terverifikasi</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/sync-accounts')}
                                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                                    >
                                        Kelola
                                    </button>
                                </div>
                            ) : userData?.burungnesia_email ? (
                                <div className="flex items-center justify-between p-2 border rounded bg-yellow-50">
                                    <div className="flex items-center">
                                        <img 
                                            src={burungnesiaLogo} 
                                            alt="Burungnesia Logo" 
                                            className="w-6 h-6 mr-2 object-contain"
                                        />
                                        <div>
                                            <p className="font-medium">{userData.burungnesia_email}</p>
                                            <p className="text-sm text-yellow-600">Menunggu verifikasi</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/sync-accounts')}
                                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                                    >
                                        Cek Status
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/sync-accounts')}
                                    className="w-full p-3 border rounded flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                                >
                                    <img 
                                        src={burungnesiaLogo} 
                                        alt="Burungnesia Logo" 
                                        className="w-6 h-6 object-contain"
                                    />
                                    Tautkan Akun Burungnesia
                                </button>
                            )}
                        </div>

                        {/* Kupunesia Section */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Akun Kupunesia
                            </label>
                            {userData?.kupunesia_email_verified_at ? (
                                <div className="flex items-center justify-between p-2 border rounded bg-gray-50">
                                    <div className="flex items-center">
                                        <img 
                                            src={kupunesiaLogo} 
                                            alt="Kupunesia Logo" 
                                            className="w-6 h-6 mr-2 object-contain"
                                        />
                                        <div>
                                            <p className="font-medium">{userData.kupunesia_email}</p>
                                            <p className="text-sm text-gray-500">Akun terverifikasi</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/sync-accounts')}
                                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                                    >
                                        Kelola
                                    </button>
                                </div>
                            ) : userData?.kupunesia_email ? (
                                <div className="flex items-center justify-between p-2 border rounded bg-yellow-50">
                                    <div className="flex items-center">
                                        <img 
                                            src={kupunesiaLogo} 
                                            alt="Kupunesia Logo" 
                                            className="w-6 h-6 mr-2 object-contain"
                                        />
                                        <div>
                                            <p className="font-medium">{userData.kupunesia_email}</p>
                                            <p className="text-sm text-yellow-600">Menunggu verifikasi</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/sync-accounts')}
                                        className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                                    >
                                        Cek Status
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => navigate('/sync-accounts')}
                                    className="w-full p-3 border rounded flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                                >
                                    <img 
                                        src={kupunesiaLogo} 
                                        alt="Kupunesia Logo" 
                                        className="w-6 h-6 object-contain"
                                    />
                                    Tautkan Akun Kupunesia
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal konfirmasi hapus akun */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-md">
                        <h3 className="text-xl font-bold mb-4">Konfirmasi Hapus Akun</h3>
                        <p className="text-gray-600 mb-4">
                            Tindakan ini akan menghapus permanen akun Anda dan semua data terkait. 
                            Masukkan password Anda untuk melanjutkan.
                        </p>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full p-2 border rounded mb-4"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Hapus Akun
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EditProfileModal;