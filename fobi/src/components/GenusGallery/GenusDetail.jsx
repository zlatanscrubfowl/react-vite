import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    Tabs,
    Tab,
    Box,
    Paper,
    ImageList,
    ImageListItem,
    Button
} from '@mui/material';
import { extractAuthorFromScientificName } from '../../utils/speciesUtils';
import DistributionMap from '../SpeciesDetail/DistributionMap';

const GenusDetail = () => {
    const { taxaId } = useParams();
    const [genusData, setGenusData] = useState(null);
    const [similarGenera, setSimilarGenera] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGenusData();
        fetchSimilarGenera();
    }, [taxaId]);

    const fetchGenusData = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/genus-gallery/detail/${taxaId}`);
            setGenusData(response.data.data);
        } catch (error) {
            console.error('Error fetching genus data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSimilarGenera = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/genus-gallery/${taxaId}/similar`);
            setSimilarGenera(response.data.data);
        } catch (error) {
            console.error('Error fetching similar genera:', error);
        }
    };

    if (loading || !genusData) return <div>Loading...</div>;

    const { genus, media, locations, species } = genusData;
    const { name: scientificNameWithoutAuthor, author } = extractAuthorFromScientificName(genus.scientific_name);

    return (
        <Box sx={{ p: 3, mt: 5 }}>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            {genus.genus}
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'text.secondary' }} gutterBottom>
                            {genus.cname_genus}
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            Family: {genus.family}
                        </Typography>
                        {genus.description && (
                            <Typography variant="body1" gutterBottom>
                                Deskripsi: {genus.description}
                            </Typography>
                        )}
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <ImageList cols={2} gap={8}>
                            {media.map((item, index) => (
                                <ImageListItem key={`media-${item.id}`}>
                                    <img
                                        src={`https://api.talinara.com/storage/${item.file_path}`}
                                        alt={`Observation ${index + 1}`}
                                        loading="lazy"
                                    />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    </Grid>
                </Grid>
            </Paper>

            <Paper elevation={3}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Species dalam Genus Ini" />
                    <Tab label="Genus Mirip" />
                    <Tab label="Peta Sebaran" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tabValue === 0 && (
                        <Grid container spacing={2}>
                            {species.map((sp) => (
                                <Grid item xs={12} sm={6} md={4} key={`species-${sp.taxa_id}`}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" component="div">
                                                {sp.species}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                                {sp.family}
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                sx={{ mt: 2 }}
                                                onClick={() => window.open(`/species/${sp.taxa_id}`, '_blank')}
                                            >
                                                Lihat Species
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {tabValue === 1 && (
                        <Grid container spacing={2}>
                            {similarGenera.map((gen) => (
                                <Grid item xs={12} sm={6} md={4} key={`similar-${gen.taxa_id}`}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" component="div">
                                                {gen.genus}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'text.secondary' }} gutterBottom>
                                                {gen.cname_genus}
                                            </Typography>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                sx={{ mt: 2 }}
                                                onClick={() => window.open(`/genus/${gen.taxa_id}`, '_blank')}
                                            >
                                                Lihat Genus Ini
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {tabValue === 2 && <DistributionMap taxaId={taxaId} />}
                </Box>
            </Paper>
        </Box>
    );
};

export default GenusDetail;
