import L from 'leaflet';
import burungnesiaLogo from '../assets/icon/icon.png';
import kupunesiaLogo from '../assets/icon/kupnes.png';
import taxaLogo from '../assets/icon/FOBI.png';

export const defaultMapConfig = {
  center: [-2.5489, 118.0149],
  zoom: 5,
  scrollWheelZoom: window.innerWidth > 768,
  style: { zIndex: 40 }
};

export const redCircleIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color:red; width:10px; height:10px; border-radius:50%;'></div>",
  iconSize: [10, 10]
});

export const getSourceLogo = (source) => {
  if (source?.includes('burungnesia')) return burungnesiaLogo;
  if (source?.includes('kupunesia')) return kupunesiaLogo;
  if (source?.includes('taxa') || source?.includes('fobi')) return taxaLogo;
  return burungnesiaLogo;
};

export const getColor = (count, source) => {
  // Gradasi warna merah darah untuk semua sumber
  return count > 50 ? 'rgba(139, 0, 0, 0.9)' :      // Dark Red
         count > 20 ? 'rgba(165, 0, 0, 0.8)' :      // Crimson Red
         count > 10 ? 'rgba(178, 34, 34, 0.7)' :    // Fire Brick
         count > 5  ? 'rgba(205, 51, 51, 0.6)' :    // Indian Red
         count > 2  ? 'rgba(220, 80, 80, 0.5)' :    // Light Red
                     'rgba(240, 128, 128, 0.4)';    // Light Coral
};

export const getVisibleGridType = (zoom) => {
  if (zoom >= 12) return 'small';
  if (zoom >= 9) return 'medium';
  if (zoom >= 6) return 'large';
  return 'extraLarge';
}; 