import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export const ZoomHandler = ({ 
  gridData, 
  setVisibleGrid, 
  setSelectedGridData, 
  isMobile 
}) => {
  const map = useMap();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let infoControl = null;
    let markerUpdateTimeout = null;

    const handleZoom = (e) => {
      const originalEvent = e.originalEvent;
      if (originalEvent && !originalEvent.ctrlKey && !originalEvent.metaKey) {
        e.preventDefault();
      }
    };

    const handleZoomLevelChange = () => {
      const zoomLevel = map.getZoom();
      if (zoomLevel > 10) {
        setVisibleGrid('small');
      } else if (zoomLevel >= 8 && zoomLevel <= 10) {
        setVisibleGrid('medium');
      } else if (zoomLevel >= 6 && zoomLevel < 8) {
        setVisibleGrid('large');
      } else if (zoomLevel < 6) {
        setVisibleGrid('extraLarge');
      }
    };

    // Tambahkan InfoControl
    const InfoControl = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-control-info');
        container.innerHTML = `
          <div class="info-control-container">
            <button class="info-button" title="Zoom Info">
              <i class="custom-info-icon">ℹ️</i>
            </button>
            <div class="tooltip-container ${showTooltip ? 'show' : ''}">
              Tekan [Ctrl / Meta + Scroll] untuk zoom
            </div>
          </div>
        `;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        container.querySelector('.info-button').addEventListener('mouseenter', () => {
          setShowTooltip(true);
        });

        container.querySelector('.info-button').addEventListener('mouseleave', () => {
          setShowTooltip(false);
        });

        return container;
      }
    });

    infoControl = new InfoControl();
    map.addControl(infoControl);

    // Event listeners
    map.on('zoom', handleZoom);
    map.on('zoomend', handleZoomLevelChange);

    if (!isMobile) {
      map.scrollWheelZoom.disable();
      
      map.on('keydown', (e) => {
        if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
          map.scrollWheelZoom.enable();
        }
      });

      map.on('keyup', (e) => {
        if (!e.originalEvent.ctrlKey && !e.originalEvent.metaKey) {
          map.scrollWheelZoom.disable();
        }
      });
    }

    return () => {
      if (infoControl) {
        map.removeControl(infoControl);
      }
      map.off('zoom', handleZoom);
      map.off('zoomend', handleZoomLevelChange);
      if (!isMobile) {
        map.off('keydown');
        map.off('keyup');
      }
    };
  }, [map, setVisibleGrid, showTooltip, isMobile]);

  return null;
}; 