import React, { useState } from 'react';
import { Card, CardContent, Typography, IconButton, Box, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, InputAdornment } from '@mui/material';
import { Add, Delete, Timer } from '@mui/icons-material';
import { Site } from '../../../types/tournees.types';

interface SiteItemProps {
    site: Site;
    inTour?: boolean;
    order?: number;
    onAdd?: (site: Site, dureeArret: number) => void;
    onRemove?: () => void;
}

const SiteItem: React.FC<SiteItemProps> = ({
    site,
    inTour = false,
    order,
    onAdd,
    onRemove
}) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dureeArret, setDureeArret] = useState(5); // Durée d'arrêt par défaut: 5 minutes

    const handleOpenDialog = () => {
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleAddSite = () => {
        if (onAdd) {
            onAdd(site, dureeArret);
        }
        handleCloseDialog();
    };

    return (
        <>
            <Card
                sx={{
                    mb: 1,
                    position: 'relative',
                    borderLeft: inTour ? `4px solid #1976d2` : 'none',
                    '&:hover': {
                        boxShadow: 3
                    }
                }}
            >
                {inTour && order && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: -12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bgcolor: '#1976d2',
                            color: 'white',
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                        }}
                    >
                        {order}
                    </Box>
                )}

                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                            <Typography variant="subtitle1" component="div" fontWeight="bold">
                                {site.nom}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {site.adresse}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {site.codePostal} {site.ville}
                            </Typography>
                        </Box>

                        <Box>
                            <Tooltip title={inTour ? "Ajouter à nouveau" : "Ajouter à la tournée"}>
                                <IconButton
                                    color="primary"
                                    size="small"
                                    onClick={handleOpenDialog}
                                    sx={{ 
                                        ...(inTour && {
                                            bgcolor: 'rgba(25, 118, 210, 0.1)', 
                                            '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.2)' }
                                        })
                                    }}
                                >
                                    <Add />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Dialogue pour configurer la durée d'arrêt */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
                <DialogTitle>
                    Ajouter {site.nom} à la tournée
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 1, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Configurez la durée d'arrêt pour ce site
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                            <Timer sx={{ mr: 1, color: 'text.secondary' }} />
                            <TextField
                                label="Durée d'arrêt"
                                type="number"
                                value={dureeArret}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value) && value > 0) {
                                        setDureeArret(value);
                                    }
                                }}
                                fullWidth
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">minutes</InputAdornment>,
                                }}
                                inputProps={{ min: 1, max: 120 }}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Annuler</Button>
                    <Button onClick={handleAddSite} variant="contained">Ajouter</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default SiteItem;