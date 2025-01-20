import React from 'react';

function Modal({ isOpen, onClose, children }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-[9999] overflow-y-auto mt-5">
            <div className="bg-white p-6 rounded shadow-lg w-11/12 max-w-4xl mx-auto my-10 relative">
                {children}
                <button 
                    onClick={onClose} 
                    className="absolute -top-2 -right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

export default Modal;