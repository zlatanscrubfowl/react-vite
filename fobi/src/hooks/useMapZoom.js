import { useState, useCallback, useEffect } from 'react';

export const useMapZoom = (map) => {
  const [currentZoom, setCurrentZoom] = useState(map?.getZoom() || 5);

  const handleZoom = useCallback(() => {
    if (!map) return;
    
    const zoom = map.getZoom();
    setCurrentZoom(zoom);
    
    // Menentukan grid yang terlihat berdasarkan level zoom
    if (zoom >= 12) {
      return 'small';
    } else if (zoom >= 9) {
      return 'medium';
    } else if (zoom >= 6) {
      return 'large';
    } else {
      return 'extraLarge';
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    map.on('zoom', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map, handleZoom]);

  return {
    currentZoom,
    handleZoom
  };
}; 