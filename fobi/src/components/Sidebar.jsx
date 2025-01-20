import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar({ userId }) {
    const location = useLocation();
    
    const menuItems = [
        { path: `/profile/${userId}`, label: 'Profil' },
        { path: `/profile/${userId}/observasi`, label: 'Observasi saya' },
        { path: `/profile/${userId}/taksa`, label: 'Taksa favorit' },
        { path: `/profile/${userId}/spesies`, label: 'Spesies saya' },
        { path: `/profile/${userId}/identifikasi`, label: 'Diskusi identifikasi' },
    ];

    return (
        <div className="w-64 bg-white shadow-sm rounded">
            {menuItems.map((item) => (
                <Link
                    key={item.path}
                    to={item.path}
                    className={`block px-4 py-2 text-sm ${
                        location.pathname === item.path
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    {item.label}
                </Link>
            ))}
        </div>
    );
}

export default Sidebar;