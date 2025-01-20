// Konstanta untuk ukuran grid berdasarkan zoom level
const GRID_SIZES = {
    extraLarge: 0.5,  // Zoom level <= 5
    large: 0.2,       // Zoom level 6-7
    medium: 0.05,     // Zoom level 8-9
    small: 0.02       // Zoom level >= 10
  };
  
  // Fungsi untuk menghitung jarak antara dua titik koordinat
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  const toRad = (value) => {
    return value * Math.PI / 180;
  };
  
  const generateGrid = (markers, gridSize) => {
    if (!markers || !Array.isArray(markers) || markers.length === 0) {
      return [];
    }
  
    const grid = {};
    const validMarkers = markers.filter(marker => {
      const lat = parseFloat(marker.latitude);
      const lng = parseFloat(marker.longitude);
      return !isNaN(lat) && !isNaN(lng) && 
             lat >= -90 && lat <= 90 && 
             lng >= -180 && lng <= 180;
    });
  
    validMarkers.forEach(marker => {
      const lat = parseFloat(marker.latitude);
      const lng = parseFloat(marker.longitude);
      const latKey = Math.floor(lat / gridSize) * gridSize;
      const lngKey = Math.floor(lng / gridSize) * gridSize;
      const gridKey = `${latKey}_${lngKey}`;
  
      if (!grid[gridKey]) {
        grid[gridKey] = {
          bounds: [
            [latKey, lngKey],
            [latKey + gridSize, lngKey + gridSize]
          ],
          count: 0,
          data: [],
          source: marker.source
        };
      }
  
      // Tambahkan data marker ke grid dengan prefix
      grid[gridKey].data.push({
        id: marker.id,
        checklist_id: marker.checklist_id || marker.id,
        source: marker.source,
        latitude: marker.latitude,
        longitude: marker.longitude,
        created_at: marker.created_at
      });
  
      grid[gridKey].count++;
      
      // Update source jika berbeda (penting untuk FOBI)
      if (marker.source.includes('fobi')) {
        grid[gridKey].source = 'fobi';
      }
    });
  
    // Konversi grid object ke array dan filter yang valid
    return Object.values(grid).filter(tile => {
      if (!tile.bounds || !Array.isArray(tile.bounds)) return false;
      const [[south, west], [north, east]] = tile.bounds;
      return !isNaN(south) && !isNaN(west) && !isNaN(north) && !isNaN(east);
    });
  };
  
  const getGridType = (zoom) => {
    if (zoom >= 12) return 'small';
    if (zoom >= 9) return 'medium';
    if (zoom >= 6) return 'large';
    return 'extraLarge';
  };
  
  const isTileInBounds = (tileBounds, mapBounds) => {
    if (!mapBounds) return true;
    const [[south, west], [north, east]] = tileBounds;
    return mapBounds.intersects([[south, west], [north, east]]);
  };
  
  // Satu export statement untuk semua
  export {
    generateGrid,
    getGridType,
    isTileInBounds,
    GRID_SIZES
  }; 