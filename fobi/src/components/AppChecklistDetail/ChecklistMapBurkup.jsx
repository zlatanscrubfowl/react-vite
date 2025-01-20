import React, { useEffect, useCallback, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function ChecklistMapBurkup({ latitude, longitude, locationName }) {
    const [gridData, setGridData] = useState(null);
    const [visibleGrid, setVisibleGrid] = useState('medium');

    // ZoomHandler Component
    const ZoomHandler = () => {
        const map = useMap();

        useEffect(() => {
            if (!map) return;

            const handleZoomChange = () => {
                const zoom = map.getZoom();
                if (zoom > 14) setVisibleGrid('small');
                else if (zoom > 12) setVisibleGrid('medium');
                else if (zoom > 10) setVisibleGrid('large');
                else if (zoom > 8) setVisibleGrid('extraLarge');
                else setVisibleGrid('superLarge');
            };

            map.on('zoomend', handleZoomChange);
            handleZoomChange();

            return () => {
                map.off('zoomend', handleZoomChange);
            };
        }, [map]);

        return null;
    };

    // Create single grid function
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

    // Initialize grid data
    useEffect(() => {
        if (latitude && longitude) {
            const mainGrids = {
                small: createSingleGrid(latitude, longitude, 0.007),
                medium: createSingleGrid(latitude, longitude, 0.02),
                large: createSingleGrid(latitude, longitude, 0.05),
                extraLarge: createSingleGrid(latitude, longitude, 0.2),
                superLarge: createSingleGrid(latitude, longitude, 0.3)
            };

            setGridData({ main: mainGrids });
        }
    }, [latitude, longitude, createSingleGrid]);

    // Grid style
    const gridStyle = {
        color: "#ff0000",
        weight: 1,
        opacity: 0.5,
        fillOpacity: 0.1,
        fillColor: "#ff0000"
    };

    // Grid Component
    const GridComponent = () => {
        const currentGrid = gridData?.main?.[visibleGrid];
        if (!currentGrid) return null;

        return (
            <Rectangle bounds={currentGrid.bounds} pathOptions={gridStyle}>
                <Popup>
                    <div className="text-center">
                        <div className="font-bold">{locationName}</div>
                        <div className="text-xs text-gray-600 mt-1">
                            {currentGrid.center[0].toFixed(6)}, {currentGrid.center[1].toFixed(6)}
                        </div>
                    </div>
                </Popup>
            </Rectangle>
        );
    };

    if (!latitude || !longitude) {
        return (
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Lokasi tidak tersedia</p>
            </div>
        );
    }

    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: "400px", width: "100%", borderRadius: "0.5rem" }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ZoomHandler />
            <GridComponent />
        </MapContainer>
    );
}

export default ChecklistMapBurkup;
