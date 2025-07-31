// 1. Importations
require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Vérification des variables d'environnement obligatoires
if (!process.env.FIREBASE_PROJECT_ID || 
    !process.env.FIREBASE_CLIENT_EMAIL || 
    !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error("Les variables Firebase sont manquantes dans .env");
}

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Configuration Firebase sécurisée via variables d'environnement
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
  });
  console.log('Firebase Admin initialisé avec succès');
} catch (error) {
  console.error('Erreur lors de l\'initialisation de Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();

// Middleware d'authentification
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Erreur de vérification du token:', error);
    res.status(401).json({ error: 'Token invalide' });
  }
};

// Routes pour la page de jeu
// 1. Récupérer les données du jeu
app.get('/api/game-data', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Récupérer les données utilisateur
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // Objet à gagner
    const prizeDoc = await db.collection('settings').doc('prize_object').get();
    const prizeData = prizeDoc.exists ? prizeDoc.data() : null;
    
    // Prochain tirage
    const drawDoc = await db.collection('settings').doc('next_draw').get();
    const drawData = drawDoc.exists ? drawDoc.data() : null;
    
    // Statistiques
    const statsDoc = await db.collection('stats').doc('overview').get();
    const statsData = statsDoc.exists ? statsDoc.data() : {};
    
    // Tickets de l'utilisateur
    const ticketsSnapshot = await db.collection('users').doc(userId).collection('tickets').get();
    const ticketsData = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate()
    }));
    
    // Vérifier les gagnants
    const winnersSnapshot = await db.collection('winners').get();
    const winnersExist = !winnersSnapshot.empty;
    
    res.json({
      userCredits: userData?.credits || 0,
      userTickets: ticketsData,
      prize: prizeData,
      draw: drawData,
      stats: statsData,
      winnersExist
    });
    
  } catch (error) {
    console.error('Erreur récupération données jeu:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 2. Acheter un ticket
app.post('/api/buy-ticket', authenticate, async (req, res) => {
  try {
    
    const userId = req.user.uid;
    const { entryPoints } = req.body;
    
    // Vérifier si l'utilisateur a déjà 2 tickets
    const userTicketsRef = db.collection('users').doc(userId).collection('tickets');
    const userTickets = await userTicketsRef.get();
    
    if (userTickets.size >= 2) {
      return res.status(400).json({ error: 'Vous avez déjà acheté le maximum de 2 tickets' });
    }
    
    // Vérifier les crédits
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const credits = userDoc.data().credits || 0;
    
    if (credits < entryPoints) {
      return res.status(400).json({ error: 'Crédits insuffisants' });
    }
    
    // Trouver une grille disponible
    const gridsRef = db.collection('grids');
    const availableGrids = await gridsRef.where('isTaken', '==', false).limit(1).get();
    
    if (availableGrids.empty) {
      return res.status(400).json({ error: 'Plus de grilles disponibles' });
    }
    
    const gridDoc = availableGrids.docs[0];
    const gridData = gridDoc.data();
    
    // Mettre à jour la grille
    await gridDoc.ref.update({
      isTaken: true,
      takenBy: userId,
      takenAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Créer le ticket
    const ticketRef = await userRef.collection('tickets').add({
      numbers: gridData.numbers,
      date: admin.firestore.FieldValue.serverTimestamp(),
      prizeId: req.user.name,
      status: 'pending',
      isWinning: gridData.isWinning
    });
    
    // Mettre à jour les crédits
    await userRef.update({
      credits: admin.firestore.FieldValue.increment(-entryPoints)
    });
    
    // Mettre à jour les stats
    const statsRef = db.collection('stats').doc('overview');
    await statsRef.set({
      totalTicketsSold: admin.firestore.FieldValue.increment(1),
      totalRevenue: admin.firestore.FieldValue.increment(entryPoints),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    res.json({
      success: true,
      ticketId: ticketRef.id,
      grid: gridData.numbers,
      newCredits: credits - entryPoints
    });
    
  } catch (error) {
    console.error('Erreur achat ticket:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});
// 3. Ajouter des crédits
app.post('/api/add-credits', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { amount } = req.body;
    
    await db.collection('users').doc(userId).update({
      credits: admin.firestore.FieldValue.increment(amount)
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Erreur ajout crédits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// 4. Route test Firebase
app.get('/test-firebase', async (req, res) => {
  try {
    const docRef = db.collection('test').doc('connection');
    await docRef.set({ timestamp: new Date() });
    res.send('Connexion Firebase OK!');
  } catch (error) {
    res.status(500).send('Erreur Firebase: ' + error.message);
  }
});

// 5. Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
  console.log(`Testez Firebase sur http://localhost:${PORT}/test-firebase`);
});