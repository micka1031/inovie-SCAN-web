import React, { useState, useEffect, useMemo } from 'react';
import { Box, TextField, Typography, InputAdornment, Paper, CircularProgress, Badge } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SiteItem from './SiteItem';
import { Site } from '../../../types/tournees.types';

interface SitesListProps {
    sites: Site[];
    selectedSites: Set<string>;
    onAddSite: (site: Site, dureeArret?: number) => void;
    title?: string;
}

const ITEMS_PER_PAGE = 10;

const SitesList: React.FC<SitesListProps> = ({
    sites = [],
    selectedSites = new Set(),
    onAddSite,
    title = "Sites disponibles"
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
    const [loading, setLoading] = useState(false);

    // Filtrer les sites avec useMemo pour éviter des calculs inutiles
    const filteredSites = useMemo(() => {
        if (!searchTerm.trim()) {
            return sites || [];
        }

        const lowerCaseSearch = searchTerm.toLowerCase().trim();
        return sites.filter(site => {
            // Vérifier que le site et ses propriétés existent
            if (!site) return false;
            
            return (
                (site.nom && site.nom.toLowerCase().includes(lowerCaseSearch)) ||
                (site.adresse && site.adresse.toLowerCase().includes(lowerCaseSearch)) ||
                (site.ville && site.ville.toLowerCase().includes(lowerCaseSearch)) ||
                (site.codePostal && site.codePostal.includes(lowerCaseSearch))
            );
        });
    }, [searchTerm, sites]);

    // Observer pour le défilement infini
    const observerRef = React.useRef<IntersectionObserver | null>(null);
    const lastItemRef = React.useCallback(
        (node: HTMLDivElement | null) => {
            if (loading) return;
            if (observerRef.current) observerRef.current.disconnect();
            
            observerRef.current = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting && displayCount < filteredSites.length) {
                    setLoading(true);
                    // Simuler une latence pour réduire le blocage du thread principal
                    setTimeout(() => {
                        setDisplayCount(prev => Math.min(prev + ITEMS_PER_PAGE, filteredSites.length));
                        setLoading(false);
                    }, 100);
                }
            });
            
            if (node) observerRef.current.observe(node);
        },
        [filteredSites.length, displayCount, loading]
    );

    // Réinitialiser l'affichage quand la recherche change
    useEffect(() => {
        setDisplayCount(ITEMS_PER_PAGE);
    }, [searchTerm]);

    // Récupérer les sites à afficher actuellement
    const sitesToDisplay = useMemo(() => {
        return filteredSites.slice(0, displayCount);
    }, [filteredSites, displayCount]);

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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">
                    {title}
                </Typography>
                
                <Badge 
                    badgeContent={selectedSites.size} 
                    color="primary"
                    showZero={false}
                    sx={{ 
                        '& .MuiBadge-badge': { 
                            fontSize: '0.75rem',
                            height: '20px',
                            minWidth: '20px'
                        } 
                    }}
                >
                    <Typography variant="caption" color="text.secondary">
                        Sites sélectionnés
                    </Typography>
                </Badge>
            </Box>

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
                id="sites-scrollbox"
            >
                {filteredSites.length > 0 ? (
                    <>
                        {sitesToDisplay.map((site, index) => (
                            <div
                                key={site.id}
                                ref={index === sitesToDisplay.length - 1 ? lastItemRef : undefined}
                            >
                                <SiteItem
                                    site={site}
                                    onAdd={(site, dureeArret) => onAddSite(site, dureeArret)}
                                    inTour={selectedSites.has(site.id)}
                                />
                            </div>
                        ))}
                        {loading && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                                <CircularProgress size={24} />
                            </Box>
                        )}
                    </>
                ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                        Aucun site ne correspond à votre recherche.
                    </Typography>
                )}
                <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
                    Affichage de {sitesToDisplay.length} sur {filteredSites.length} sites
                </Typography>
            </Box>
        </Paper>
    );
};

export default SitesList;