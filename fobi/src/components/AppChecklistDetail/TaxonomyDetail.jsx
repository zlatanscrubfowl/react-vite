import React, { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

function TaxonomyDetail({ fauna, checklist }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!Array.isArray(fauna) || fauna.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Detail Taksonomi</h2>
                <div className="text-gray-500">Data taksonomi tidak tersedia</div>
            </div>
        );
    }

    const currentFauna = fauna[currentIndex];

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < fauna.length - 1 ? prev + 1 : prev));
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return format(new Date(date), 'dd MMMM yyyy', { locale: id });
    };

    const formatTime = (time) => {
        if (!time) return '-';
        return time.substring(0, 5);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Detail Taksonomi</h2>
                {fauna.length > 1 && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                            className={`p-1 rounded-full ${
                                currentIndex === 0
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-blue-600 hover:bg-blue-50'
                            }`}
                        >
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <span className="text-sm text-gray-600">
                            {currentIndex + 1} / {fauna.length}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === fauna.length - 1}
                            className={`p-1 rounded-full ${
                                currentIndex === fauna.length - 1
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-blue-600 hover:bg-blue-50'
                            }`}
                        >
                            <ChevronRightIcon className="w-6 h-6" />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <div className="text-sm text-gray-600">Family</div>
                        <div className="font-medium">{currentFauna?.family || '-'}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Nama Lokal</div>
                        <div className="font-medium">{currentFauna?.nama_lokal || '-'}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Nama Ilmiah</div>
                        <div className="font-medium italic">{currentFauna?.nama_ilmiah || '-'}</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="text-sm text-gray-600">Tanggal Pengamatan</div>
                        <div className="font-medium">{formatDate(checklist?.tgl_pengamatan)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Waktu Mulai</div>
                        <div className="font-medium">{formatTime(checklist?.start_time)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-600">Waktu Selesai</div>
                        <div className="font-medium">{formatTime(checklist?.end_time)}</div>
                    </div>
                </div>

                {currentFauna?.breeding !== undefined && (
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <div className="text-sm text-gray-600">Status Breeding</div>
                            <div className="font-medium">
                                {currentFauna.breeding === 1 ? 'Ya' : 'Tidak'}
                            </div>
                        </div>
                        {currentFauna?.breeding_type_name && (
                            <div>
                                <div className="text-sm text-gray-600">Tipe Breeding</div>
                                <div className="font-medium">{currentFauna.breeding_type_name}</div>
                            </div>
                        )}
                        {currentFauna?.breeding_note && (
                            <div>
                                <div className="text-sm text-gray-600">Catatan Breeding</div>
                                <div className="font-medium">{currentFauna.breeding_note}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaxonomyDetail;
