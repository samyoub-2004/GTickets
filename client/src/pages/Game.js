import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './FirebaseConf/firebase';
import Navbar from './components/Navbar';
import './GamePage.css';

const GamePage = () => {
  const navigate = useNavigate();
  const [prize, setPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userCredits, setUserCredits] = useState(0);
  const [userTickets, setUserTickets] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const canvasRef = useRef(null);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [stats, setStats] = useState({ totalTicketsSold: 0, totalRevenue: 0 });
  const [nextDraw, setNextDraw] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Constantes du jeu
  const MAX_SELECTABLE = 5;
  const MAX_TICKETS_PER_USER = 2;
  const NUMBER_RANGE = 50;

  const API_URL = "https://gtickets.onrender.com";

  // Récupérer les données depuis le serveur
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/Login');
          return;
        }

        // Récupérer le token ID
        const idToken = await user.getIdToken();
        
        const response = await fetch(`${API_URL}/api/game-data`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Erreur de chargement des données');
        }

        const data = await response.json();
        
        setPrize(data.prize);
        setUserCredits(data.userCredits);
        setStats(data.stats);
        setNextDraw(data.nextDraw);
        
        // Convertir les dates
        const ticketsWithDates = data.userTickets.map(ticket => ({
          ...ticket,
          purchaseDate: new Date(ticket.purchaseDate)
        }));
        
        setUserTickets(ticketsWithDates.sort((a, b) => 
          b.purchaseDate - a.purchaseDate
        ));

      } catch (error) {
        showNotification("Erreur de chargement des données: " + error.message, "error");
        console.error("Erreur de chargement:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Mettre à jour le compte à rebours
  useEffect(() => {
    if (!nextDraw) return;
    
    const calculateCountdown = () => {
      const now = new Date();
      const drawDate = new Date(nextDraw.scheduledAt);
      const diff = drawDate - now;
      
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({ days, hours, minutes, seconds });
    };
    
    calculateCountdown();
    const intervalId = setInterval(calculateCountdown, 1000);
    
    return () => clearInterval(intervalId);
  }, [nextDraw]);

  // Effet pour le fond animé
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const particles = [];
    const particleCount = Math.min(Math.floor(window.innerWidth * window.innerHeight / 5000), 150);
    
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
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Afficher une notification
  const showNotification = useCallback((message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  }, []);

  // Gérer la sélection des numéros
  const handleNumberSelect = useCallback((number) => {
    setSelectedNumbers(prev => {
      if (prev.includes(number)) {
        return prev.filter(n => n !== number);
      } else if (prev.length < MAX_SELECTABLE) {
        return [...prev, number];
      }
      return prev;
    });
  }, [MAX_SELECTABLE]);

  // Générer des numéros aléatoires
  const generateRandomNumbers = useCallback(() => {
    const numbers = [];
    while (numbers.length < MAX_SELECTABLE) {
      const randomNum = Math.floor(Math.random() * NUMBER_RANGE) + 1;
      if (!numbers.includes(randomNum)) {
        numbers.push(randomNum);
      }
    }
    setSelectedNumbers(numbers.sort((a, b) => a - b));
  }, [MAX_SELECTABLE, NUMBER_RANGE]);

  // Acheter un ticket
  const handlePurchaseTicket = async () => {
    if (!prize ) {
      showNotification("Aucun tirage en cours", "error");
      return;
    }

    // Vérifier la limite de tickets
    const pendingTickets = userTickets.filter(t => t.status === 'pending');
    if (pendingTickets.length >= MAX_TICKETS_PER_USER) {
      showNotification(`Limite atteinte: ${MAX_TICKETS_PER_USER} tickets maximum!`, "error");
      return;
    }

    if (selectedNumbers.length !== MAX_SELECTABLE) {
      showNotification(`Sélectionnez ${MAX_SELECTABLE} numéros`, "error");
      return;
    }

    if (userCredits < prize.entryPoints) {
      showNotification(`Crédits insuffisants`, "error");
      return;
    }

    setIsPurchasing(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Session expirée");
      }

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/purchase-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          selectedNumbers,
          prize,
          
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur d'achat");
      }

      const result = await response.json();
      
      // Mettre à jour l'état local
      setUserCredits(result.newCredits);
      
      const newTicket = {
        id: `temp-${Date.now()}`,
        numbers: [...selectedNumbers].sort((a, b) => a - b),
        userId: user.uid,
        status: "pending",
        purchaseDate: new Date(),
        entryPoints: prize.entryPoints
      };
      
      setUserTickets(prev => [newTicket, ...prev]);
      setStats(prev => ({
        totalTicketsSold: prev.totalTicketsSold + 1,
        totalRevenue: prev.totalRevenue + prize.entryPoints
      }));
      setSelectedNumbers([]);
      
      showNotification("Ticket acheté avec succès!", "success");
      
    } catch (error) {
      showNotification(error.message || "Erreur lors de l'achat", "error");
    } finally {
      setIsPurchasing(false);
    }
  };

  // Générer la grille de numéros
  const renderNumberGrid = useCallback(() => {
    return Array.from({ length: NUMBER_RANGE }, (_, i) => i + 1).map(num => (
      <button
        key={num}
        className={`number-btn ${selectedNumbers.includes(num) ? 'selected' : ''}`}
        onClick={() => handleNumberSelect(num)}
        disabled={selectedNumbers.length >= MAX_SELECTABLE && !selectedNumbers.includes(num)}
      >
        {num}
      </button>
    ));
  }, [NUMBER_RANGE, selectedNumbers, handleNumberSelect, MAX_SELECTABLE]);

  // Navigation
  const handleLogout = useCallback(() => auth.signOut().then(() => navigate('/')), [navigate]);

  // Ajouter des crédits
  const handleAddCredits = useCallback(async (amount) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const idToken = await user.getIdToken();
      
      const response = await fetch(`${API_URL}/api/add-credits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur de recharge");
      }

      const result = await response.json();
      setUserCredits(result.newCredits);
      showNotification(`Recharge de ${amount} points réussie!`, "success");
      
    } catch (error) {
      showNotification(error.message || "Erreur lors de la recharge", "error");
    }
  }, [showNotification]);

  // Formater les dates
  const formatDate = useCallback((date) => {
    if (!date) return 'Date inconnue';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Date invalide';
    }
  }, []);

  // Vérifier et naviguer vers le tirage
  const handleCheckDraw = useCallback(() => {
    if (!nextDraw || !nextDraw.id) {
      showNotification("Aucun tirage en cours", "error");
      return;
    }
    navigate(`/LiveDraw`);
  }, [navigate, nextDraw, showNotification]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-spinner"></div>
        <p>Chargement du jeu...</p>
      </div>
    );
  }

  // Calculs dérivés
  const progressPercentage = prize 
    ? Math.min((stats.totalRevenue / prize.targetValue) * 100, 100)
    : 0;

  const pendingTicketsCount = userTickets.filter(t => t.status === 'pending').length;
  const canPurchase = !isPurchasing && 
                      selectedNumbers.length === MAX_SELECTABLE && 
                      pendingTicketsCount < MAX_TICKETS_PER_USER &&
                      userCredits >= (prize?.entryPoints || 0);

  return (
    <div className="game-page">
      <canvas ref={canvasRef} className="background-canvas"></canvas>
      
      <Navbar 
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
        {/* Section des statistiques */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-value">{stats.totalTicketsSold}</div>
            <div className="stat-label">Grilles vendues</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalRevenue} DA</div>
            <div className="stat-label">Cagnotte</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{pendingTicketsCount}/{MAX_TICKETS_PER_USER}</div>
            <div className="stat-label">Vos tickets</div>
          </div>
          
          {/* Compte à rebours */}
          {nextDraw && (
            <div className="stat-card countdown-card">
              <div className="countdown-value">
                <div className="countdown-unit">
                  <span>{countdown.days}</span>
                  <small>Jours</small>
                </div>
                <div className="countdown-unit">
                  <span>{countdown.hours.toString().padStart(2, '0')}</span>
                  <small>Heures</small>
                </div>
                <div className="countdown-unit">
                  <span>{countdown.minutes.toString().padStart(2, '0')}</span>
                  <small>Minutes</small>
                </div>
                <div className="countdown-unit">
                  <span>{countdown.seconds.toString().padStart(2, '0')}</span>
                  <small>Secondes</small>
                </div>
              </div>
              <div className="stat-label">Prochain tirage</div>
            </div>
          )}
        </div>

        <div className="prize-section">
          <h2>Objet à gagner</h2>
          
          {prize ? (
            <div className="prize-card">
              <div className="prize-image-container">
                {prize.imageUrl ? (
                  <img 
                    src={prize.imageUrl} 
                    alt={prize.name} 
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
                <h3>{prize.name}</h3>
                <p className="prize-description">{prize.description}</p>
                
                <div className="prize-stats">
                  <div className="prize-stat">
                    <span>Valeur estimée:</span>
                    <strong>{prize.value} DA</strong>
                  </div>
                  <div className="prize-stat">
                    <span>Points requis:</span>
                    <strong>{prize.entryPoints} points</strong>
                  </div>
                  <div className="prize-stat">
                    <span>Objectif:</span>
                    <strong>{prize.targetValue} DA</strong>
                  </div>
                  {nextDraw && (
                    <div className="prize-stat">
                      <span>Date du tirage:</span>
                      <strong>{formatDate(nextDraw.scheduledAt)}</strong>
                    </div>
                  )}
                </div>
                
                <div className="progress-container">
                  <div className="progress-label">
                    Progression: {Math.round(progressPercentage)}%
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Bouton pour vérifier le tirage */}
                {nextDraw && (
                  <button 
                    className="view-draw-btn random-btn"
                    onClick={handleCheckDraw}
                  >
                    Voir le tirage
                  </button>
                )}
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
        
        <div className="ticket-section">
          <h2>Choisissez vos {MAX_SELECTABLE} numéros (1-{NUMBER_RANGE})</h2>
          
          <div className="ticket-actions">
            <div className="ticket-limit-info">
              <i className="icon">🎫</i>
              <span>
                Tickets en attente: <strong>{pendingTicketsCount}/{MAX_TICKETS_PER_USER}</strong>
              </span>
            </div>
            
            <button 
              className="random-btn"
              onClick={generateRandomNumbers}
              disabled={selectedNumbers.length === MAX_SELECTABLE}
            >
              <i className="icon">🎲</i> Générer aléatoirement
            </button>
          </div>
          
          <div className="number-grid">
            {renderNumberGrid()}
          </div>
          
          <div className="selection-info">
            <p>
              <span>Numéros sélectionnés: </span>
              <strong>
                {selectedNumbers.length > 0 
                  ? selectedNumbers.sort((a, b) => a - b).join(', ') 
                  : 'Aucun'}
              </strong>
            </p>
            <p>
              <span>Coût: </span>
              <strong>{prize ? prize.entryPoints : '--'} points</strong>
            </p>
            <p>
              <span>Votre solde: </span>
              <strong>{userCredits} points</strong>
            </p>
          </div>
          
          <button
            className={`purchase-btn ${isPurchasing ? 'loading' : ''}`}
            onClick={handlePurchaseTicket}
            disabled={!canPurchase}
          >
            {isPurchasing ? (
              <>
                <div className="loader-spinner small"></div>
                Traitement...
              </>
            ) : (
              `Acheter le ticket (${prize ? prize.entryPoints : '--'} points)`
            )}
          </button>
          
          {!canPurchase && selectedNumbers.length === MAX_SELECTABLE && (
            <div className="purchase-warning">
              {userCredits < (prize?.entryPoints || 0) ? (
                <>
                  <i className="icon">⚠️</i>
                  <span>Crédits insuffisants pour participer</span>
                </>
              ) : pendingTicketsCount >= MAX_TICKETS_PER_USER ? (
                <>
                  <i className="icon">⚠️</i>
                  <span>Limite de tickets atteinte</span>
                </>
              ) : null}
            </div>
          )}
        </div>
        
        <div className="history-section">
          <h2>Historique de vos tickets</h2>
          
          {userTickets.length > 0 ? (
            <div className="tickets-list">
              {userTickets.map(ticket => (
                <div key={ticket.id} className="ticket-card">
                  <div className="ticket-header">
                    <span className="ticket-id">Ticket #{ticket.id.slice(0, 6)}</span>
                    <span className="ticket-date">
                      {formatDate(ticket.purchaseDate)}
                    </span>
                  </div>
                  <div className="ticket-numbers">
                    {ticket.numbers.sort((a, b) => a - b).map(num => (
                      <span key={num} className="ticket-number">{num}</span>
                    ))}
                  </div>
                  <div className="ticket-footer">
                    <span className="ticket-cost">
                      Coût: {ticket.entryPoints} points
                    </span>
                    <span className={`status-badge ${ticket.status}`}>
                      {ticket.status === 'pending' ? 'En attente' : 
                       ticket.status === 'won' ? 'Gagnant' : 'Perdu'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-tickets">
              <p>Aucun ticket acheté</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;