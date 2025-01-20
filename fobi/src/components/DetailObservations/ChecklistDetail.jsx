import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import Pusher from 'pusher-js';
import MediaViewer from './MediaViewer';
import ChecklistMap from './ChecklistMap';
import QualityAssessment from './QualityAssessment';
import TabPanel from './TabPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faFlag, faTimes } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../../utils/api';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TreeView from 'react-treeview';
import "react-treeview/react-treeview.css";

// Fungsi helper untuk menentukan source dan membersihkan ID
const getSourceAndCleanId = (id) => {
    // Cek parameter source dari URL terlebih dahulu
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');

    if (!id) {
        return { source: 'fobi', cleanId: '' };
    }

    const idString = String(id);

    // Jika ada source parameter, gunakan itu
    if (sourceParam) {
        // Tetap bersihkan ID jika ada prefix
        const cleanId = idString.replace(/^(BN|KP)/, '');
        return { source: sourceParam, cleanId };
    }

    // Jika tidak ada source parameter, tentukan dari prefix ID
    if (idString.startsWith('BN')) {
        return { source: 'burungnesia', cleanId: idString.substring(2) };
    }
    if (idString.startsWith('KP')) {
        return { source: 'kupunesia', cleanId: idString.substring(2) };
    }

    // Default case untuk FOBI
    return { source: 'fobi', cleanId: idString };
};

// Fungsi helper untuk membersihkan nama ilmiah dari author
const cleanScientificName = (name) => {
    if (!name) return '';
    // Menghapus author yang biasanya muncul setelah spasi dan diikuti tahun dalam kurung
    return name.split(' ').filter(part => {
        // Memeriksa apakah bagian mengandung angka (tahun) atau dalam kurung
        return !(/\d/.test(part) || /[\(\)]/.test(part));
    }).join(' ');
};

// Pindahkan FlagModal ke komponen terpisah di luar komponen utama
const FlagModal = React.memo(({
    showFlagModal,
    setShowFlagModal,
    flagForm,
    setFlagForm,
    handleFlagSubmit,
    isSubmittingFlag
}) => (
    <Transition appear show={showFlagModal} as={Fragment}>
        <Dialog
            as="div"
            className="relative z-[9999]"
            onClose={() => setShowFlagModal(false)}
        >
            <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                    >
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                                <span>Tandai Masalah</span>
                                <button
                                    onClick={() => setShowFlagModal(false)}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </button>
                            </Dialog.Title>

                            <form onSubmit={handleFlagSubmit} className="mt-4">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Jenis Masalah
                                    </label>
                                    <select
                                        value={flagForm.flag_type}
                                        onChange={(e) => setFlagForm(prev => ({...prev, flag_type: e.target.value}))}
                                        className="w-full p-2 border rounded"
                                        required
                                    >
                                        <option value="">Pilih jenis masalah</option>
                                        <option value="identification">Masalah Identifikasi</option>
                                        <option value="location">Masalah Lokasi</option>
                                        <option value="media">Masalah Media</option>
                                        <option value="date">Masalah Tanggal</option>
                                        <option value="other">Lainnya</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Alasan
                                    </label>
                                    <textarea
                                        value={flagForm.reason}
                                        onChange={(e) => setFlagForm(prev => ({...prev, reason: e.target.value}))}
                                        className="w-full p-2 border rounded"
                                        rows="4"
                                        required
                                        placeholder="Jelaskan masalah yang Anda temukan..."
                                    />
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSubmittingFlag}
                                        className="inline-flex justify-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                    >
                                        {isSubmittingFlag ? 'Mengirim...' : 'Kirim Flag'}
                                    </button>
                                </div>
                            </form>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </div>
        </Dialog>
    </Transition>
));

const TaxonomyTree = ({ checklist }) => {
    const taxonomyData = [
        {
            label: `Kingdom: ${checklist?.kingdom || '-'}`,
            children: [
                {
                    label: `Phylum: ${checklist?.phylum || '-'}`,
                    children: [
                        {
                            label: `Class: ${checklist?.class || '-'}`,
                            children: [
                                {
                                    label: `Order: ${checklist?.order || '-'}`,
                                    children: [
                                        {
                                            label: `Family: ${checklist?.family || '-'}`,
                                            children: [
                                                {
                                                    label: (
                                                        <span className="font-medium">
                                                            Genus:{' '}
                                                            {checklist?.genus && checklist?.taxa_id ? (
                                                                <Link
                                                                    to={`/genus/${checklist.taxa_id}`}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    {checklist.genus}
                                                                </Link>
                                                            ) : (
                                                                checklist?.genus || 'Tidak tersedia'
                                                            )}
                                                        </span>
                                                    ),
                                                    children: [
                                                        {
                                                            label: (
                                                                <span className="italic">
                                                                    Species:{' '}
                                                                    {checklist?.species && checklist?.taxa_id ? (
                                                                        <Link
                                                                            to={`/species/${checklist.taxa_id}`}
                                                                            className="text-blue-600 hover:text-blue-800"
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                        >
                                                                            {checklist.species}
                                                                        </Link>
                                                                    ) : (
                                                                        checklist?.species || 'Tidak tersedia'
                                                                    )}
                                                                </span>
                                                            ),
                                                            isItalic: true
                                                        },
                                                        checklist?.subspecies ? {
                                                            label: (
                                                                <span className="italic">
                                                                    Subspecies:{' '}
                                                                    {cleanScientificName(checklist?.subspecies)}
                                                                </span>
                                                            ),
                                                            isItalic: true
                                                        } : null
                                                    ].filter(Boolean)
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ];

    const renderNode = (node) => {
        if (node.children) {
            return (
                <TreeView
                    key={node.label}
                    nodeLabel={
                        <span className="font-medium">{node.label}</span>
                    }
                    defaultCollapsed={false}
                >
                    {node.children.map(child => renderNode(child))}
                </TreeView>
            );
        }
        return (
            <div
                key={node.label}
                className={`py-1 pl-6 ${node.isItalic ? 'italic' : ''}`}
            >
                {node.label}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Detail Taksonomi</h2>
            <div className="taxonomy-tree">
                {taxonomyData.map(node => renderNode(node))}
            </div>
        </div>
    );
};

function ChecklistDetail({ id: propId, isModal = false, onClose = null }) {
    const { id: paramId } = useParams();
    const id = isModal ? propId : paramId;
    const { source, cleanId } = getSourceAndCleanId(id);
    const queryClient = useQueryClient();

    // Queries
    const {
        data: checklistData,
        isLoading: isLoadingChecklist
    } = useQuery({
        queryKey: ['checklist', cleanId, source],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${cleanId}?source=${source}`);
            return response.json();
        }
    });

    const {
        data: commentsData,
        isLoading: isLoadingComments
    } = useQuery({
        queryKey: ['comments', id],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${id}/comments`);
            return response.json();
        }
    });

    const {
        data: flagsData,
        isLoading: isLoadingFlags
    } = useQuery({
        queryKey: ['flags', id],
        queryFn: async () => {
            const response = await apiFetch(`/observations/${id}/flags`);
            return response.json();
        }
    });

    // Mutations
    const addIdentificationMutation = useMutation({
        mutationFn: async (formData) => {
            const response = await apiFetch(`/observations/${id}/identifications?source=${source}`, {
                method: 'POST',
                body: formData
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id]);
        }
    });

    const addCommentMutation = useMutation({
        mutationFn: async (comment) => {
            const response = await apiFetch(`/observations/${id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ comment })
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['comments', id]);
            setNewComment('');
        }
    });

    const agreeWithIdentificationMutation = useMutation({
        mutationFn: async (identificationId) => {
            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/agree?source=${source}`,
                { method: 'POST' }
            );
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id]);
        }
    });

    const withdrawIdentificationMutation = useMutation({
        mutationFn: async (identificationId) => {
            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/withdraw?source=${source}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fauna_id: checklist?.fauna_id,
                        identification_id: identificationId
                    })
                }
            );
            if (!response.ok) {
                throw new Error('Gagal menarik identifikasi');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['checklist', id, source]);
        },
        onError: (error) => {
            console.error('Error withdrawing identification:', error);
            alert('Gagal menarik identifikasi. Silakan coba lagi.');
        }
    });

    // State declarations
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [checklist, setChecklist] = useState(null);
    const [identifications, setIdentifications] = useState([]);
    const [locationVerifications, setLocationVerifications] = useState([]);
    const [wildStatusVotes, setWildStatusVotes] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedTaxon, setSelectedTaxon] = useState(null);
    const [identificationForm, setIdentificationForm] = useState({
        taxon_id: '',
        identification_level: 'species',
        comment: ''
    });
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [qualityAssessment, setQualityAssessment] = useState({
        has_date: false,
        has_location: false,
        has_media: false,
        is_wild: true,
        location_accurate: true,
        recent_evidence: true,
        related_evidence: true,
        community_id_level: '',
        can_be_improved: null
    });
    const [activeTab, setActiveTab] = useState('identification');
    const [activeIndex, setActiveIndex] = useState(0);
    const swiperRef = useRef(null);
    const [spectrogramSwiper, setSpectrogramSwiper] = useState(null);
    const [activeAudioIndex, setActiveAudioIndex] = useState(0);
    const audioRefs = useRef([]);
    const progressRefs = useRef([]);
    const spectrogramSwipers = useRef([]);
    const [locationName, setLocationName] = useState('Memuat lokasi...');
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagForm, setFlagForm] = useState({
        flag_type: '',
        reason: ''
    });
    const [flags, setFlags] = useState([]);
    const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
    const [media, setMedia] = useState({ images: [], sounds: [] });

    const { user } = useUser();

    // Update state dari data query
    useEffect(() => {
        if (checklistData?.success) {
            console.log('Identifications data:', checklistData.data.identifications);
            setIdentifications(checklistData.data.identifications || []);
            setChecklist(checklistData.data.checklist);
            setMedia(checklistData.data.media || { images: [], sounds: [] });
            if (checklistData.data.quality_assessment) {
                setQualityAssessment(checklistData.data.quality_assessment);
            }
        }
    }, [checklistData]);

    useEffect(() => {
        if (commentsData?.success) {
            setComments(commentsData.data);
        }
    }, [commentsData]);

    useEffect(() => {
        if (flagsData?.success) {
            setFlags(flagsData.data);
        }
    }, [flagsData]);

    // Separate effect for Pusher
    useEffect(() => {
        if (!id) return;

        const pusher = new Pusher('2d50c7dd083d072bcc27', {
            cluster: 'ap1',
        });

        const channel = pusher.subscribe('checklist');

        channel.bind('CommentAdded', function(data) {
            setComments(prev => [...prev, data.comment]);
        });

        channel.bind('QualityAssessmentUpdated', function(data) {
            setQualityAssessment(data.assessment);
        });

        channel.bind('IdentificationUpdated', function(data) {
            setIdentifications(prev => prev.map(ident =>
                ident.id === data.identificationId ?
                { ...ident, agreement_count: data.agreementCount, user_agreed: data.userAgreed } :
                ident
            ));
        });

        return () => {
            channel.unbind_all();
            channel.unsubscribe();
        };
    }, [id]);

    const searchTaxa = async (query) => {
        if (query.length < 3) return;

        try {
            const response = await apiFetch(`/taxa/search?q=${query}&source=${source}`);

            const data = await response.json();
            if (data.success) {
                setSearchResults(data.data);
            } else {
                setSearchResults([]);
                console.error('Search failed:', data.message);
            }
        } catch (error) {
            console.error('Error searching taxa:', error);
            setSearchResults([]);
        }
    };

    const handleIdentificationSubmit = async (e, photo) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('taxon_id', selectedTaxon.id);
        formData.append('identification_level', selectedTaxon.taxon_rank);
        if (identificationForm.comment) {
            formData.append('comment', identificationForm.comment);
        }
        if (photo) {
            formData.append('photo', photo);
        }

        await addIdentificationMutation.mutateAsync(formData);
    };

    const handleLocationVerify = async (isAccurate, comment = '') => {
        try {
            const response = await apiFetch(`/observations/${id}/verify-location`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_accurate: isAccurate, comment })
            });

            if (response.ok) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error verifying location:', error);
        }
    };

    const handleWildStatusVote = async (isWild, comment = '') => {
        try {
            const response = await apiFetch(`/observations/${id}/vote-wild`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_wild: isWild, comment })
            });

            if (response.ok) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error voting wild status:', error);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await apiFetch(`/observations/${id}/comments`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setComments(data.data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const addComment = async (e) => {
        e.preventDefault();
        await addCommentMutation.mutateAsync(newComment);
    };
    const rateChecklist = async (grade) => {
        try {
            const response = await apiFetch(`/observations/${id}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ grade })
            });

            const data = await response.json();
            if (data.success) {
                fetchChecklistDetail();
            }
        } catch (error) {
            console.error('Error rating checklist:', error);
        }
    };

    const fetchQualityAssessment = async () => {
        try {
            // Tunggu sampai checklist data tersedia
            if (!checklist) return;

            const response = await apiFetch(`/observations/${id}/quality-assessment?source=${source}`);

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(data.data);
            }
        } catch (error) {
            console.error('Error fetching quality assessment:', error);
            // Set default values jika terjadi error
            setQualityAssessment({
                grade: 'casual',
                has_media: false,
                has_location: false,
                has_date: false,
                is_wild: true,
                location_accurate: true,
                recent_evidence: true,
                related_evidence: true,
                community_id_level: '',
                can_be_improved: null
            });
        }
    };

    const handleQualityAssessmentChange = async (criteria, value) => {
        try {
            setQualityAssessment(prev => ({
                ...prev,
                [criteria]: value
            }));

            const response = await apiFetch(`/observations/${id}/quality-assessment/${criteria}?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({ value })
            });

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(prev => ({
                    ...prev,
                    ...data.data.assessment
                }));

                setChecklist(prev => ({
                    ...prev,
                    quality_grade: data.data.grade
                }));
            } else {
                setQualityAssessment(prev => ({
                    ...prev,
                    [criteria]: !value
                }));
            }
        } catch (error) {
            setQualityAssessment(prev => ({
                ...prev,
                [criteria]: !value
            }));
            console.error('Error updating quality assessment:', error);
        }
    };

    const handleImprovementChange = async (canImprove) => {
        try {
            const response = await apiFetch(`/observations/${id}/improvement-status?source=${source}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify({
                    can_be_improved: canImprove
                })
            });

            const data = await response.json();
            if (data.success) {
                setQualityAssessment(prev => ({
                    ...prev,
                    can_be_improved: canImprove
                }));
                fetchQualityAssessment();
            }
        } catch (error) {
            console.error('Error updating improvement status:', error);
        }
    };

    const handleAgreeWithIdentification = async (identificationId) => {
        try {
            const result = await agreeWithIdentificationMutation.mutateAsync(identificationId);

            // Update state lokal
            setIdentifications(prevIdentifications =>
                prevIdentifications.map(ident => {
                    if (ident.id === identificationId) {
                        return {
                            ...ident,
                            agreement_count: Number(ident.agreement_count || 0) + 1,
                            user_agreed: true
                        };
                    }
                    return ident;
                })
            );
        } catch (error) {
            console.error('Error agreeing with identification:', error);
        }
    };

    const getLocationName = async (latitude, longitude) => {
        try {
            const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
            );
            const data = await response.json();
        
        // Format location name consistently
        const address = data.address;
        const parts = [];
        
        if (address.city || address.town || address.municipality) {
            parts.push(address.city || address.town || address.municipality);
        }
        if (address.county || address.regency) {
            parts.push(address.county || address.regency);
        }
        if (address.state) parts.push(address.state);
        if (address.country) parts.push(address.country);

        return parts.join(', ') || 'Lokasi tidak ditemukan';
    } catch (error) {
        console.error('Error fetching location name:', error);
        return 'Gagal memuat nama lokasi';
    }
    };

    useEffect(() => {
        if (checklist?.latitude && checklist?.longitude) {
            getLocationName(checklist.latitude, checklist.longitude)
                .then(name => setLocationName(name));
        }
    }, [checklist]);
    const handleWithdrawIdentification = async (identificationId) => {
        if (!checklist?.fauna_id) {
            console.error('fauna_id tidak ditemukan');
            alert('Data tidak lengkap untuk menarik identifikasi');
            return;
        }

        try {
            await withdrawIdentificationMutation.mutateAsync(identificationId);

            // Update state lokal
            setIdentifications(prevIdentifications =>
                prevIdentifications.map(ident => {
                    if (ident.id === identificationId) {
                        return {
                            ...ident,
                            is_withdrawn: true,
                            agreement_count: 0 // Reset agreement count saat ditarik
                        };
                    }
                    if (ident.agrees_with_id === identificationId) {
                        return null;
                    }
                    return ident;
                }).filter(Boolean)
            );
        } catch (error) {
            console.error('Error withdrawing identification:', error);
        }
    };
        const handleCancelAgreement = async (identificationId) => {
        try {
            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/cancel-agreement?source=${source}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to cancel agreement');
            }

            const data = await response.json();

            if (data.success) {
                setIdentifications(prevIdentifications => {
                    return prevIdentifications.map(ident => {
                        if (ident.id === identificationId) {
                            const newCount = Math.max(0, Number(ident.agreement_count || 0) - 1);
                            return {
                                ...ident,
                                agreement_count: newCount > 0 ? newCount : null, // Set null jika count = 0
                                user_agreed: false
                            };
                        }
                        return ident;
                    });
                });

                // Refresh data menggunakan React Query untuk memastikan konsistensi
                await queryClient.invalidateQueries(['checklist', cleanId, source]);
            }
        } catch (error) {
            console.error('Error canceling agreement:', error);
        }
    };

    const handleDisagreeWithIdentification = async (identificationId, comment) => {
        try {
            const formData = new FormData();
            formData.append('comment', comment || '');
            if (selectedTaxon) {
                formData.append('taxon_id', selectedTaxon.id);
                formData.append('identification_level', selectedTaxon.taxon_rank);
            }

            const response = await apiFetch(
                `/observations/${id}/identifications/${identificationId}/disagree?source=${source}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                    },
                    body: formData
                }
            );

            const data = await response.json();

            if (data.success) {
                setIdentifications(prevIdentifications => [
                    ...prevIdentifications,
                    {
                        ...data.data.identification,
                        user_disagreed: true,
                        agrees_with_id: null,
                        agreement_count: 0
                    }
                ]);

                // Refresh data menggunakan React Query
                await queryClient.invalidateQueries(['checklist', cleanId, source]);
                await queryClient.invalidateQueries(['comments', id]);
            }
        } catch (error) {
            console.error('Error disagreeing with identification:', error);
        }
    };

    // Fungsi untuk mengambil data flag
    const fetchFlags = async () => {
        try {
            const response = await apiFetch(`/observations/${id}/flags`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setFlags(data.data);
            }
        } catch (error) {
            console.error('Error fetching flags:', error);
        }
    };

    // Fungsi untuk submit flag
    const handleFlagSubmit = async (e) => {
        e.preventDefault();
        setIsSubmittingFlag(true);

        try {
            const response = await apiFetch(`/observations/${id}/flag`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flagForm)
            });

            const data = await response.json();
            if (data.success) {
                setShowFlagModal(false);
                setFlagForm({ flag_type: '', reason: '' });
                fetchFlags();

                // Notifikasi sukses
                alert('Laporan berhasil dikirim. Tim kami akan segera meninjau laporan Anda.');
            } else {
                // Handle specific error messages
                if (data.message?.includes('sudah melaporkan')) {
                    alert('Anda sudah melaporkan checklist ini sebelumnya. Laporan Anda sedang dalam proses');
                } else {
                    alert(data.message || 'Gagal mengirim laporan. Silakan coba lagi nanti.');
                }
            }
        } catch (error) {
            // Handle different types of errors
            if (error.message?.includes('sudah melaporkan')) {
                alert('Anda sudah melaporkan checklist ini sebelumnya. Laporan Anda sedang dalam proses peninjauan.');
            } else {
                alert('Terjadi kesalahan saat mengirim laporan. Silakan coba lagi nanti.');
            }
            console.error('Error submitting flag:', error);
        } finally {
            setIsSubmittingFlag(false);
        }
    };

    // Fungsi untuk resolve flag (untuk admin/moderator)
    const handleResolveFlag = async (flagId, resolutionNotes) => {
        try {
            const response = await apiFetch(`/observations/flags/${flagId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolution_notes: resolutionNotes })
            });

            const data = await response.json();
            if (data.success) {
                fetchFlags(); // Refresh flags
                alert('Flag berhasil diselesaikan');
            } else {
                alert(data.message || 'Gagal menyelesaikan flag');
            }
        } catch (error) {
            console.error('Error resolving flag:', error);
            alert('Terjadi kesalahan saat menyelesaikan flag');
        }
    };

    useEffect(() => {
        if (id) {
            fetchFlags();
        }
    }, [id]);

    useEffect(() => {
        if (checklist) {
            fetchQualityAssessment();
        }
    }, [checklist, id]);

    if (isLoadingChecklist || isLoadingComments || isLoadingFlags) {
        return (
            <div className={`flex items-center justify-center ${isModal ? 'h-96' : 'min-h-screen'}`}>
                <div className="text-lg text-gray-600">Memuat...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className={`${isModal ? '' : 'container mx-auto mt-10'} px-4 py-8`}>
            {isModal && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold mb-2">
                            {(checklist?.genus || checklist?.species) ? (
                                <Link
                                    to={checklist?.species ?
                                        `/species/${checklist?.taxa_id}` :
                                        `/genus/${checklist?.taxa_id}`}
                                    className="hover:text-blue-600"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span className="block">
                                        {checklist?.vernacular_name ||
                                         checklist?.common_name ||
                                         cleanScientificName(checklist?.species) ||
                                         checklist?.genus ||
                                         'Nama tidak tersedia'}
                                    </span>
                                    <i className="text-sm text-gray-500 block">
                                        {checklist?.family ||
                                        cleanScientificName(checklist?.scientific_name) ||
                                         cleanScientificName(checklist?.species) ||
                                         checklist?.genus ||
                                         'Nama ilmiah tidak tersedia'}
                                    </i>
                                </Link>
                            ) : (
                                <>
                                    <span className="block">
                                        {checklist?.vernacular_name ||
                                         checklist?.common_name ||
                                         checklist?.family ||
                                         checklist?.kingdom ||
                                         'Nama tidak tersedia'}
                                    </span>
                                    <i className="text-sm text-gray-500 block">
                                        {checklist?.family ||
                                         checklist?.kingdom ||
                                         'Nama ilmiah tidak tersedia'}
                                    </i>
                                    <span className="text-sm text-orange-500 block mt-1">
                                        Detail hanya tersedia untuk level Genus dan Species
                                    </span>
                                </>
                            )}
                        </h1>
                        <div className="text-gray-600 space-y-1">
                            <div>
                                Observer: {checklist?.observer ? (
                                    <Link
                                        to={`/profile/${checklist.fobi_user_id || checklist.user_id}`}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        {checklist.observer}
                                    </Link>
                                ) : 'Pengamat tidak diketahui'}
                            </div>
                            <div>
                                Diobservasi: {checklist?.observation_date ?
                                    new Date(checklist.observation_date).toLocaleDateString('id-ID', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : 'Tanggal tidak tersedia'}
                            </div>
                            <div>
                                Diupload: {checklist?.created_at ?
                                    new Date(checklist.created_at).toLocaleDateString('id-ID', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : 'Tanggal tidak tersedia'}
                            </div>
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold
                        ${checklist?.grade === 'research grade' ? 'bg-green-100 text-green-800' :
                          checklist?.grade === 'needs ID' ? 'bg-yellow-100 text-yellow-800' :
                          checklist?.grade === 'low quality ID' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {checklist?.grade === 'research grade' ? 'ID Lengkap' :
                         checklist?.grade === 'needs ID' ? 'Bantu Iden' :
                         checklist?.grade === 'low quality ID' ? 'ID Kurang' :
                         'Casual'}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Media</h2>
                        <MediaViewer checklist={checklist} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold mb-4">Peta Sebaran</h2>
                        <ChecklistMap checklist={checklist} />
                        <div className="text-sm text-gray-500 mt-10 text-center">
                            <p><FontAwesomeIcon icon={faMapMarkerAlt} className="text-red-500" /> {locationName}</p>
                        </div>
                    </div>
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
<TabPanel
    id={id}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    comments={comments}
    setComments={setComments}
    identifications={identifications}
    setIdentifications={setIdentifications}
    newComment={newComment}
    setNewComment={setNewComment}
    addComment={addComment}
    handleIdentificationSubmit={handleIdentificationSubmit}
    searchTaxa={searchTaxa}
    searchResults={searchResults}
    selectedTaxon={selectedTaxon}
    setSelectedTaxon={setSelectedTaxon}
    identificationForm={identificationForm}
    setIdentificationForm={setIdentificationForm}
    handleLocationVerify={handleLocationVerify}
    handleWildStatusVote={handleWildStatusVote}
    locationVerifications={locationVerifications}
    wildStatusVotes={wildStatusVotes}
    handleAgreeWithIdentification={handleAgreeWithIdentification}
    handleWithdrawIdentification={handleWithdrawIdentification}
    handleCancelAgreement={handleCancelAgreement}
    handleDisagreeWithIdentification={handleDisagreeWithIdentification}
    user={user}
    checklist={checklist}
/>
<button
                        onClick={() => setShowFlagModal(true)}
                        className="inline-flex items-center px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                    >
                        <FontAwesomeIcon icon={faFlag} className="mr-2" />
                        Tandai Masalah
                    </button>

                </div>

                <div className="space-y-6">
                    <TaxonomyTree checklist={checklist} />
                </div>

            </div>


            <QualityAssessment
                checklist={checklist}
                qualityAssessment={qualityAssessment}
                identifications={identifications}
                handleQualityAssessmentChange={handleQualityAssessmentChange}
                handleImprovementChange={handleImprovementChange}
            />

            {/* Render modal */}
            <FlagModal
                showFlagModal={showFlagModal}
                setShowFlagModal={setShowFlagModal}
                flagForm={flagForm}
                setFlagForm={setFlagForm}
                handleFlagSubmit={handleFlagSubmit}
                isSubmittingFlag={isSubmittingFlag}
            />
        </div>
    );
}

export default ChecklistDetail;
