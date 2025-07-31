// src/pages/GamePage/GamePage.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './FirebaseConf/firebase';
import Navbar from './components/Navbar';
import './GamePage.css';

const API_URL = "https://goldenticket.onrender.com";

const GamePage = () => {
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('Chargement...');
  const [userCredits, setUserCredits] = useState(0);
  const [userTickets, setUserTickets] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketsPurchased, setTicketsPurchased] = useState(0);
  const [ticketsBought , setTicketsBought] = useState();
  const [assignedGrid, setAssignedGrid] = useState(null);
  const [animationNumbers, setAnimationNumbers] = useState([]);
  const [animationPhase, setAnimationPhase] = useState(0);
  const animationIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const [showDrawButton, setShowDrawButton] = useState(false);
  const [isDrawCompleted, setIsDrawCompleted] = useState(false);
  const [showResultsButton, setShowResultsButton] = useState(false);
  const [drawStatus, setDrawStatus] = useState('');
  const [winnersExist, setWinnersExist] = useState(false);

  // Récupérer le token d'authentification
  const getAuthToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }, []);

  // Charger les données du jeu depuis l'API
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/Login');
          return;
        }

        const token = await getAuthToken();
        if (!token) throw new Error('Token non disponible');

        const response = await fetch(`${API_URL}/api/game-data`, {
          
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Erreur de chargement des données');
        }

        const data = await response.json();
        
        
       
        
        
        setUserCredits(data.userCredits);
        setUserTickets(data.userTickets);
        setWinnersExist(data.winnersExist);
        setShowResultsButton(data.winnersExist);
        
        setGameData({
          prize: data.prize,
          draw: data.draw,
          stats: data.stats
        });

        // Compter les tickets pour le tirage actuel
        const currentTickets = data.userTickets.filter(ticket => 
          ticket.prizeId === data.prize?.name && 
          ticket.status === 'pending'
        );
        setTicketsPurchased(currentTickets.length);
        setTicketsBought(data.userTickets.length)

        // Configurer le compte à rebours
        if (data.draw?.date) {
          const drawDate = new Date(data.draw.date._seconds * 1000);
          startCountdown(drawDate);
          setShowDrawButton(true);
        } else {
          setCountdown('Aucun tirage programmé');
        }

        // Vérifier si le tirage est terminé
        setIsDrawCompleted(data.draw?.completed || false);

      } catch (error) {
        showNotification("Erreur de chargement des données du jeu", "error");
        console.error("Erreur de chargement:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    };
  }, [navigate, getAuthToken]);

  // Effet pour le fond animé
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const particles = [];
    const particleCount = window.innerWidth < 768 ? 30 : 100;
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
        color: `hsl(${Math.random() * 40 + 30}, 70%, 60%)`
      });
    }
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0c0c14');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      
      ctx.globalAlpha = 1.0;
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Démarrer le compte à rebours
  const startCountdown = useCallback((drawDateTime) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    const calculateCountdown = () => {
      const now = new Date();
      const diff = drawDateTime - now;
      
      if (diff <= 0) {
        setCountdown("Le tirage doit commencer!");
        setDrawStatus('in-progress');
        clearInterval(countdownIntervalRef.current);
        setShowDrawButton(true);
        
        // Après 5 secondes, afficher le bouton des résultats
        setTimeout(() => {
          setDrawStatus('completed');
          setShowResultsButton(true);
        }, 5000);
        
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${days}j ${hours}h ${minutes}m ${seconds}s`);
    };
    
    calculateCountdown();
    countdownIntervalRef.current = setInterval(calculateCountdown, 1000);
  }, []);

  // Afficher une notification
  const showNotification = useCallback((message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  }, []);

  // Navigation
  const handleViewDraw = () => navigate('/LiveDraw');
  const handleViewResults = () => navigate('/Result');
  const handleLogout = useCallback(() => auth.signOut().then(() => navigate('/')), [navigate]);

  // Acheter un ticket via l'API
  const handleBuyTicket = async () => {
    if (ticketsPurchased >= 2) {
      showNotification("Vous avez déjà acheté 2 tickets pour ce tirage", "info");
      return;
    }
    
    if (!gameData?.prize) {
      showNotification("Aucun tirage actif pour le moment", "error");
      return;
    }
    
    if (userCredits < gameData.prize.entryPoints) {
      showNotification("Crédits insuffisants pour participer", "error");
      return;
    }
    
    setShowTicketModal(true);
    setAnimationPhase(1);
    startAnimation();
    
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Token non disponible');
      
      const response = await fetch(`${API_URL}/api/buy-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entryPoints: gameData.prize.entryPoints
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'achat');
      }

      const { grid, ticketId, newCredits } = await response.json();
      
      setAssignedGrid({
        numbers: grid,
        isWinning: false
      });
      
      // Mettre à jour l'état local
      setUserCredits(newCredits);
      setTicketsPurchased(prev => prev + 1);
      
      // Ajouter le nouveau ticket
      const newTicket = {
        id: ticketId,
        numbers: grid,
        date: new Date(),
        prizeId: gameData.prize.name,
        status: 'pending',
        isWinning: false
      };
      
      setUserTickets(prev => [...prev, newTicket]);
      
      // Mettre à jour les stats
      setGameData(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalTicketsSold: prev.stats.totalTicketsSold + 1,
          totalRevenue: prev.stats.totalRevenue + gameData.prize.entryPoints,
          activePlayers: ticketsPurchased === 0 
            ? prev.stats.activePlayers + 1 
            : prev.stats.activePlayers
        }
      }));

      setTimeout(() => {
        setAnimationPhase(2);
        clearInterval(animationIntervalRef.current);
      }, 3000);
      
    } catch (error) {
      console.error("Erreur d'achat:", error);
      showNotification(error.message || "Erreur lors de l'achat du ticket", "error");
      setShowTicketModal(false);
      setAnimationPhase(0);
      clearInterval(animationIntervalRef.current);
    }
  };

  // Confirmer la participation (déplacée dans handleBuyTicket)
  const confirmParticipation = useCallback(() => {
    setShowTicketModal(false);
    setAnimationPhase(0);
    setAssignedGrid(null);
    showNotification("Participation enregistrée avec succès!", "success");
  }, [showNotification]);

  // Ajouter des crédits via l'API
  const handleAddCredits = useCallback(async (amount) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Token non disponible');
      
      const response = await fetch(`${API_URL}/api/add-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur de recharge');
      }

      const { success } = await response.json();
      if (success) {
        setUserCredits(prev => prev + amount);
        showNotification(`Recharge de ${amount} points réussie!`, "success");
      }
      
    } catch (error) {
      console.error("Erreur d'ajout de crédits:", error);
      showNotification(error.message || "Erreur lors de la recharge", "error");
    }
  }, [getAuthToken, showNotification]);

  // Fonctions d'animation
  const startAnimation = useCallback(() => {
    setAnimationNumbers(generateRandomNumbers(50, 100));
    animationIntervalRef.current = setInterval(() => {
      setAnimationNumbers(generateRandomNumbers(50, 100));
    }, 100);
  }, []);
  
  const generateRandomNumbers = useCallback((count, max) => {
    const numbers = new Set();
    while (numbers.size < count) {
      numbers.add(Math.floor(Math.random() * max) + 1);
    }
    return Array.from(numbers);
  }, []);

  // Formater la date
  const formatDate = useCallback((dateObj) => {
    if (!dateObj) return '--';
    
    try {
      // Gérer les dates Firebase Timestamp
      const date = dateObj.seconds 
        ? new Date(dateObj.seconds * 1000) 
        : new Date(dateObj);
      
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--';
    }
  }, []);

  // Afficher le statut du ticket
  const renderTicketStatus = (ticket) => {
    if (ticket.status === 'pending') {
      return <span className="status-badge pending">En attente</span>;
    }
    
    if (ticket.status === 'won') {
      return <span className="status-badge won">Gagnant</span>;
    }
    
    if (ticket.status === 'lost') {
      return <span className="status-badge lost">Perdant</span>;
    }
    
    return <span className="status-badge">Terminé</span>;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-spinner"></div>
        <p>Chargement du jeu...</p>
      </div>
    );
  }

  return (
    <div className="game-page">
      <canvas ref={canvasRef} className="background-canvas"></canvas>
      
      <Navbar 
        countdown={countdown} 
        userCredits={userCredits} 
        onLogout={handleLogout} 
        onAddCredits={handleAddCredits} 
      />
      
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="game-container">
        <div className="game-header">
          <div className="countdown-section">
            <h2>Prochain tirage</h2>
            <div className="countdown-display">
              <i className="icon">⏱️</i> 
              {drawStatus === 'in-progress' ? (
                <span className="draw-in-progress">Tirage en cours...</span>
              ) : (
                countdown
              )}
            </div>
            
            
           
            
            {drawStatus === 'in-progress' && (
              <div className="draw-progress">
                <p>Le tirage est en cours...</p>
                <div className="progress-loader">
                  <div className="loader-spinner small"></div>
                </div>
              </div>
            )}
            
            {(showResultsButton || winnersExist) && (
              <button 
                className="view-results-btn pulse"
                onClick={handleViewResults}
              >
                <i className="icon">🏆</i> Voir les résultats
              </button>
            )}
          </div>
          
          <div className="stats-section">
            <div className="stat-card">
              <div className="stat-value">{gameData?.stats?.totalTicketsSold || 0}</div>
              <div className="stat-label">Grilles vendues</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{gameData?.stats?.activePlayers || 0}</div>
              <div className="stat-label">Participants</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{gameData?.stats?.totalRevenue || 0} DA</div>
              <div className="stat-label">Cagnotte</div>
            </div>
          </div>
        </div>
        
        <div className="prize-section">
          <h2>Objet à gagner</h2>
          
          {gameData?.prize ? (
            <div className="prize-card">
              <div className="prize-image-container">
                {gameData.prize.imageUrl ? (
                  <img 
                    src={gameData.prize.imageUrl} 
                    alt={gameData.prize.name} 
                    className="prize-image" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.parentNode.innerHTML = '<div class="image-placeholder"><i class="icon">🎁</i></div>';
                    }}
                  />
                ) : (
                  <div className="image-placeholder">
                    <i className="icon">🎁</i>
                  </div>
                )}
              </div>
              <div className="prize-details">
                <h3>{gameData.prize.name}</h3>
                <p className="prize-description">{gameData.prize.description}</p>
                
                <div className="prize-stats">
                  <div className="prize-stat">
                    <span>Valeur estimée:</span>
                    <strong>{gameData.prize.value} DA</strong>
                  </div>
                  <div className="prize-stat">
                    <span>Points requis:</span>
                    <strong>{gameData.prize.entryPoints} points</strong>
                  </div>
                  <div className="prize-stat">
                    <span>Objectif:</span>
                    <strong>{gameData.prize.targetValue} DA</strong>
                  </div>
                </div>
                
                <div className="progress-container">
                  <div className="progress-label">
                    Progression: {Math.round((gameData.stats.totalRevenue / gameData.prize.targetValue) * 100)}%
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min((gameData.stats.totalRevenue / gameData.prize.targetValue) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-prize">
              <div className="icon">⚠️</div>
              <h3>Aucun objet à gagner actuellement</h3>
              <p>Un nouveau tirage sera bientôt annoncé</p>
            </div>
          )}
        </div>
        
        <div className="ticket-purchase-section">
          <div className="purchase-info">
            <h3>Participer au tirage</h3>
            <p>Sélectionnez vos numéros pour tenter de gagner</p>
            <div className="ticket-limit">
              <span>Tickets achetés: {ticketsBought}/2</span>
            </div>
          </div>
          
          <button 
            className="buy-ticket-btn"
            onClick={handleBuyTicket}
            disabled={ticketsPurchased >= 2 || !gameData?.prize || isDrawCompleted || drawStatus === 'in-progress' || ticketsBought >= 2}
          >
            Acheter un ticket ({gameData?.prize?.entryPoints || '--'} points)
          </button>
        </div>
        
        <div className="history-section">
          <h2>Mes participations</h2>
          
          {userTickets.length > 0 ? (
            <div className="tickets-list">
              {userTickets.slice(0, 5).map(ticket => {
                // Convertir les dates Firebase si nécessaire
                const ticketDate = ticket.date?.seconds 
                  ? new Date(ticket.date.seconds * 1000) 
                  : ticket.date;
                
                return (
                  <div key={ticket.id} className="ticket-card">
                    <div className="ticket-header">
                      
                      <span className="ticket-prize">{ticket.prizeId}</span>
                      
                    </div>
                    <div className="ticket-numbers">
                      {ticket.numbers.sort((a, b) => a - b).map(num => (
                        <span key={num} className="ticket-number">{num}</span>
                      ))}
                    </div>
                    <div className="ticket-status">
                      {renderTicketStatus(ticket)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-tickets">
              <p>Vous n'avez pas encore participé à un tirage</p>
              <button className="action-btn" onClick={handleBuyTicket}>
                Acheter un ticket
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showTicketModal && (
        <div className="ticket-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{animationPhase === 2 ? "Votre grille attribuée" : "Attribution en cours..."}</h3>
              <button className="close-btn" onClick={() => {
                setShowTicketModal(false);
                setAnimationPhase(0);
                clearInterval(animationIntervalRef.current);
              }}>
                &times;
              </button>
            </div>
            
            <div className="grid-animation-container">
              {animationPhase === 1 && (
                <div className="animation-grid">
                  {animationNumbers.slice(0, 50).map((num, index) => (
                    <div key={index} className="animation-number">{num}</div>
                  ))}
                </div>
              )}
              
              {animationPhase === 2 && assignedGrid && (
                <>
                  <div className="final-grid">
                    {assignedGrid.numbers.map((num, index) => (
                      <div key={index} className="final-number">{num}</div>
                    ))}
                  </div>
                  <div className="grid-info">
                    <p>Cette grille vous a été attribuée aléatoirement</p>
                    <p className="info-text">
                      Le statut gagnant sera révélé après le tirage
                    </p>
                    <button 
                      className="confirm-btn"
                      onClick={confirmParticipation}
                    >
                      Confirmer la participation
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;