import React from 'react';
import { Card, CardContent, Typography, IconButton, Box, Tooltip } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { Site } from '../../../types/tournees.types';

interface SiteItemProps {
    site: Site;
    inTour?: boolean;
    order?: number;
    onAdd?: () => void;
    onRemove?: () => void;
}

const SiteItem: React.FC<SiteItemProps> = ({
                                               site,
                                               inTour = false,
                                               order,
                                               onAdd,
                                               onRemove
                                           }) => {
    return (
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
                                onClick={onAdd}
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
    );
};

export default SiteItem;