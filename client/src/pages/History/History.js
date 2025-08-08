// src/pages/TicketHistory.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../FirebaseConf/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './history.css';

const TicketHistory = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'won', 'lost'
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(6);

  // Gestion de l'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setError('Vous devez être connecté pour voir vos tickets');
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Charger les tickets quand l'utilisateur change
  useEffect(() => {
    const fetchTickets = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError('');
        const ticketsRef = collection(db, 'tickets_history');
        const q = query(ticketsRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const ticketsData = [];
        querySnapshot.forEach(doc => {
          const ticketData = doc.data();
          ticketsData.push({
            id: doc.id,
            ...ticketData,
            createdAt: ticketData.createdAt?.toDate?.() || ticketData.createdAt,
            drawDate: ticketData.drawDate?.toDate?.() || ticketData.drawDate
          });
        });
        
        ticketsData.sort((a, b) => b.createdAt - a.createdAt);
        setTickets(ticketsData);
        
        if (ticketsData.length === 0) {
          setError('Aucun ticket trouvé');
        }
      } catch (err) {
        console.error("Erreur de chargement des tickets:", err);
        setError('Erreur de chargement des tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [currentUser]);

  // Filtrer les tickets quand le filtre ou les tickets changent
  useEffect(() => {
    if (filter === 'all') {
      setFilteredTickets(tickets);
    } else {
      setFilteredTickets(tickets.filter(ticket => ticket.status === filter));
    }
    setCurrentPage(1); // Reset à la première page quand le filtre change
  }, [filter, tickets]);

  // Pagination
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const formatDate = (date) => {
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

  return (
    <div className="ticket-history-container">
      <h1>Mes Tickets Archivés</h1>
      
      {/* Filtres */}
      <div className="filters">
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Tous
        </button>
        <button 
          className={`filter-btn ${filter === 'won' ? 'active' : ''}`}
          onClick={() => setFilter('won')}
        >
          Gagnants
        </button>
        <button 
          className={`filter-btn ${filter === 'lost' ? 'active' : ''}`}
          onClick={() => setFilter('lost')}
        >
          Perdants
        </button>
      </div>
      
      {/* Statistiques */}
      <div className="stats">
        <div className="stat-card">
          <span className="stat-value">{tickets.length}</span>
          <span className="stat-label">Total Tickets</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{tickets.filter(t => t.status === 'won').length}</span>
          <span className="stat-label">Tickets Gagnants</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {tickets.reduce((sum, ticket) => ticket.status === 'won' ? sum + (ticket.prize || 0) : sum, 0)} da
          </span>
          <span className="stat-label">Gains Totaux</span>
        </div>
      </div>
      
      {loading && (
        <div className="loader">
          <div className="spinner"></div>
          <p>Chargement des tickets...</p>
        </div>
      )}
      
      {error && !loading && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      {filteredTickets.length === 0 && !loading && !error && (
        <div className="no-tickets">
          <div className="no-tickets-icon">🎫</div>
          <p>Aucun ticket trouvé</p>
        </div>
      )}
      
      {currentTickets.length > 0 && !loading && (
        <>
          <div className="tickets-grid">
            {currentTickets.map(ticket => (
              <div key={ticket.id} className={`ticket-card ${ticket.status}`}>
                <div className="ticket-header">
                  <span className="ticket-date">{formatDate(ticket.createdAt)}</span>
                  <span className={`ticket-status ${ticket.status}`}>
                    {ticket.status === 'won' ? 'Gagnant' : 'Perdu'}
                  </span>
                </div>
                
                <div className="ticket-numbers">
                  <h3>Mes numéros</h3>
                  <div className="numbers-container">
                    {ticket.numbers.map((num, idx) => (
                      <div 
                        key={idx} 
                        className={`number-ball ${
                          ticket.winningNumbers?.includes(num) ? 'matched' : ''
                        }`}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="ticket-result">
                  <h3>Résultat</h3>
                  <div className="result-details">
                    <p>
                      <strong>Date du tirage:</strong> {ticket.drawDate ? formatDate(ticket.drawDate) : '--'}
                    </p>
                    <p>
                      <strong>Numéros gagnants:</strong> 
                      <div className="winning-numbers">
                        {ticket.winningNumbers?.map((num, idx) => (
                          <div key={idx} className="winning-ball">{num}</div>
                        )) || '--'}
                      </div>
                    </p>
                    <p>
                      <strong>Correspondances:</strong> {ticket.matchedCount || 0}/5
                    </p>
                    {ticket.status === 'won' && (
                      <p className="prize-amount">
                        <strong>Gain:</strong> {ticket.prize} da
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className={`pagination-btn ${currentPage === 1 ? 'disabled' : ''}`}
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              >
                &lt; Précédent
              </button>
              
              <span className="page-info">Page {currentPage} sur {totalPages}</span>
              
              <button 
                className={`pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`}
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Suivant &gt;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TicketHistory;