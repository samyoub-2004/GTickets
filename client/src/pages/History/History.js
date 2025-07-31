// src/pages/History/History.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../FirebaseConf/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './history.css';

const History = () => {
  const [archivedTickets, setArchivedTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArchivedTickets = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }

        const ticketsRef = collection(db, 'users', user.uid, 'tickets_history');
        const q = query(ticketsRef, where("archivedAt", "!=", null));
        const querySnapshot = await getDocs(q);

        const tickets = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          archivedAt: doc.data().archivedAt?.toDate() || null
        }));
        console.log(tickets);
        

        setArchivedTickets(tickets);
      } catch (error) {
        console.error("Error fetching archived tickets:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedTickets();
  }, [navigate]);

  // Pagination logic
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = archivedTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(archivedTickets.length / ticketsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const renderStatusBadge = (status, isWinning) => {
    if (status === 'won') {
      return <span className="status-badge won">Gagnant</span>;
    }
    if (status === 'lost') {
      return <span className="status-badge lost">Perdant</span>;
    }
    return <span className="status-badge pending">En attente</span>;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader-spinner"></div>
        <p>Chargement de l'historique...</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-container">
        <div className="history-header">
          <h1>Historique des Participations</h1>
          <p className="history-subtitle">
            Retrouvez ici tous vos tickets archivés
          </p>
        </div>

        {archivedTickets.length === 0 ? (
          <div className="empty-history">
            <div className="empty-icon">📭</div>
            <h3>Aucun ticket archivé</h3>
            <p>Votre historique de participation apparaîtra ici</p>
            <button 
              className="back-btn"
              onClick={() => navigate('/')}
            >
              Retour à l'accueil
            </button>
          </div>
        ) : (
          <>
            <div className="history-stats">
              <div className="stat-card">
                <div className="stat-value">{archivedTickets.length}</div>
                <div className="stat-label">Tickets archivés</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {archivedTickets.filter(t => t.status === 'won').length}
                </div>
                <div className="stat-label">Gains</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {new Set(archivedTickets.map(t => t.prizeId)).size}
                </div>
                <div className="stat-label">Objets différents</div>
              </div>
            </div>

            <div className="tickets-grid">
              {currentTickets.map(ticket => (
                <div key={ticket.id} className="ticket-card">
                  <div className="ticket-header">
                    <div className="ticket-prize">{ticket.prizeId || 'Objet inconnu'}</div>
                    <div className="ticket-date">
                      {ticket.archivedAt?.toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) || 'Date inconnue'}
                    </div>
                  </div>
                  
                  <div className="ticket-numbers">
                    {ticket.numbers?.slice(0, 10).map((num, index) => (
                      <div key={index} className="ticket-number">
                        {num}
                      </div>
                    ))}
                    {ticket.numbers?.length > 10 && (
                      <div className="more-numbers">+{ticket.numbers.length - 10}</div>
                    )}
                  </div>
                  
                  <div className="ticket-footer">
                    {renderStatusBadge(ticket.status, ticket.isWinning)}
                    <div className="ticket-points">
                      {ticket.entryPoints || '?'} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  &lt;
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`pagination-btn ${currentPage === number ? 'active' : ''}`}
                  >
                    {number}
                  </button>
                ))}
                
                <button
                  onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;