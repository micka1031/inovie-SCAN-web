const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialiser l'application avec les privilèges admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function checkAndUpdateAdminRole(identifier) {
  try {
    // Obtenir la référence à Firestore
    const db = admin.firestore();
    
    // Rechercher l'utilisateur par identifiant
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('identifiant', '==', identifier).get();

    if (snapshot.empty) {
      console.log('Aucun utilisateur trouvé avec cet identifiant');
      
      // Créer l'utilisateur admin s'il n'existe pas
      const adminData = {
        identifiant: identifier,
        nom: 'Administrateur',
        role: 'Administrateur',
        pole: 'Administration',
        statut: 'actif',
        email: 'admin@inovie.fr',
        createdAt: new Date().toISOString()
      };

      await db.collection('users').doc('admin').set(adminData);
      console.log('Utilisateur admin créé avec succès');
      return;
    }

    // Obtenir le premier document correspondant
    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    console.log('Données actuelles de l\'utilisateur:', userData);

    // Mettre à jour le rôle en Administrateur si ce n'est pas déjà le cas
    if (userData.role !== 'Administrateur') {
      await userDoc.ref.update({
        role: 'Administrateur'
      });
      console.log('Rôle mis à jour en Administrateur');
    } else {
      console.log('L\'utilisateur est déjà Administrateur');
    }
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    process.exit();
  }
}

// Si l'identifiant est passé en argument
const userId = process.argv[2];
if (userId) {
  checkAndUpdateAdminRole(userId);
} else {
  console.log('Usage: node checkAdminRole.js <identifiant>');
  process.exit(1);
}
