import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { getSourceLogo } from '../../utils/mapHelpers';
import { useNavigate } from 'react-router-dom';

export const Sidebar = React.memo(({ data, onClose, onLoadMore }) => {
  const { selectedGrid, species, currentPage, loading, error } = data;
  const itemsPerPage = 7;
  const paginatedData = selectedGrid?.data?.slice(0, currentPage * itemsPerPage);
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = React.useState(null);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      onLoadMore();
    }
  };

  const handleLogoClick = (item, newTab = false) => {
    let prefix = '';
    let url;
    const baseId = item.id
      .replace(/^(fobi_[bkt]_)/, '')
      .replace(/^(brn_|kpn_)/, '');

    // Cek sumber data dan set prefix
    if (item.source === 'burungnesia' || item.source === 'burungnesia_fobi' || item.id.startsWith('fobi_b_')) {
        prefix = 'BN';
    } else if (item.source === 'kupunesia' || item.source === 'kupunesia_fobi' || item.id.startsWith('fobi_k_')) {
        prefix = 'KP';
    }

    // Tentukan URL berdasarkan sumber data
    if (item.source === 'taxa_fobi' || item.id.startsWith('fobi_t_')) {
        url = `/observations/${baseId}`;
    } else if (item.source?.includes('fobi')) {
        url = `/detail-checklist/${prefix}${baseId}`;
    } else {
        // Untuk data non-FOBI (burungnesia dan kupunesia biasa)
        url = `/app-checklist/${prefix}${baseId}`;
    }

    if (newTab) {
        window.open(url, '_blank');
    } else {
        navigate(url);
        onClose();
    }
  };

  const handleImageClick = (index, e) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === index ? null : index);
  };

  React.useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  return (
    <div
      className="fixed md:relative top-0 left-0 w-full md:w-1/4 h-full md:h-[100vh] overflow-y-auto bg-[#5f8b8b] p-2 box-border text-white text-sm md:z-[50] z-[100]"
      onScroll={handleScroll}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-5 z-1000 hover:text-gray-200"
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>

      {loading && (
        <div className="flex justify-center items-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500 text-white rounded mb-4">
          {error}
        </div>
      )}

      {/* Grid Data */}
      {paginatedData?.map((item, index) => (
        <div key={index} className="p-2 border-b border-gray-300 flex items-center">
          <div className="relative">
            <img
              src={getSourceLogo(item.source)}
              alt={`${item.source} logo`}
              className="w-8 h-8 mr-2 cursor-pointer hover:opacity-80"
              onClick={(e) => handleImageClick(index, e)}
            />
            {activeMenu === index && (
              <div className="absolute left-0 mt-1 w-32 bg-white shadow-lg rounded-md overflow-hidden z-10">
                <button 
                  onClick={() => handleLogoClick(item)}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Buka di tab ini
                </button>
                <button 
                  onClick={() => handleLogoClick(item, true)}
                  className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                >
                  Buka di tab baru
                </button>
              </div>
            )}
          </div>
          <div>
            <p>ID: {item.id}</p>
            <p>Source: {item.source}</p>
            <p>Date: {new Date(item.created_at).toLocaleDateString()}</p>
            {item.count && <p>Count: {item.count}</p>}
          </div>
        </div>
      ))}

      {/* Species Data */}
      {species.length > 0 ? (
        <>
          <h3 className="mt-4 mb-2 font-medium">Species:</h3>
          {species.map((species, index) => (
            <div key={index} className="p-2 border-b border-gray-300">
              <p>{species.nameId}</p>
              <i>{species.nameLat}</i>
            </div>
          ))}
        </>
      ) : !loading && (
        <div className="p-4 text-center text-gray-200">
          Tidak ada data species
        </div>
      )}
    </div>
  );
});

Sidebar.displayName = 'Sidebar'; 