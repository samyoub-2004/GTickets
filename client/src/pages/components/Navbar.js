// src/components/Navbar/Navbar.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../FirebaseConf/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import './Navbar.css';

const Navbar = ({ countdown, userCredits, onLogout, onAddCredits }) => {
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showReloadPopup, setShowReloadPopup] = useState(false);
  const [rechargeCode, setRechargeCode] = useState('');
  const [rechargeError, setRechargeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScratching, setIsScratching] = useState(false);

  const toggleNav = () => setIsNavOpen(!isNavOpen);
  
  const handleViewHistory = () => {
    navigate('/History');
    setIsNavOpen(false);
  };

  

  const handleReloadClick = () => {
    setShowReloadPopup(true);
    setRechargeCode('');
    setRechargeError('');
  };

  const handleRechargeSubmit = async () => {
    if (!rechargeCode.trim()) {
      setRechargeError("Veuillez entrer un code de recharge");
      return;
    }

    setIsLoading(true);
    setRechargeError('');

    try {
      const rechargeCardsRef = collection(db, "recharge_cards");
      const q = query(rechargeCardsRef, 
        where("code", "==", rechargeCode.trim().toUpperCase()),
        where("used", "==", false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setRechargeError("Code invalide ou déjà utilisé");
        return;
      }

      const cardDoc = querySnapshot.docs[0];
      const cardData = cardDoc.data();
      
      await updateDoc(doc(db, "recharge_cards", cardDoc.id), {
        used: true,
        usedAt: new Date(),
        usedBy: auth.currentUser.uid
      });

      onAddCredits(cardData.da);
      setShowReloadPopup(false);
      setRechargeCode('');
    } catch (error) {
      console.error("Erreur lors de la recharge: ", error);
      setRechargeError("Erreur lors du traitement de la recharge");
    } finally {
      setIsLoading(false);
    }
  };

  const simulateScratch = () => {
    if (isScratching) return;
    setIsScratching(true);
    setTimeout(() => setIsScratching(false), 1000);
  };

  return (
    <>
      <nav className={`navbar ${isNavOpen ? 'open' : ''}`}>
        <div className="navbar-container">
          <div className="navbar-brand">
            <div className="logo-container">
              <div className="logo-circle">
                <span className="logo-letter">G</span>
              </div>
              <h1>olden<span className="gold-text">ticket</span></h1>
            </div>
          </div>
          
          <button className={`navbar-toggle ${isNavOpen ? 'open' : ''}`} onClick={toggleNav}>
            <span className="toggle-bar"></span>
            <span className="toggle-bar"></span>
            <span className="toggle-bar"></span>
          </button>
          
          <div className="navbar-links">
            <div className="navbar-item countdown-container">
              <div className="countdown-icon">⏱️</div>
              <div className="countdown-value">{countdown}</div>
            </div>
            
            <div className="navbar-item credits-container">
              <div className="credits-icon">🪙</div>
              <div className="credits-value">{userCredits}</div>
              <div className="credits-label">Crédits</div>
            </div>

           

            <div className="navbar-item">
              <button className="history-btn" onClick={handleViewHistory}>
                <span className="btn-icon">📜</span>
                <span className="btn-text">Historique</span>
              </button>
            </div>
            
            <div className="navbar-item">
              <button className="reload-btn" onClick={handleReloadClick}>
                <span className="btn-icon">🔄</span>
                <span className="btn-text">Recharger</span>
              </button>
            </div>
            
            <div className="navbar-item">
              <button className="logout-btn" onClick={onLogout}>
                <span className="btn-icon">🚪</span>
                <span className="btn-text">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Popup de recharge */}
      {showReloadPopup && (
        <div className="reload-popup">
          <div className="popup-content">
            <div className="popup-header">
              <h3>Recharger avec une carte physique</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowReloadPopup(false)}
                disabled={isLoading}
              >
                &times;
              </button>
            </div>
            
            <div className="popup-body">
              <div className="recharge-instructions">
                <p>
                  Entrez le code à 12 caractères présent au dos de votre carte de recharge.
                  <br />Exemple: <code>LOTO-TX4ZAQEA</code>
                </p>
              </div>
              
              <div className="recharge-form">
                <div className="form-group">
                  <div className="input-container">
                    <input
                      type="text"
                      value={rechargeCode}
                      onChange={(e) => setRechargeCode(e.target.value)}
                      placeholder="Entrez le code de 12 caractères"
                      disabled={isLoading}
                      className={rechargeError ? 'error-input' : ''}
                    />
                  </div>
                  {rechargeError && (
                    <div className="error-message">{rechargeError}</div>
                  )}
                </div>
                
                <div className="card-example">
                  <div className="card-image">
                    <div className="card-front">
                      <div className="card-logo">LotoGold</div>
                      <div className="card-value">5000 DA</div>
                      <div className="card-decoration"></div>
                    </div>
                    <div className="card-back" onClick={simulateScratch}>
                      <div className={`scratch-area ${isScratching ? 'scratching' : ''}`}>
                        {isScratching ? (
                          <div className="scratch-effect">
                            <div className="scratch-line"></div>
                            <div className="scratch-line"></div>
                            <div className="scratch-line"></div>
                          </div>
                        ) : (
                          <div className="scratch-text">Gratter ici</div>
                        )}
                        <div className="card-code">{rechargeCode || 'LOTO-XXXXXX'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="card-hint">
                    Le code est caché sous la zone à gratter au dos de la carte
                  </div>
                </div>
              </div>
            </div>
            
            <div className="popup-footer">
              <button 
                className="cancel-btn" 
                onClick={() => setShowReloadPopup(false)}
                disabled={isLoading}
              >
                Annuler
              </button>
              <button 
                className="confirm-btn" 
                onClick={handleRechargeSubmit}
                disabled={isLoading || !rechargeCode.trim()}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  "Valider la recharge"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;