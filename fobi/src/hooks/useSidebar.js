import { useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';

export const useSidebar = () => {
  const [sidebarData, setSidebarData] = useState({
    isOpen: false,
    selectedGrid: null,
    species: [],
    currentPage: 1,
    loading: false
  });

  const toggleSidebar = useCallback(async (gridItem = null) => {
    if (!gridItem) {
      setSidebarData(prev => ({ ...prev, isOpen: false }));
      return;
    }

    setSidebarData(prev => ({ 
      ...prev, 
      loading: true,
      isOpen: true,
      selectedGrid: gridItem 
    }));

    try {
      let speciesData = [];
      // Gunakan checklist_id jika ada, jika tidak gunakan id
      const rawId = gridItem.checklist_id || gridItem.id;
      
      // Validasi data sebelum request
      if (!rawId) {
        throw new Error('Invalid checklist ID');
      }

      console.log('Processing grid item:', {
        id: rawId,
        source: gridItem.source
      });

      // Tentukan endpoint dan source berdasarkan prefix ID atau source
      let endpoint = '';
      let source = '';

      if (rawId.startsWith('brn_')) {
        endpoint = `/grid-species/${rawId.replace('brn_', '')}`;
        source = 'burungnesia';
      } else if (rawId.startsWith('kpn_')) {
        endpoint = `/grid-species/${rawId.replace('kpn_', '')}`;
        source = 'kupunesia';
      } else if (gridItem.source?.includes('fobi')) {
        // Untuk data FOBI, gunakan logika yang sudah ada
        if (rawId.startsWith('fobi_b_')) {
          source = 'burungnesia_fobi';
        } else if (rawId.startsWith('fobi_k_')) {
          source = 'kupunesia_fobi';
        } else if (rawId.startsWith('fobi_t_')) {
          source = 'taxa_fobi';
        } else {
          throw new Error('Invalid FOBI source');
        }
        endpoint = `/fobi-species/${rawId}/${source}`;
      } else {
        throw new Error('Invalid checklist ID format');
      }

      // Validasi endpoint dan source
      if (!endpoint || !source) {
        throw new Error('Source or endpoint not determined');
      }

      console.log('Fetching species data:', {
        endpoint,
        source,
        rawId
      });
      
      const response = await apiFetch(endpoint);
      speciesData = await response.json();

      console.log('Species data received:', {
        source,
        speciesCount: speciesData?.length || 0
      });

      setSidebarData(prev => ({
        ...prev,
        species: speciesData || [],
        loading: false,
        currentPage: 1,
        error: null
      }));
    } catch (error) {
      console.error('Error fetching species data:', {
        error: error.message,
        gridItem
      });
      
      setSidebarData(prev => ({ 
        ...prev, 
        species: [],
        loading: false,
        error: `Failed to load species data: ${error.message}`
      }));
    }
  }, []);

  const loadMore = useCallback(() => {
    setSidebarData(prev => ({
      ...prev,
      currentPage: prev.currentPage + 1
    }));
  }, []);

  return {
    sidebarData,
    toggleSidebar,
    loadMore
  };
};