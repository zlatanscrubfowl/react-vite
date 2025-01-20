import React, { useState } from 'react';
import { apiFetch } from '../../utils/api';

function EditChecklistModal({ checklist, fauna, onClose, onSuccess, source }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        tgl_pengamatan: checklist?.tgl_pengamatan || '',
        start_time: checklist?.start_time || '',
        end_time: checklist?.end_time || '',
        latitude: checklist?.latitude || '',
        longitude: checklist?.longitude || '',
        additional_note: checklist?.additional_note || '',
        fauna: fauna?.map(f => ({
            ...f,
            isDeleted: false,
            jumlah: f.jumlah || f.count || 0,
            catatan: f.catatan || f.notes || ''
        })) || []
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const endpoint = source === 'burungnesia'
                ? `/burungnesia/checklists/${checklist.id.substring(2)}`
                : `/kupunesia/checklists/${checklist.id}`;

            const response = await apiFetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tgl_pengamatan: formData.tgl_pengamatan,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    additional_note: formData.additional_note,
                    fauna: formData.fauna.filter(f => !f.isDeleted).map(f => ({
                        id: f.id,
                        [source === 'kupunesia' ? 'count' : 'jumlah']: parseInt(f.jumlah) || 0,
                        [source === 'kupunesia' ? 'notes' : 'catatan']: f.catatan || '',
                        breeding: f.breeding || false,
                        breeding_note: f.breeding_note || '',
                        breeding_type_id: f.breeding_type_id || null
                    }))
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal memperbarui checklist');
            }

            onSuccess();
        } catch (error) {
            console.error('Error updating checklist:', error);
            alert(error.message || 'Gagal memperbarui checklist');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Edit Checklist</h2>
                <form onSubmit={handleSubmit}>
                    {/* Form fields */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Tanggal Pengamatan
                                </label>
                                <input
                                    type="date"
                                    value={formData.tgl_pengamatan}
                                    onChange={(e) => setFormData({...formData, tgl_pengamatan: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Waktu Mulai
                                </label>
                                <input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* ... tambahkan field lainnya ... */}

                        <div className="space-y-4">
                            <h3 className="font-medium">Daftar Fauna</h3>
                            {formData.fauna.map((f, index) => (
                                <div key={f.id} className={`p-4 border rounded ${f.isDeleted ? 'bg-gray-100' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-medium">{f.nama_lokal}</p>
                                            <p className="text-sm text-gray-600 italic">{f.nama_ilmiah}</p>
                                            <div className="mt-2 space-y-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Jumlah
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={f.jumlah}
                                                        onChange={(e) => {
                                                            const newFauna = [...formData.fauna];
                                                            newFauna[index].jumlah = e.target.value;
                                                            setFormData({...formData, fauna: newFauna});
                                                        }}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                                        disabled={f.isDeleted}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Catatan
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={f.catatan}
                                                        onChange={(e) => {
                                                            const newFauna = [...formData.fauna];
                                                            newFauna[index].catatan = e.target.value;
                                                            setFormData({...formData, fauna: newFauna});
                                                        }}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                                        disabled={f.isDeleted}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newFauna = [...formData.fauna];
                                                newFauna[index].isDeleted = !newFauna[index].isDeleted;
                                                setFormData({...formData, fauna: newFauna});
                                            }}
                                            className={`ml-4 text-sm ${f.isDeleted ? 'text-green-600' : 'text-red-600'}`}
                                        >
                                            {f.isDeleted ? 'Batalkan' : 'Hapus'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                            disabled={isSubmitting}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-4 py-2 text-white rounded-md ${
                                isSubmitting
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditChecklistModal;
