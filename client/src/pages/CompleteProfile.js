// src/pages/CompleteProfile.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './FirebaseConf/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import './CompleteProfile.css';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const canvasRef = useRef(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'Algérie',
    birthDate: ''
  });
  
  // Vérifier si l'utilisateur est connecté et charger les données
  useEffect(() => {
    const fetchUserData = async (user) => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data();
          
          // Séparer le displayName en prénom et nom
          let firstName = '';
          let lastName = '';
          if (userData.displayName) {
            const nameParts = userData.displayName.split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }
          
          setFormData({
            firstName: userData.firstName || firstName,
            lastName: userData.lastName || lastName,
            phone: userData.phone || '',
            address: userData.address || '',
            postalCode: userData.postalCode || '',
            city: userData.city || '',
            country: userData.country || 'Algérie',
            birthDate: userData.birthDate || ''
          });
        }
        setInitialLoad(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setInitialLoad(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        navigate('/login');
      } else {
        setIsVisible(true);
        fetchUserData(user);
      }
    });
    
    return unsubscribe;
  }, [navigate]);
  
  // Animation du fond
  useEffect(() => {
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
    };
  }, []);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validation
    if (!formData.firstName || !formData.lastName || 
        !formData.phone || !formData.address || 
        !formData.postalCode || !formData.city || !formData.country) {
      setError('Veuillez remplir tous les champs obligatoires');
      setLoading(false);
      return;
    }
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');
      
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...formData,
        profileCompleted: true,
        updatedAt: new Date()
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/Game');
      }, 2000);
      
    } catch (error) {
      setError(`Erreur lors de la mise à jour du profil: ${error.message}`);
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="complete-profile-container">
      <canvas ref={canvasRef} className="background-canvas"></canvas>
      
      <div className={`complete-profile-content ${isVisible ? 'visible' : ''}`}>
        <div className="profile-header">
          <div className="logo">
            <div className="logo-mark">GT</div>
            <h1>GoldenTicket</h1>
          </div>
          <p className="tagline">Complétez votre profil</p>
        </div>
        
        <div className="info-box">
          <div className="info-icon">ℹ️</div>
          <div className="info-text">
            <h3>Pourquoi ces informations ?</h3>
            <p>
              Ces informations sont nécessaires pour vous contacter en cas de gain et pour vous envoyer 
              votre prix si vous gagnez. Votre numéro de téléphone nous permet de vous appeler rapidement, 
              et votre adresse nous permet de vous envoyer votre prix par courrier.
            </p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-row">
            <div className="form-group">
              <label>Prénom <span className="required">*</span></label>
              <input 
                type="text" 
                name="firstName" 
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Votre prénom"
                disabled={initialLoad}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Nom <span className="required">*</span></label>
              <input 
                type="text" 
                name="lastName" 
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Votre nom"
                disabled={initialLoad}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Numéro de téléphone <span className="required">*</span></label>
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone}
              onChange={handleChange}
              placeholder="Ex: 0550123456"
              disabled={initialLoad}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Adresse <span className="required">*</span></label>
            <input 
              type="text" 
              name="address" 
              value={formData.address}
              onChange={handleChange}
              placeholder="Ex: 123 Rue des Lauriers"
              disabled={initialLoad}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Code postal <span className="required">*</span></label>
              <input 
                type="text" 
                name="postalCode" 
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="Ex: 16000"
                disabled={initialLoad}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Ville <span className="required">*</span></label>
              <input 
                type="text" 
                name="city" 
                value={formData.city}
                onChange={handleChange}
                placeholder="Ex: Alger"
                disabled={initialLoad}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Pays <span className="required">*</span></label>
              <select 
                name="country" 
                value={formData.country}
                onChange={handleChange}
                disabled={initialLoad}
                required
              >
                <option value="Algérie">Algérie</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Date de naissance</label>
              <input 
                type="date" 
                name="birthDate" 
                value={formData.birthDate}
                onChange={handleChange}
                disabled={initialLoad}
              />
            </div>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              Profil complété avec succès! Redirection en cours...
            </div>
          )}
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading || success || initialLoad}
          >
            {loading ? (
              <div className="spinner"></div>
            ) : initialLoad ? (
              'Chargement...'
            ) : (
              'Finaliser mon profil'
            )}
          </button>
        </form>
        
        <div className="security-note">
          <p>
            <strong>Confidentialité assurée:</strong> Vos informations personnelles sont sécurisées 
            et ne seront utilisées que pour vous contacter en cas de gain ou pour des informations 
            importantes concernant votre compte.
          </p>
        </div>
        
        <div className="footer">
          <p>Jouez avec modération • Interdit aux moins de 18 ans</p>
          <p>© {new Date().getFullYear()} GoldenTicket - Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;