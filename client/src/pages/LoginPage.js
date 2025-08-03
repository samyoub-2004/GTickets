// src/pages/LoginPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './FirebaseConf/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [sponsorCode, setSponsorCode] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  
  useEffect(() => {
    setIsVisible(true);
    
    // Vérifier si l'utilisateur est déjà connecté
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.profileCompleted) {
            navigate('/Game');
          } else {
            navigate('/complete-profile');
          }
        }
      }
    });

    // Animation du fond
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
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
      
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0c0c14');
      gradient.addColorStop(1, '#161622');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
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
      
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      unsubscribe();
    };
  }, [navigate]);
  
  const validateSponsorCode = async (code) => {
    if (!code.trim()) return { valid: true };
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('sponsorCode', '==', code));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { valid: false, message: 'Code de parrainage invalide' };
      }
      
      return { valid: true, referrerId: querySnapshot.docs[0].id };
    } catch (error) {
      console.error("Erreur de validation du code:", error);
      return { valid: false, message: 'Erreur de validation du code' };
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Valider le code de parrainage d'abord
      if (sponsorCode.trim()) {
        const validation = await validateSponsorCode(sponsorCode);
        if (!validation.valid) {
          setError(validation.message);
          setLoading(false);
          return;
        }
      }
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        if (userData.profileCompleted) {
          navigate('/Game');
        } else {
          navigate('/complete-profile');
        }
      } else {
        // Nouvel utilisateur
        const validation = sponsorCode.trim() ? await validateSponsorCode(sponsorCode) : { valid: true };
        
        if (!validation.valid) {
          setError(validation.message);
          setLoading(false);
          return;
        }
        
        const newSponsorCode = `LP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          credits: 400,
          sponsorCode: newSponsorCode,
          referredBy: validation.referrerId || null,
          profileCompleted: false,
          createdAt: new Date(),
          lastLogin: new Date()
        });
        
        navigate('/complete-profile');
      }
    } catch (error) {
      setError(`Erreur de connexion: ${error.message}`);
      console.error("Erreur de connexion:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartTransition = () => {
    document.querySelector('.login-content').classList.add('fade-out');
    setTimeout(() => handleGoogleSignIn(), 800);
  };
  
  return (
    <div className="login-container">
      <canvas ref={canvasRef} className="background-canvas"></canvas>
      
      <div className={`login-content ${isVisible ? 'visible' : ''}`}>
        <div className="login-header">
          <div className="logo">
            <div className="logo-mark">GT</div>
            <h1>GoldenTicket</h1>
          </div>
          <p className="tagline">Connexion à votre compte exclusif</p>
        </div>
        
        <div className="login-form">
          
        
          
          <button 
            className="google-btn"
            onClick={handleStartTransition}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <div className="google-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                </div>
                <span>Continuer avec Google</span>
              </>
            )}
          </button>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="terms">
            <p>
              En vous connectant, vous acceptez nos <a href="#">Conditions d'utilisation</a> 
              et notre <a href="#">Politique de confidentialité</a>.
            </p>
          </div>
        </div>
        
       
        
        <div className="footer">
          <p>Jouez avec modération • Interdit aux moins de 18 ans</p>
          <p>© {new Date().getFullYear()} GoldenTicket - Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;