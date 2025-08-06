// src/pages/LiveDrawPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../FirebaseConf/firebase';
import { collection, query, where, doc, getDoc, onSnapshot } from 'firebase/firestore';
import './LiveDrawPage.css';

const LiveDrawPage = () => {
  const navigate = useNavigate();
  const [currentDraw, setCurrentDraw] = useState(null);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [prizeObject, setPrizeObject] = useState(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Charger le tirage actuel et l'objet à gagner en temps réel
  useEffect(() => {
    const drawsQuery = query(collection(db, 'draws'), where('status', 'in', ['scheduled', 'live', 'result']));
    
    const unsubscribe = onSnapshot(drawsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const drawDoc = snapshot.docs[0];
        const drawData = {
          id: drawDoc.id,
          ...drawDoc.data(),
          scheduledAt: drawDoc.data().scheduledAt?.toDate?.() || drawDoc.data().scheduledAt,
          completedAt: drawDoc.data().completedAt?.toDate?.() || drawDoc.data().completedAt
        };
        
        // Réinitialiser l'animation si le statut change
        if (currentDraw?.status !== drawData.status && drawData.status === 'live') {
          setDrawnNumbers([]);
          setAnimationComplete(false);
        }
        
        setCurrentDraw(drawData);
        setIsLive(drawData.status === 'live');
      } else {
        setCurrentDraw(null);
      }
      setLoading(false);
    });

    // Charger l'objet à gagner
    const loadPrizeObject = async () => {
      try {
        const objectSnap = await getDoc(doc(db, 'settings', 'prize_object'));
        if (objectSnap.exists()) {
          setPrizeObject(objectSnap.data());
        }
      } catch (error) {
        console.error("Erreur de chargement de l'objet:", error);
      }
    };
    
    loadPrizeObject();

    return () => unsubscribe();
  }, []);

  // Gérer le compte à rebours pour les tirages programmés
  useEffect(() => {
    let interval;
    if (currentDraw && currentDraw.status === 'scheduled') {
      interval = setInterval(() => {
        const now = new Date();
        const diff = currentDraw.scheduledAt - now;
        
        if (diff <= 0) {
          clearInterval(interval);
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setTimeLeft({ days, hours, minutes, seconds });
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [currentDraw]);

  // Animation des numéros pour les tirages en direct
  useEffect(() => {
    let interval;
    if (isLive && currentDraw?.winningNumbers && !animationComplete) {
      let currentIndex = 0;
      
      interval = setInterval(() => {
        if (currentIndex < currentDraw.winningNumbers.length) {
          setDrawnNumbers(prev => [...prev, currentDraw.winningNumbers[currentIndex]]);
          currentIndex++;
        } else {
          clearInterval(interval);
          setAnimationComplete(true);
        }
      }, 1500);
    }
    
    return () => clearInterval(interval);
  }, [isLive, currentDraw, animationComplete]);

  // Formater la date
  const formaterDate = (date) => {
    if (!date) return '--';
    try {
      const dateObj = date instanceof Date ? date : date.toDate();
      return dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '--';
    }
  };

  // Naviguer vers la page des tirages
  const allerTirages = () => {
    navigate('/draws');
  };

  // Rendu des numéros avec animation
  const afficherNumeros = () => {
    if (!currentDraw?.winningNumbers) return null;
    
    return (
      <div className="loto-numeros-conteneur">
        {currentDraw.winningNumbers.map((num, index) => (
          <div 
            key={index}
            className={`loto-boule ${drawnNumbers.includes(num) ? 'tiree' : ''}`}
          >
            {drawnNumbers.includes(num) ? num : '?'}
          </div>
        ))}
      </div>
    );
  };

  // Rendu des gagnants
  const afficherGagnants = () => {
    if (!currentDraw?.winners || currentDraw.winners.length === 0) {
      return <p className="loto-aucun-gagnant">Aucun gagnant pour ce tirage</p>;
    }
    
    // Grouper les gagnants par catégorie
    const gagnantsParCategorie = {
      5: currentDraw.winners.filter(w => w.matchedNumbers === 5),
      4: currentDraw.winners.filter(w => w.matchedNumbers === 4),
      3: currentDraw.winners.filter(w => w.matchedNumbers === 3)
    };
    
    return (
      <div className="loto-gagnants-conteneur">
        <h3>Gagnants</h3>
        
        <div className="loto-categories">
          {[5, 4, 3].map(categorie => (
            gagnantsParCategorie[categorie]?.length > 0 && (
              <div key={categorie} className="loto-categorie">
                <h4>{categorie} numéros</h4>
                <div className="loto-liste-gagnants">
                  {gagnantsParCategorie[categorie].map((gagnant, idx) => (
                    <div key={idx} className="loto-carte-gagnant">
                      <div className="loto-avatar-gagnant">
                        {gagnant.userName?.charAt(0) || 'U'}
                      </div>
                      <div className="loto-info-gagnant">
                        <p className="loto-nom-gagnant">{gagnant.userName || 'Anonyme'}</p>
                        <p className="loto-gain-gagnant">Gain: {Math.floor(currentDraw.prizeDistribution.prizePool[categorie] / gagnantsParCategorie[categorie].length)} da</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    );
  };

  // Aucun tirage en cours
  if (loading) {
    return (
      <div className="loto-page-direct">
        <div className="loto-chargement-overlay">
          <div className="loto-chargement-spinner"></div>
        </div>
      </div>
    );
  }

  if (!currentDraw) {
    return (
      <div className="loto-page-direct">
        <div className="loto-aucun-conteneur">
          <div className="loto-aucun-contenu">
            <h2>Aucun tirage en cours</h2>
            <p>Revenez plus tard pour participer au prochain tirage!</p>
            <button className="loto-bouton-primaire" onClick={allerTirages}>
              Voir les tirages passés
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loto-page-direct">
      {/* En-tête */}
      <header className="loto-entete">
        <div className="loto-contenu-entete">
          <h1>Tirage en Direct</h1>
          <p className="loto-date-tirage">{formaterDate(currentDraw.scheduledAt)}</p>
        </div>
      </header>

      {/* Objet à gagner */}
      {prizeObject && (
        <div className="loto-objet-conteneur">
          <h2>Objet à gagner</h2>
          <div className="loto-carte-objet">
            <div className="loto-image-objet">
              {prizeObject.imageUrl ? (
                <img 
                  src={prizeObject.imageUrl} 
                  alt={prizeObject.name} 
                  onError={(e) => e.target.parentNode.innerHTML = '<div class="loto-placeholder-image"><i class="loto-icone">🎁</i></div>'} 
                />
              ) : (
                <div className="loto-placeholder-image">
                  <i className="loto-icone">🎁</i>
                </div>
              )}
            </div>
            <div className="loto-details-objet">
              <h3>{prizeObject.name}</h3>
              <p className="loto-description-objet">{prizeObject.description}</p>
              <div className="loto-valeur-objet">
                Valeur: {prizeObject.value} da
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal selon l'état du tirage */}
      <main className="loto-contenu-principal">
        {/* Tirage programmé - Compte à rebours */}
        {currentDraw.status === 'scheduled' && (
          <div className="loto-conteneur-programme">
            <h2>Prochain tirage dans</h2>
            <div className="loto-compte-a-rebours">
              <div className="loto-element-rebours">
                <span className="loto-valeur-rebours">{timeLeft.days}</span>
                <span className="loto-label-rebours">Jours</span>
              </div>
              <div className="loto-element-rebours">
                <span className="loto-valeur-rebours">{timeLeft.hours}</span>
                <span className="loto-label-rebours">Heures</span>
              </div>
              <div className="loto-element-rebours">
                <span className="loto-valeur-rebours">{timeLeft.minutes}</span>
                <span className="loto-label-rebours">Minutes</span>
              </div>
              <div className="loto-element-rebours">
                <span className="loto-valeur-rebours">{timeLeft.seconds}</span>
                <span className="loto-label-rebours">Secondes</span>
              </div>
            </div>
            <p className="loto-note-rebours">
              Revenez à l'heure du tirage pour voir les numéros sortir en direct!
            </p>
          </div>
        )}

        {/* Tirage en direct - Animation des numéros */}
        {isLive && (
          <div className="loto-conteneur-direct">
            <div className="loto-indicateur-direct">
              <div className="loto-pulsation-direct"></div>
              <span>EN DIRECT</span>
            </div>
            
            <h2>Numéros Gagnants</h2>
            
            {afficherNumeros()}
            
            {!animationComplete && (
              <div className="loto-en-cours">
                <div className="loto-spinner"></div>
                <p>Tirage en cours...</p>
              </div>
            )}
            
            {animationComplete && (
              <div className="loto-tirage-termine">
                <p className="loto-message-succes">Tous les numéros ont été tirés!</p>
              </div>
            )}
          </div>
        )}

        {/* Résultats du tirage */}
        {currentDraw.status === 'result' && (
          <div className="loto-conteneur-resultats">
            <h2>Résultats du Tirage</h2>
            
            <div className="loto-numeros-gagnants">
              <h3>Numéros Gagnants</h3>
              <div className="loto-numeros-finaux">
                {currentDraw.winningNumbers.map((num, index) => (
                  <div key={index} className="loto-numero-final">{num}</div>
                ))}
              </div>
            </div>
            
            {afficherGagnants()}
            
            <div className="loto-resume-gains">
              <h3>Répartition des Gains</h3>
              <div className="loto-grille-resume">
                <div className="loto-element-resume">
                  <span>Total des gains</span>
                  <strong>{currentDraw.prizeDistribution?.totalRevenue?.toFixed(2) || '0.00'} da</strong>
                </div>
                <div className="loto-element-resume">
                  <span>Distribué aux joueurs</span>
                  <strong>{currentDraw.prizeDistribution?.distributed?.toFixed(2) || '0.00'} da</strong>
                </div>
               
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pied de page */}
      <footer className="loto-pied-page">
        <button className="loto-bouton-secondaire" onClick={allerTirages}>
          Voir tous les tirages
        </button>
      </footer>
    </div>
  );
};

export default LiveDrawPage;