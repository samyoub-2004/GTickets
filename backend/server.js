require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Vérification des variables d'environnement
if (!process.env.FIREBASE_PROJECT_ID || 
    !process.env.FIREBASE_CLIENT_EMAIL || 
    !process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error("Les variables Firebase sont manquantes dans .env");
}

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));

// Configuration Firebase
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

// Route test Firebase
app.get('/test-firebase', async (req, res) => {
  try {
    const docRef = db.collection('test').doc('connection');
    await docRef.set({ timestamp: new Date() });
    res.send('Connexion Firebase OK!');
  } catch (error) {
    res.status(500).send('Erreur Firebase: ' + error.message);
  }
});

// Récupérer les données du jeu
app.get('/api/game-data', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const [prizeDoc, userDoc, statsDoc, drawSnapshot] = await Promise.all([
      db.collection('settings').doc('prize_object').get(),
      db.collection('users').doc(userId).get(),
      db.collection('stats').doc('currentStats').get(),
      db.collection('draws').where('status', '==', 'scheduled').get()
    ]);

    const userTicketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .get();

    const responseData = {
      prize: prizeDoc.exists ? prizeDoc.data() : null,
      userCredits: userDoc.exists ? userDoc.data().credits || 0 : 0,
      stats: statsDoc.exists ? statsDoc.data() : { totalTicketsSold: 0, totalRevenue: 0 },
      userTickets: userTicketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        purchaseDate: doc.data().purchaseDate.toDate().toISOString()
      })),
      nextDraw: null
    };

    if (!drawSnapshot.empty) {
      const drawData = drawSnapshot.docs[0].data();
      responseData.nextDraw = {
        id: drawSnapshot.docs[0].id,
        ...drawData,
        scheduledAt: drawData.scheduledAt.toDate().toISOString()
      };
    }

    res.json(responseData);
  } catch (error) {
    console.error('Erreur de récupération des données:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Acheter un ticket
app.post('/api/purchase-ticket', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { selectedNumbers, prize } = req.body;
    const MAX_TICKETS_PER_USER = 2;
    
    // Vérifier les tickets en attente
    const pendingTickets = await db.collection('tickets')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();
      
    if (pendingTickets.size >= MAX_TICKETS_PER_USER) {
      return res.status(400).json({ error: `Limite de ${MAX_TICKETS_PER_USER} tickets atteinte` });
    }
    
    // Vérifier les crédits
    const userDoc = await db.collection('users').doc(userId).get();
    const userCredits = userDoc.data().credits || 0;
    
    if (userCredits < prize.entryPoints) {
      return res.status(400).json({ error: 'Crédits insuffisants' });
    }
    
    // Transaction
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const statsRef = db.collection('stats').doc('currentStats');
      
      // Mise à jour des crédits
      transaction.update(userRef, {
        credits: admin.firestore.FieldValue.increment(-prize.entryPoints)
      });
      
      // Mise à jour des stats
      transaction.update(statsRef, {
        totalTicketsSold: admin.firestore.FieldValue.increment(1),
        totalRevenue: admin.firestore.FieldValue.increment(prize.entryPoints)
      });
      
      // Création du ticket
      const ticketData = {
        numbers: selectedNumbers,
        userId,
        userName: req.user.name || 'Utilisateur',
        drawId: "current",
        status: "pending",
        purchaseDate: new Date(),
        entryPoints: prize.entryPoints
      };
      
      transaction.set(db.collection('tickets').doc(), ticketData);
    });
    
    res.json({ 
      success: true,
      newCredits: userCredits - prize.entryPoints
    });
    
  } catch (error) {
    console.error('Erreur d\'achat de ticket:', error);
    res.status(500).json({ error: 'Erreur lors de l\'achat' });
  }
});




// Ajouter des crédits
app.post('/api/add-credits', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { amount } = req.body;
    
    await db.collection('users').doc(userId).update({
      credits: admin.firestore.FieldValue.increment(amount)
    });
    
    const userDoc = await db.collection('users').doc(userId).get();
    const newCredits = userDoc.data().credits;
    
    res.json({ success: true, newCredits });
  } catch (error) {
    console.error('Erreur d\'ajout de crédits:', error);
    res.status(500).json({ error: 'Erreur lors de la recharge' });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en écoute sur http://localhost:${PORT}`);
  console.log(`Testez Firebase sur http://localhost:${PORT}/test-firebase`);
});