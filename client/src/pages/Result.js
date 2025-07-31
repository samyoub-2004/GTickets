// Result.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './FirebaseConf/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import Confetti from 'react-confetti';
import './Result.css';

const Result = () => {
  const navigate = useNavigate();
  const [winners, setWinners] = useState([]);
  const [winningNumbers, setWinningNumbers] = useState([]);
  const [prize, setPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nextDraw, setNextDraw] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Vérifier les gagnants et charger les données
  useEffect(() => {
    const fetchResults = async () => {
      try {
        // 1. Vérifier s'il y a des gagnants
        const winnersSnapshot = await getDocs(collection(db, 'winners'));
        if (winnersSnapshot.empty) {
          navigate('/Game');
          return;
        }

        // 2. Charger les données des gagnants
        const winnersData = winnersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().winDate?.toDate() || new Date()
        }));
        setWinners(winnersData);

        // 3. Charger les numéros gagnants
        const winningNumbersDoc = await getDoc(doc(db, 'settings', 'winning_numbers'));
        if (winningNumbersDoc.exists()) {
          setWinningNumbers(winningNumbersDoc.data().numbers || []);
        }

        // 4. Charger les détails du prix
        const prizeDoc = await getDoc(doc(db, 'settings', 'prize_object'));
        if (prizeDoc.exists()) {
          setPrize(prizeDoc.data());
        }

        // 5. Vérifier le prochain tirage
        const drawDoc = await getDoc(doc(db, 'settings', 'next_draw'));
        if (drawDoc.exists()) {
          setNextDraw(drawDoc.data().date.toDate());
          startCountdown(drawDoc.data().date.toDate());
        }
      } catch (error) {
        console.error("Erreur de chargement :", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [navigate]);

  // Démarrer le compte à rebours
  const startCountdown = (drawDate) => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = drawDate - now;
      if (diff <= 0) {
        clearInterval(interval);
        setCountdown('Tirage en cours!');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${days}j ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Chargement des résultats...</p>
      </div>
    );
  }

  return (
    <div className="result-page">
      {/* Animation de confettis */}
      <Confetti 
        width={windowSize.width}
        height={windowSize.height}
        recycle={false} 
        numberOfPieces={500} 
      />

      <header className="result-header">
        <div className="header-content">
          <div className="trophy-container">
            <div className="trophy">
              <div className="trophy-top"></div>
              <div className="trophy-base"></div>
            </div>
          </div>
          <h1>🏆 Résultats du Tirage 🏆</h1>
          {nextDraw && (
            <div className="next-draw">
              <p>Prochain tirage: <span className="countdown">{countdown}</span></p>
            </div>
          )}
        </div>
        <button onClick={() => navigate('/Game')} className="back-button">
          Retour au jeu
        </button>
      </header>

      <main className="result-container">
        {/* Section des numéros gagnants */}
        <section className="winning-numbers-section">
          <div className="section-title">
            <h2>Numéros Gagnants</h2>
            <div className="divider"></div>
          </div>
          <div className="numbers-grid">
            {winningNumbers.map((num, index) => (
              <div 
                key={index} 
                className="number-ball winning-ball"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {num}
              </div>
            ))}
          </div>
        </section>

        {/* Liste des gagnants */}
        <section className="winners-list">
          <div className="section-title">
            <h2>Nos Gagnants</h2>
            <div className="divider"></div>
          </div>
          {winners.map((winner, index) => (
            <div 
              key={winner.id} 
              className="winner-card" 
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="winner-header">
                <div className="winner-rank">#{index + 1}</div>
                <div className="winner-info">
                  <h3>Gagnant</h3>
                  <p className="winner-id">ID: {winner.userId}</p>
                  <p className="prize-name">{prize?.name}</p>
                </div>
              </div>
              <div className="winner-grid">
                {winner.numbers.map((num, i) => (
                  <div
                    key={i}
                    className={`number-ball ${
                      winningNumbers.includes(num) ? 'winning-ball' : ''
                    }`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      
      <footer className="result-footer">
        <p>Félicitations à tous nos gagnants !</p>
      </footer>
    </div>
  );
};

export default Result;