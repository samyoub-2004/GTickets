// src/pages/LandingPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    setIsVisible(true);
    
    // Vérifier si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    
    // Animation du fond
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Redimensionnement du canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particules pour l'arrière-plan animé
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
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Fond dégradé sobre
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0c0c14');
      gradient.addColorStop(1, '#161622');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Dessiner les particules
      particles.forEach(p => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        
        // Rebondir sur les bords
        if (p.x < 0 || p.x > canvas.width) p.angle = Math.PI - p.angle;
        if (p.y < 0 || p.y > canvas.height) p.angle = -p.angle;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 150, 100, ${p.opacity})`; // Couleur or discret
        ctx.fill();
      });
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  // Gestion de l'installation PWA
  useEffect(() => {
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
    };
  }, []);
  
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
    document.querySelector('.content').classList.add('fade-out');
    setTimeout(() => navigate('/Login'), 800);
  };
  
  return (
    <div className="landing-container">
      <canvas ref={canvasRef} className="background-canvas"></canvas>
      
      <div className={`content ${isVisible ? 'visible' : ''}`}>
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
              Pour célébrer notre lancement, nous organisons des tirages spéciaux dès que 
              suffisamment de participants sont inscrits. Plus vous partagez l'application, 
              plus vite nous pourrons organiser des tirages réguliers !
            </p>
          </div>
        </div>
        
        <div className="feature-section">
          <div className="feature-card">
            <div className="feature-icon">🎁</div>
            <h3>Objets de valeur</h3>
            <p>Remportez des produits haut de gamme sélectionnés avec soin pour nos tirages inauguraux.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🔄</div>
            <h3>Conversion flexible</h3>
            <p>Recevez l'objet physique ou convertissez sa valeur en crédit pour les prochains tirages.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🚀</div>
            <h3>Participation rapide</h3>
            <p>Nos premiers tirages auront lieu dès que la communauté sera suffisamment large.</p>
          </div>
        </div>
        
        <div className="how-it-works">
          <h2>Comment participer ?</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Créez votre compte</h3>
                <p>Inscrivez-vous gratuitement pour accéder à la plateforme</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Rechargez votre solde</h3>
                <p>Utilisez nos cartes recharge pour créditer votre compte</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Choisissez vos numéros</h3>
                <p>Sélectionnez 2 grille possible par tirage</p>
              </div>
            </div>
          </div>
          
          <div className="frequency-note">
            <p>
              <strong>Note :</strong> Pendant la période de lancement, les tirages seront organisés 
              dès que nous aurons atteint un nombre suffisant de participants. À terme, nous prévoyons 
              d'organiser des tirages hebdomadaires. <br/>
              <strong>Note 2:</strong> Les deux premiers tirages seront gratuitement pour les 50 premieres personnes avec un bonus de 200PTS
            </p>
          </div>
        </div>
        
        <div className="action-buttons">
          <button className="start-button" onClick={handleStart}>
            Créer/Se Connecter - mon compte
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