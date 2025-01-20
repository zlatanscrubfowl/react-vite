import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function TopTaxa({ observationTaxa, identificationTaxa }) {
    const [showSpectrogram, setShowSpectrogram] = useState({});

    const TaxaCard = ({ taxa }) => {
        // Helper function untuk menentukan prefix dan source
        const getObservationLink = (taxa) => {
            if (taxa.type === 'observation' || taxa.type === 'identification') {
                switch (taxa.source) {
                    case 'burungnesia':
                        return `/observations/BN${taxa.checklist_id}?source=burungnesia`;
                    case 'kupunesia':
                        return `/observations/KP${taxa.checklist_id}?source=kupunesia`;
                    default:
                        return `/observations/${taxa.checklist_id}?source=fobi`;
                }
            }
            return `/taxa/${taxa.id}`;
        };

        const toggleSpectrogram = (id) => {
            setShowSpectrogram(prev => ({
                ...prev,
                [id]: !prev[id]
            }));
        };

        // Ambil media pertama untuk ditampilkan
        const photoMedia = taxa.media?.find(m => m.type === 'photo');
        const audioMedia = taxa.media?.find(m => m.type === 'audio');

        return (
            <Link
                to={getObservationLink(taxa)}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
                <div className="aspect-square relative">
                    {(photoMedia || audioMedia) ? (
                        <div className="relative w-full h-full">
                            {/* Gambar Utama */}
                            {photoMedia && (
                                <img
                                    src={photoMedia.url}
                                    alt={taxa.scientific_name}
                                    className={`w-full h-full object-cover ${showSpectrogram[taxa.id] ? 'hidden' : 'block'}`}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/images/no-image.png';
                                    }}
                                />
                            )}

                            {/* Spectrogram */}
                            {audioMedia?.spectrogram_url && (
                                <div className={`absolute inset-0 ${showSpectrogram[taxa.id] ? 'block' : 'hidden'}`}>
                                    <img
                                        src={audioMedia.spectrogram_url}
                                        alt="Spectrogram"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/images/no-spectrogram.png';
                                        }}
                                    />
                                </div>
                            )}

                            {/* Toggle Button */}
                            {audioMedia?.spectrogram_url && photoMedia && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleSpectrogram(taxa.id);
                                    }}
                                    className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm"
                                >
                                    {showSpectrogram[taxa.id] ? 'Lihat Foto' : 'Lihat Spectrogram'}
                                </button>
                            )}

                            {/* Audio Only Indicator */}
                            {audioMedia && !photoMedia && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                    <span className="text-gray-600">
                                        {audioMedia.spectrogram_url ? (
                                            <img
                                                src={audioMedia.spectrogram_url}
                                                alt="Audio Spectrogram"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/images/no-spectrogram.png';
                                                }}
                                            />
                                        ) : (
                                            'Audio Only'
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400">Tidak ada media</span>
                        </div>
                    )}
                </div>
                <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 italic">
                        {taxa.scientific_name}
                    </p>
                    <p className="text-xs text-gray-600">
                        {taxa.genus} | {taxa.family}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {taxa.count} {taxa.type === 'observation' ? 'observasi' : 'identifikasi'}
                    </p>
                </div>
            </Link>
        );
    };

    return (
        <div className="space-y-6">
            {/* Observasi Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">
                    5 Taksa teratas observasi saya
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {observationTaxa.map((taxa, index) => (
                        <TaxaCard
                            key={`obs-${taxa.id}-${index}`}
                            taxa={{...taxa, type: 'observation'}}
                        />
                    ))}
                    {observationTaxa.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-4">
                            Belum ada observasi
                        </div>
                    )}
                </div>
            </div>

            {/* Identifikasi Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">
                    5 Taksa teratas identifikasi saya
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {identificationTaxa.map((taxa, index) => (
                        <TaxaCard
                            key={`id-${taxa.id}-${index}`}
                            taxa={{...taxa, type: 'identification'}}
                        />
                    ))}
                    {identificationTaxa.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 py-4">
                            Belum ada identifikasi
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TopTaxa;
