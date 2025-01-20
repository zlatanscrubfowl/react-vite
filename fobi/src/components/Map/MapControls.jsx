import React from 'react';
import { LayersControl, TileLayer, ScaleControl, useMap } from 'react-leaflet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUndo } from '@fortawesome/free-solid-svg-icons';
import { defaultMapConfig } from '../../utils/mapHelpers';

const ResetControl = ({ onReset }) => {
  const map = useMap();

  const handleReset = () => {
    // Reset map view ke default
    map.setView(
      defaultMapConfig.center,
      defaultMapConfig.zoom,
      { animate: true }
    );
    // Trigger reset callback
    if (onReset) onReset();
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '80px' }}>
      <div className="leaflet-control">
        <button
          onClick={handleReset}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
          title="Reset peta"
        >
          <FontAwesomeIcon icon={faUndo} className="text-gray-700" />
        </button>
      </div>
    </div>
  );
};

export const MapControls = React.memo(({ onReset }) => {
  return (
    <>
      <LayersControl position="topleft">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Terrain">
          <TileLayer
            url="https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.jpg"
            attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>'
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <ScaleControl position="bottomright" />
      <ResetControl onReset={onReset} />
    </>
  );
});

MapControls.displayName = 'MapControls'; 