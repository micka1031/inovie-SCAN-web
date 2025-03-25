/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialiser l'application Firebase Admin
admin.initializeApp();

// Fonction pour supprimer complètement un utilisateur (v1)
exports.deleteUserCompletely = functions.https.onCall(async (data, context) => {
  const { userId, userEmail } = data;
  
  if (!userId || !userEmail) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId et userEmail sont requis'
    );
  }

  try {
    console.log(`🔄 Tentative de suppression de l'utilisateur: ${userEmail} (ID Firestore: ${userId})`);
    
    try {
      // Rechercher l'utilisateur dans Firebase Auth par email
      const userRecord = await admin.auth().getUserByEmail(userEmail);
      
      // Supprimer l'utilisateur de Firebase Auth
      await admin.auth().deleteUser(userRecord.uid);
      console.log(`✅ Utilisateur supprimé de Firebase Auth: ${userEmail} (UID: ${userRecord.uid})`);
    } catch (authError) {
      // Si l'utilisateur n'existe pas dans Firebase Auth, on continue quand même
      if (authError.code === 'auth/user-not-found') {
        console.warn(`⚠️ Utilisateur non trouvé dans Firebase Auth: ${userEmail}`);
      } else {
        console.error(`❌ Erreur lors de la suppression de l'utilisateur dans Firebase Auth:`, authError);
        throw new functions.https.HttpsError(
          'internal',
          `Erreur lors de la suppression dans Firebase Auth: ${authError.message}`
        );
      }
    }
    
    try {
      // Supprimer l'utilisateur de Firestore
      await admin.firestore().collection('users').doc(userId).delete();
      console.log(`✅ Document Firestore supprimé: ${userId}`);
    } catch (firestoreError) {
      console.error(`❌ Erreur lors de la suppression du document Firestore:`, firestoreError);
      throw new functions.https.HttpsError(
        'internal',
        `Erreur lors de la suppression dans Firestore: ${firestoreError.message}`
      );
    }
    
    return { success: true, message: "Utilisateur supprimé avec succès" };
  } catch (error) {
    console.error("❌ Erreur globale lors de la suppression de l'utilisateur:", error);
    throw new functions.https.HttpsError(
      'internal',
      `Erreur lors de la suppression: ${error.message}`
    );
  }
});

// Fonction pour supprimer plusieurs utilisateurs en une seule fois
exports.deleteMultipleUsers = functions.https.onCall(async (data, context) => {
  const { users } = data;
  
  if (!users || !Array.isArray(users) || users.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Un tableau d\'utilisateurs est requis'
    );
  }

  console.log(`🔄 Tentative de suppression de ${users.length} utilisateurs`);
  
  const results = {
    success: [],
    errors: []
  };

  // Traiter chaque utilisateur
  for (const user of users) {
    const { userId, userEmail } = user;
    
    if (!userId || !userEmail) {
      results.errors.push({
        userId,
        userEmail,
        error: 'userId et userEmail sont requis pour chaque utilisateur'
      });
      continue;
    }
    
    try {
      // Supprimer l'utilisateur de Firebase Auth
      try {
        const userRecord = await admin.auth().getUserByEmail(userEmail);
        await admin.auth().deleteUser(userRecord.uid);
        console.log(`✅ Utilisateur supprimé de Firebase Auth: ${userEmail} (UID: ${userRecord.uid})`);
      } catch (authError) {
        if (authError.code === 'auth/user-not-found') {
          console.warn(`⚠️ Utilisateur non trouvé dans Firebase Auth: ${userEmail}`);
        } else {
          console.error(`❌ Erreur lors de la suppression de l'utilisateur dans Firebase Auth:`, authError);
          results.errors.push({
            userId,
            userEmail,
            error: `Erreur Firebase Auth: ${authError.message}`
          });
          continue;
        }
      }
      
      // Supprimer l'utilisateur de Firestore
      try {
        await admin.firestore().collection('users').doc(userId).delete();
        console.log(`✅ Document Firestore supprimé: ${userId}`);
      } catch (firestoreError) {
        console.error(`❌ Erreur lors de la suppression du document Firestore:`, firestoreError);
        results.errors.push({
          userId,
          userEmail,
          error: `Erreur Firestore: ${firestoreError.message}`
        });
        continue;
      }
      
      // Ajouter à la liste des succès
      results.success.push({
        userId,
        userEmail,
        message: "Utilisateur supprimé avec succès"
      });
      
    } catch (error) {
      console.error(`❌ Erreur globale lors de la suppression de l'utilisateur ${userEmail}:`, error);
      results.errors.push({
        userId,
        userEmail,
        error: error.message
      });
    }
  }
  
  console.log(`✅ Suppression terminée: ${results.success.length} succès, ${results.errors.length} erreurs`);
  
  return {
    totalProcessed: users.length,
    successCount: results.success.length,
    errorCount: results.errors.length,
    success: results.success,
    errors: results.errors
  };
});
