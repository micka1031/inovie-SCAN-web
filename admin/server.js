const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const serviceAccount = require('./serviceAccountKey.json');

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

// Route pour supprimer un utilisateur
app.post('/deleteUser', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  try {
    // Rechercher l'utilisateur par email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Supprimer l'utilisateur
    await admin.auth().deleteUser(userRecord.uid);
    
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Serveur d'administration en cours d'exécution sur le port ${PORT}`);
});
