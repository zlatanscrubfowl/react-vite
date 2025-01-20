import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Rectangle, useMap, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiFetch } from '../../utils/api';
import './CheklistMap.css';
// Import marker icons sebagai URL
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix untuk icon marker Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

function ChecklistMap({ checklist }) {
    const [relatedLocations, setRelatedLocations] = useState([]);
    const [visibleGrid, setVisibleGrid] = useState('large');
    const [gridData, setGridData] = useState({
        main: null,
        related: []
    });

    const latitude = parseFloat(checklist?.latitude) || 0;
    const longitude = parseFloat(checklist?.longitude) || 0;

    // Fetch lokasi lain dengan taxa_id yang sama
    useEffect(() => {
        const fetchRelatedLocations = async () => {
            if (checklist?.taxa_id) {
                try {
                    console.log('Fetching for taxa_id:', checklist.taxa_id);
                    const response = await apiFetch(`/observations/related-locations/${checklist.taxa_id}`);
                    const data = await response.json();
                    console.log('Data:', data);
                    
                    if (Array.isArray(data)) {
                        const filteredLocations = data.filter(loc => 
                            loc.id !== checklist.id
                        );
                        console.log('Filtered locations:', filteredLocations);
                        setRelatedLocations(filteredLocations);
                    } else {
                        console.log('Data bukan array:', data);
                        setRelatedLocations([]);
                    }
                } catch (error) {
                    console.error('Error fetching related locations:', error);
                    setRelatedLocations([]);
                }
            }
        };
        
        fetchRelatedLocations();
    }, [checklist?.taxa_id, checklist?.id]);

    // Fungsi untuk membuat bounds yang mencakup semua marker
    const getBounds = () => {
        const points = [
            [latitude, longitude],
            ...relatedLocations.map(loc => [parseFloat(loc.latitude), parseFloat(loc.longitude)])
        ];
        
        return L.latLngBounds(points).pad(0.1); // Tambah padding 10%
    };

    // Komponen ZoomHandler yang terpisah
    const ZoomHandler = () => {
        const map = useMap();
        
        useEffect(() => {
            if (!map) return;

            const handleZoomChange = () => {
                const zoom = map.getZoom();
                if (zoom > 14) {
                    setVisibleGrid('small');
                } else if (zoom > 12) {
                    setVisibleGrid('medium');
                } else if (zoom > 10) {
                    setVisibleGrid('large');
                } else if (zoom > 8) {
                    setVisibleGrid('extraLarge');
                } else {
                    setVisibleGrid('superLarge');
                }
            };

            map.on('zoomend', handleZoomChange);
            return () => {
                map.off('zoomend', handleZoomChange);
            };
        }, [map]);

        return null;
    };

    // Fungsi untuk membuat single grid
    const createSingleGrid = useCallback((lat, lng, gridSize) => {
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
        
        const halfSize = gridSize / 2;
        return {
            bounds: [
                [lat - halfSize, lng - halfSize],
                [lat + halfSize, lng + halfSize]
            ],
            center: [lat, lng]
        };
    }, []);

    // Inisialisasi grid data
    useEffect(() => {
        if (latitude && longitude) {
            const mainGrids = {
                small: createSingleGrid(latitude, longitude, 0.007),      // ~50m
                medium: createSingleGrid(latitude, longitude, 0.02),      // ~100m
                large: createSingleGrid(latitude, longitude, 0.05),       // ~500m
                extraLarge: createSingleGrid(latitude, longitude, 0.2),   // ~1km
                superLarge: createSingleGrid(latitude, longitude, 0.3)    // ~5km
            };

            const relatedGrids = relatedLocations.map(loc => ({
                small: createSingleGrid(parseFloat(loc.latitude), parseFloat(loc.longitude), 0.007),
                medium: createSingleGrid(parseFloat(loc.latitude), parseFloat(loc.longitude), 0.02),
                large: createSingleGrid(parseFloat(loc.latitude), parseFloat(loc.longitude), 0.05),
                extraLarge: createSingleGrid(parseFloat(loc.latitude), parseFloat(loc.longitude), 0.2),
                superLarge: createSingleGrid(parseFloat(loc.latitude), parseFloat(loc.longitude), 0.3)
            }));

            setGridData({
                main: mainGrids,
                related: relatedGrids
            });
        }
    }, [latitude, longitude, relatedLocations, createSingleGrid]);

    // Fungsi untuk mendapatkan warna grid
    const getGridColor = useCallback((bounds, center) => {
        const isMarkerGrid = center[0] >= bounds[0][0] && 
                           center[0] <= bounds[1][0] && 
                           center[1] >= bounds[0][1] && 
                           center[1] <= bounds[1][1];
        return isMarkerGrid ? 'rgba(227, 26, 28, 0.5)' : 'rgba(254, 180, 76, 0.2)';
    }, []);

    const getMarkerIcon = (grade) => {
        const color = grade === 'research grade' ? 'green' :
                     grade === 'needs ID' ? 'yellow' : 'orange';
                     
        return new L.Icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        });
    };

    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
        return (
            <div className="flex items-center justify-center h-[400px] bg-gray-100 rounded-lg">
                <p className="text-gray-500">Lokasi tidak tersedia</p>
            </div>
        );
    }

    return (
        <MapContainer 
            bounds={getBounds()}
            style={{ height: "400px", width: "100%", position: "relative", zIndex: 40 }}
            className="rounded-lg shadow-md"
            maxZoom={14}
            zoom={10}
            center={[latitude, longitude]}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <ZoomHandler />
            
            {gridData.main && gridData.main[visibleGrid] && (
                <Rectangle
                    bounds={gridData.main[visibleGrid].bounds}
                    color={getGridColor(gridData.main[visibleGrid].bounds, [latitude, longitude])}
                    weight={1}
                    fillOpacity={0.5}
                >
                    <Popup>
                        <div className="p-2">
                            <h3 className="font-semibold">{checklist.scientific_name || 'Spesies tidak diketahui'}</h3>
                            <p className="text-sm text-gray-600">
                                Lat: {latitude.toFixed(6)}<br />
                                Long: {longitude.toFixed(6)}
                            </p>
                        </div>
                    </Popup>
                </Rectangle>
            )}

            {gridData.related?.map((locationGrids, locationIndex) => {
                const loc = relatedLocations[locationIndex];
                const grid = locationGrids[visibleGrid];
                if (!grid) return null;

                return (
                    <Rectangle
                        key={`related-grid-${locationIndex}`}
                        bounds={grid.bounds}
                        color={getGridColor(grid.bounds, [parseFloat(loc.latitude), parseFloat(loc.longitude)])}
                        weight={1}
                        fillOpacity={0.5}
                    >
                        <Popup>
                            <div className="p-2">
                                <h3 className="font-semibold">{loc.scientific_name || 'Spesies tidak diketahui'}</h3>
                                <p className="text-sm text-gray-600">
                                    Lat: {parseFloat(loc.latitude).toFixed(6)}<br />
                                    Long: {parseFloat(loc.longitude).toFixed(6)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Tanggal: {new Date(loc.created_at).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                        </Popup>
                    </Rectangle>
                );
            })}

            {relatedLocations.map((location) => (
                <Marker
                    key={location.id}
                    position={[location.latitude, location.longitude]}
                    icon={getMarkerIcon(location.grade)}
                >
                    <Popup>
                        <div>
                            <h4>{location.scientific_name}</h4>
                            <p>Grade: {location.grade}</p>
                            <p>Tanggal: {new Date(location.created_at).toLocaleDateString()}</p>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

export default ChecklistMap;