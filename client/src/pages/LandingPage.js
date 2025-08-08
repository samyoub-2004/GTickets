// src/pages/LandingPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from './FirebaseConf/firebase';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  
  // Date de fin fixe pour le compte à rebours
  const endDate = new Date('2025-08-12T23:59:59');
  
  useEffect(() => {
    // Vérifier l'état d'authentification
    const unsubscribe = auth.onAuthStateChanged(user => {
      setIsLoading(false);
      if (user) {
        navigate('/Game');
      } else {
        setIsVisible(true);
        
        // Calculer le temps restant
        const calculateTimeLeft = () => {
          const now = new Date();
          const difference = endDate - now;
          return difference > 0 ? Math.floor(difference / 1000) : 0;
        };
        
        setTimeLeft(calculateTimeLeft());
        
        // Vérifier si l'app est installée
        if (window.matchMedia('(display-mode: standalone)').matches) {
          setIsInstalled(true);
        }
      }
    });

    // Gestion PWA
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      unsubscribe();
    };
  }, [navigate]);
  
  // Effet pour l'animation (séparé pour éviter les problèmes de référence)
  useEffect(() => {
    if (!canvasRef.current || isLoading) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Redimensionnement
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particules
    const particles = [];
    const particleCount = window.innerWidth < 768 ? 30 : 60;
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.3 + 0.1,
        angle: Math.random() * Math.PI * 2
      });
    }
    
    let animationFrameId;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Fond dégradé
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0c0c14');
      gradient.addColorStop(1, '#161622');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Dessiner les particules
      particles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        
        if (p.x < 0 || p.x > canvas.width) p.angle = Math.PI - p.angle;
        if (p.y < 0 || p.y > canvas.height) p.angle = -p.angle;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 150, 100, ${p.opacity})`;
        ctx.fill();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Timer pour le popup
    const popupTimer = setTimeout(() => {
      setShowPopup(true);
    }, 3000);
    
    // Compte à rebours
    const countdown = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearTimeout(popupTimer);
      clearInterval(countdown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLoading]);
  
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("Pour installer l'application, utilisez l'option 'Ajouter à l'écran d'accueil' dans le menu de votre navigateur.");
    }
  };
  
  const handleStart = () => {
    document.querySelector('.content')?.classList.add('fade-out');
    setTimeout(() => navigate('/Login'), 800);
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'GoldenTicket',
        text: 'Rejoins-moi sur GoldenTicket pour gagner des objets prestigieux ! Offre exclusive limitée dans le temps 🚀',
        url: window.location.href
      }).catch(console.error);
    } else {
      alert("Partagez le lien avec vos amis : " + window.location.href);
    }
  };
  
  // Calcul du temps restant
  const days = Math.floor(timeLeft / (24 * 3600));
  const hours = Math.floor((timeLeft % (24 * 3600)) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = Math.floor(timeLeft % 60);

  // Chargement
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Vérification de votre session...</p>
      </div>
    );
  }

  return (
    <div className="landing-container">
      <canvas ref={canvasRef} className="background-canvas"></canvas>
      
      {/* Bandeau de compte à rebours */}
      {timeLeft > 0 && (
        <div className="top-countdown-banner">
          <div className="countdown-title">OFFRE EXCLUSIVE SE TERMINE DANS:</div>
          <div className="countdown-timer">
            <div className="countdown-section">
              <span className="countdown-value">{days}</span>
              <span className="countdown-label">JOURS</span>
            </div>
            <div className="countdown-section">
              <span className="countdown-value">{hours}</span>
              <span className="countdown-label">HEURES</span>
            </div>
            <div className="countdown-section">
              <span className="countdown-value">{minutes}</span>
              <span className="countdown-label">MIN</span>
            </div>
            <div className="countdown-section">
              <span className="countdown-value">{seconds}</span>
              <span className="countdown-label">SEC</span>
            </div>
          </div>
          <div className="countdown-glare"></div>
        </div>
      )}
      
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-header">
              <h3>Offre exclusive réservée aux 50 premiers !</h3>
            </div>
            <div className="popup-body">
              <div className="offer-highlight">
                <div className="offer-badge">LIMITÉ</div>
                <p>🎉 <strong>2 PARTICIPATIONS GRATUITES</strong> 🎉</p>
              </div>
              <p className="offer-description">Seulement les 50 premiers inscrits bénéficieront de cette offre exceptionnelle !</p>
              
              <div className="benefits">
                <div className="benefit">
                  <div className="benefit-icon">✅</div>
                  <div className="benefit-text">Accès immédiat aux tirages premium</div>
                </div>
                <div className="benefit">
                  <div className="benefit-icon">✅</div>
                  <div className="benefit-text">Chances multipliées de gagner</div>
                </div>
                <div className="benefit">
                  <div className="benefit-icon">✅</div>
                  <div className="benefit-text">Objets de luxe exclusifs</div>
                </div>
              </div>
              
              <div className="urgency-note">
                <div className="fire-icon">🔥</div>
                <p>Plus que <strong>quelques places</strong> disponibles !</p>
              </div>
            </div>
            <div className="popup-footer">
              <button className="popup-button" onClick={handleStart}>
                <span>PROFITER DE L'OFFRE MAINTENANT</span>
                <span className="offer-details">2 participations gratuites • Réservé aux 50 premiers</span>
              </button>
              <button className="share-button" onClick={handleShare}>
                <span>INVITER DES AMIS</span>
                <span>Partagez pour débloquer +1 participation gratuite</span>
              </button>
              <button className="popup-link" onClick={() => setShowPopup(false)}>
                Continuer sans bénéficier de l'offre
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className={`content ${isVisible ? 'visible' : ''} ${timeLeft > 0 ? 'with-banner' : ''}`}>
        <div className="header">
          <div className="logo">
            <div className="logo-mark">GT</div>
            <h1>GoldenTicket</h1>
          </div>
          <p className="tagline">Votre chance exclusive de remporter des objets prestigieux</p>
        </div>
        
        <div className="intro-section">
          <div className="intro-text">
            <h2>Lancement exceptionnel</h2>
            <p>
              Pour célébrer notre lancement, nous offrons <strong>2 participations gratuites</strong> aux 50 premiers membres !
              Plus vous partagez l'application, plus vite nous pourrons organiser des tirages réguliers avec des lots encore plus importants !
            </p>
          </div>
        </div>
        
        <div className="feature-section">
          <div className="feature-card">
            <div className="feature-icon">🎁</div>
            <h3>Objets de valeur</h3>
            <p>Remportez des produits haut de gamme : smartphones, montres de luxe, et bien plus encore !</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Gains garantis</h3>
            <p>Chaque tirage a un gagnant. Plus vous jouez, plus vos chances augmentent !</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Croissance rapide</h3>
            <p>Notre communauté grandit rapidement - les premiers tirages auront lieu très bientôt !</p>
          </div>
        </div>
        
        <div className="how-it-works">
          <h2>Comment participer ?</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Inscription gratuite</h3>
                <p>Créez votre compte en 30 secondes</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Recevez vos points</h3>
                <p>Obtenez 200 points offerts pour vos premiers tirages</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Choisissez vos numéros</h3>
                <p>Sélectionnez vos combinaisons et attendez le tirage</p>
              </div>
            </div>
          </div>
          
          <div className="frequency-note">
            <p>
              <strong>Offre spéciale :</strong> Les deux premiers tirages sont <strong>GRATUITS</strong> pour les 50 premiers participants ! 
              Profitez-en dès maintenant avant que cette offre ne disparaisse !
            </p>
          </div>
        </div>
        
        <div className="action-buttons">
          <button className="start-button" onClick={handleStart}>
            Créer mon compte - Offre gratuite
          </button>
          
          {!isInstalled && deferredPrompt && (
            <button className="install-button" onClick={handleInstall}>
              <span>Installer l'application</span>
              <span>Ajouter à l'écran d'accueil</span>
            </button>
          )}
        </div>
        
        <div className="footer">
          <p>Jouez avec modération • Interdit aux moins de 18 ans</p>
          <p>© 2025 GoldenTicket - Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;