const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialiser l'application avec les privilèges admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function deleteUserByEmail(email) {
  try {
    // Rechercher l'utilisateur par email
    const userRecord = await admin.auth().getUserByEmail(email);
    
    // Supprimer l'utilisateur
    await admin.auth().deleteUser(userRecord.uid);
    console.log('Utilisateur supprimé avec succès:', email);
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
  }
}

// Si l'email est passé en argument
const userEmail = process.argv[2];
if (userEmail) {
  deleteUserByEmail(userEmail).then(() => process.exit());
} else {
  console.log('Usage: node deleteUser.js <email>');
  process.exit(1);
}
