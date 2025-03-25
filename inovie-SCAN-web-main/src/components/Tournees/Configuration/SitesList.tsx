import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography, InputAdornment, Paper } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SiteItem from './SiteItem';
import { Site } from '../../../types/tournees.types';

interface SitesListProps {
    sites: Site[];
    selectedSites: Set<string>;
    onAddSite: (site: Site) => void;
    title?: string;
}

const SitesList: React.FC<SitesListProps> = ({
    sites = [],
    selectedSites = new Set(),
    onAddSite,
    title = "Sites disponibles"
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredSites, setFilteredSites] = useState<Site[]>(sites);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredSites(sites || []);
            return;
        }

        const lowerCaseSearch = searchTerm.toLowerCase().trim();
        const filtered = sites.filter(site => {
            // Vérifier que le site et ses propriétés existent
            if (!site) return false;
            
            return (
                (site.nom && site.nom.toLowerCase().includes(lowerCaseSearch)) ||
                (site.adresse && site.adresse.toLowerCase().includes(lowerCaseSearch)) ||
                (site.ville && site.ville.toLowerCase().includes(lowerCaseSearch)) ||
                (site.codePostal && site.codePostal.includes(lowerCaseSearch))
            );
        });
        setFilteredSites(filtered);
    }, [searchTerm, sites]);

    return (
        <Paper
            elevation={2}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                p: 2
            }}
        >
            <Typography variant="h6" gutterBottom>
                {title}
            </Typography>

            <TextField
                placeholder="Rechercher un site..."
                variant="outlined"
                size="small"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                sx={{ mb: 2 }}
            />

            <Box
                sx={{
                    overflow: 'auto',
                    flexGrow: 1
                }}
            >
                {filteredSites && filteredSites.length > 0 ? (
                    filteredSites.map(site => (
                        <SiteItem
                            key={site.id}
                            site={site}
                            onAdd={() => onAddSite(site)}
                            inTour={selectedSites.has(site.id)}
                        />
                    ))
                ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                        Aucun site ne correspond à votre recherche.
                    </Typography>
                )}
            </Box>
        </Paper>
    );
};

export default SitesList;