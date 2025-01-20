import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

function LocationInput({ locationName, latitude, longitude, onTrigger }) {
    return (
        <div className="border p-2 w-full flex items-center justify-between">
            <div>
                <div>{locationName || 'Pilih lokasi'}</div>
                <small className="text-gray-500 italic">
                    {latitude && longitude ? `Lat: ${latitude}, Lng: ${longitude}` : 'Lat: -, Lng: -'}
                </small>
            </div>
            <button
                type="button"
                onClick={onTrigger}
                className="ml-2 text-blue-500"
            >
                <FontAwesomeIcon icon={faMapMarkerAlt} size="lg" />
            </button>
        </div>
    );
}

export default LocationInput;