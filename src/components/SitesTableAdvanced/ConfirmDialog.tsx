import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';
import {
  Warning as WarningIcon
} from '@mui/icons-material';

// Props pour le composant ConfirmDialog
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  content,
  confirmText = 'Confirmer',
  cancelText = 'Annuler'
}) => {
  // Fonction pour gérer la confirmation
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="confirm-dialog"
    >
      <DialogTitle className="confirm-dialog-title">
        <div className="title-with-icon">
          <WarningIcon color="warning" />
          <Typography variant="h6">{title}</Typography>
        </div>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body1">{content}</Typography>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {cancelText}
        </Button>
        <Button 
          onClick={handleConfirm} 
          color="error" 
          variant="contained"
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog; 