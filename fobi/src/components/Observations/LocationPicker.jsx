import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import debounce from 'lodash/debounce';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

function LocationPicker({ onSave, onClose, initialPosition, initialLocationName }) {
    const [position, setPosition] = useState(initialPosition || null);
    const [locationName, setLocationName] = useState(initialLocationName || '');
    const [searchQuery, setSearchQuery] = useState(initialLocationName || '');
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchContainerRef = useRef(null);
    const [isGPSLoading, setIsGPSLoading] = useState(false);
    const [gpsError, setGpsError] = useState(null);

    const debouncedSearch = useRef(
        debounce(async (query) => {
            if (!query || query.length < 3) {
                setSearchResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `q=${encodeURIComponent(query)}&` +
                    `format=json&` +
                    `limit=5&` +
                    `countrycodes=id&` +
                    `addressdetails=1`
                );
                const data = await response.json();
                
                const filteredResults = data
                    .map(item => {
                        const address = item.address;
                        const parts = [];
                        
                        if (address.city || address.town || address.municipality) {
                            parts.push(address.city || address.town || address.municipality);
                        }
                        if (address.county || address.regency) {
                            parts.push(address.county || address.regency);
                        }
                if (address.state) parts.push(address.state);
                        if (address.country) parts.push(address.country);

                        return {
                            display_name: parts.join(', '),
                            lat: item.lat,
                            lon: item.lon,
                            type: address.city ? 'Kota' : 
                                  address.town ? 'Kota' : 
                                  address.municipality ? 'Kota' :
                                  address.county ? 'Kabupaten' : 'Wilayah'
    };
                    })
                    .filter(item => item.display_name);

                setSearchResults(filteredResults);
                    } catch (error) {
                console.error('Error searching location:', error);
                setSearchResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 500)
    ).current;

    useEffect(() => {
        return () => {
            debouncedSearch.cancel();
        };
    }, [debouncedSearch]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleSelectLocation = (result) => {
        const newPosition = [parseFloat(result.lat), parseFloat(result.lon)];
        setPosition(newPosition);
        setLocationName(result.display_name);
        setSearchResults([]);
        setSearchQuery(result.display_name);
    };

    const fetchLocationName = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?` +
                `format=json&` +
                `lat=${lat}&` +
                `lon=${lng}&` +
                `addressdetails=1`
    );
            const data = await response.json();
            
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

            const displayName = parts.join(', ');
            setLocationName(displayName || 'Lokasi tidak ditemukan');
            setSearchQuery(displayName || '');
        } catch (error) {
            console.error('Error fetching location name:', error);
            setLocationName('Error mendapatkan nama lokasi');
        }
    };

    const LocationMarker = () => {
    const map = useMap();
        useMapEvents({
            click(e) {
                const currentZoom = map.getZoom();
    
                setPosition([e.latlng.lat, e.latlng.lng]);
                fetchLocationName(e.latlng.lat, e.latlng.lng);
                
                map.setView(e.latlng, currentZoom, {
                    animate: true
                });
            },
        });

        return position === null ? null : (
            <Marker position={position}></Marker>
        );
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setSearchResults([]);
}
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getCurrentLocation = () => {
        setIsGPSLoading(true);
        setGpsError(null);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setPosition([lat, lng]);
                    
                    try {
                        await fetchLocationName(lat, lng);
                    } catch (error) {
                        console.error('Error fetching location name:', error);
                    }

                    setIsGPSLoading(false);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setGpsError('Tidak dapat mengakses lokasi. Pastikan GPS aktif.');
                    setIsGPSLoading(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            setGpsError('GPS tidak didukung di browser ini');
            setIsGPSLoading(false);
        }
    };

    useEffect(() => {
        if (initialPosition && initialLocationName) {
            setPosition(initialPosition);
            setLocationName(initialLocationName);
            setSearchQuery(initialLocationName);
        }
    }, [initialPosition, initialLocationName]);

    return (
        <div className='mt-20'>
            <div className="mb-4 relative" ref={searchContainerRef}>
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                        <div className="flex items-center border rounded-lg overflow-hidden shadow-sm">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder="Cari lokasi..."
                                className="w-full p-3 outline-none"
                            />
                            {isLoading && (
                                <div className="px-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={getCurrentLocation}
                        disabled={isGPSLoading}
                        className={`p-3 rounded-lg transition-colors ${
                            isGPSLoading 
                                ? 'bg-gray-200 cursor-not-allowed' 
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        {isGPSLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            'Gunakan GPS'
                        )}
                    </button>
                </div>
                {gpsError && (
                    <div className="text-red-500 text-sm mb-2">{gpsError}</div>
                )}

                {searchResults.length > 0 && (
                    <div className="absolute w-full bg-white border rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto z-[9999]">
                        {searchResults.map((result, index) => (
                            <div
                                key={index}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                onClick={() => handleSelectLocation(result)}
                            >
                                <div className="font-medium text-gray-800">{result.display_name}</div>
                                <div className="text-sm text-gray-500">
                                    {result.type} • {result.lat}, {result.lon}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <MapContainer 
                center={position || [-2.5489, 118.0149]} 
                zoom={position ? 13 : 5} 
                className="rounded-lg shadow-md"
                style={{ height: '400px', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <LocationMarker />
                <RecenterAutomatically position={position} />
            </MapContainer>

            <div className="mt-4 space-y-3">
                {locationName && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">Lokasi terpilih:</div>
                        <div className="text-gray-800">{locationName}</div>
                    </div>
                )}
                
                <div className="flex space-x-3">
                    <button 
                        onClick={() => position && onSave(position[0], position[1], locationName)} 
                        className={`flex-1 p-3 rounded-lg transition-colors ${
                            position 
                                ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!position}
                    >
                        {position ? 'Simpan Lokasi' : 'Pilih lokasi pada peta'}
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            if (typeof onClose === 'function') {
                                onClose();
                            }
                        }}
                        className="flex-1 p-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
}

function RecenterAutomatically({ position }) {
    const map = useMap();
    
    useEffect(() => {
        if (position) {
            const currentZoom = map.getZoom();
            map.setView(position, currentZoom);
        }
    }, [position, map]);
    
    return null;
}

export default LocationPicker;