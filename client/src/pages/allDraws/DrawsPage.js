// src/pages/DrawsPage.js
import React, { useState, useEffect } from 'react';
import { db } from '../FirebaseConf/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import './DrawsPage.css';

const DrawsPage = () => {
  const [draws, setDraws] = useState([]);
  const [filteredDraws, setFilteredDraws] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minWinners: '',
    maxWinners: '',
    search: ''
  });

  // Charger tous les tirages terminés
  useEffect(() => {
    const loadCompletedDraws = async () => {
      try {
        const drawsQuery = query(
          collection(db, 'draws'),
          where('status', '==', 'completed')
        );
        
        const drawsSnap = await getDocs(drawsQuery);
        const drawsData = drawsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            scheduledAt: data.scheduledAt?.toDate?.() || data.scheduledAt,
            completedAt: data.completedAt?.toDate?.() || data.completedAt
          };
        });
        
        setDraws(drawsData);
        setFilteredDraws(drawsData);
      } catch (error) {
        console.error("Erreur de chargement des tirages:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompletedDraws();
  }, []);

  // Appliquer les filtres
  useEffect(() => {
    let result = [...draws];
    
    // Filtre par date
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      result = result.filter(draw => 
        draw.completedAt >= start
      );
    }
    
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59); // Fin de journée
      result = result.filter(draw => 
        draw.completedAt <= end
      );
    }
    
    // Filtre par nombre de gagnants
    if (filters.minWinners) {
      const min = parseInt(filters.minWinners);
      result = result.filter(draw => 
        draw.winners && draw.winners.length >= min
      );
    }
    
    if (filters.maxWinners) {
      const max = parseInt(filters.maxWinners);
      result = result.filter(draw => 
        draw.winners && draw.winners.length <= max
      );
    }
    
    // Filtre de recherche
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(draw => {
        // Recherche dans les numéros gagnants
        const numbersMatch = draw.winningNumbers?.some(num => 
          num.toString().includes(searchTerm)
        );
        
        // Recherche dans les gagnants
        const winnersMatch = draw.winners?.some(winner => 
          winner.userName?.toLowerCase().includes(searchTerm)
        );
        
        return numbersMatch || winnersMatch;
      });
    }
    
    setFilteredDraws(result);
  }, [filters, draws]);

  // Gérer les changements de filtre
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      minWinners: '',
      maxWinners: '',
      search: ''
    });
  };

  // Formater la date
  const formaterDate = (date) => {
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

  // Compter les gagnants par catégorie
  const compterGagnantsParCategorie = (draw) => {
    const categories = {
      5: { count: 0, gain: 0 },
      4: { count: 0, gain: 0 },
      3: { count: 0, gain: 0 }
    };
    
    if (draw.winners) {
      draw.winners.forEach(winner => {
        const category = winner.matchedNumbers;
        if (categories[category]) {
          categories[category].count++;
        }
      });
      
      // Calculer les gains par catégorie
      [5, 4, 3].forEach(cat => {
        if (categories[cat].count > 0 && draw.prizeDistribution?.prizePool?.[cat]) {
          categories[cat].gain = Math.floor(
            draw.prizeDistribution.prizePool[cat] / categories[cat].count
          );
        }
      });
    }
    
    return categories;
  };

  return (
    <div className="loto-page-tirages">
      <div className="loto-entete-tirages">
        <h1>Historique des Tirages</h1>
        <p>Consultez tous les tirages terminés et leurs résultats</p>
      </div>

      {loading ? (
        <div className="loto-chargement-overlay">
          <div className="loto-chargement-spinner"></div>
        </div>
      ) : (
        <>
          {/* Section de filtres */}
          <div className="loto-filtres-section">
            <div className="loto-filtres-grille">
              <div className="loto-groupe-filtre">
                <label>Date de début</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="loto-groupe-filtre">
                <label>Date de fin</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="loto-groupe-filtre">
                <label>Gagnants min</label>
                <input
                  type="number"
                  name="minWinners"
                  value={filters.minWinners}
                  onChange={handleFilterChange}
                  min="0"
                  placeholder="0"
                />
              </div>
              
              <div className="loto-groupe-filtre">
                <label>Gagnants max</label>
                <input
                  type="number"
                  name="maxWinners"
                  value={filters.maxWinners}
                  onChange={handleFilterChange}
                  min="0"
                  placeholder="100"
                />
              </div>
              
              <div className="loto-groupe-filtre loto-recherche">
                <label>Recherche</label>
                <input
                  type="text"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Numéros ou gagnants..."
                />
              </div>
              
              <div className="loto-groupe-filtre">
                <button 
                  className="loto-bouton-secondaire" 
                  onClick={resetFilters}
                >
                  Réinitialiser
                </button>
              </div>
            </div>
            
            <div className="loto-info-filtres">
              {filteredDraws.length} tirage{filteredDraws.length !== 1 ? 's' : ''} trouvé{filteredDraws.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Liste des tirages */}
          <div className="loto-liste-tirages">
            {filteredDraws.length > 0 ? (
              filteredDraws.map(draw => {
                const categories = compterGagnantsParCategorie(draw);
                const totalWinners = draw.winners?.length || 0;
                
                return (
                  <div key={draw.id} className="loto-carte-tirage">
                    <div className="loto-entete-carte">
                      <h2>Tirage du {formaterDate(draw.completedAt)}</h2>
                      <div className="loto-tag-gagnants">
                        {totalWinners} gagnant{totalWinners !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <div className="loto-contenu-carte">
                      <div className="loto-section-tirage">
                        <h3>Numéros Gagnants</h3>
                        <div className="loto-numeros-gagnants">
                          {draw.winningNumbers?.map((num, idx) => (
                            <div key={idx} className="loto-numero-gagnant">
                              {num}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="loto-section-tirage">
                        <h3>Gagnants par Catégorie</h3>
                        <div className="loto-categories-gagnants">
                          <div className="loto-categorie-gain">
                            <div className="loto-titre-categorie">5 numéros</div>
                            <div className="loto-valeur-categorie">
                              {categories[5].count} gagnant{categories[5].count !== 1 ? 's' : ''}
                            </div>
                            <div className="loto-gain-categorie">
                              {categories[5].gain > 0 ? `${categories[5].gain} da` : '-'}
                            </div>
                          </div>
                          
                          <div className="loto-categorie-gain">
                            <div className="loto-titre-categorie">4 numéros</div>
                            <div className="loto-valeur-categorie">
                              {categories[4].count} gagnant{categories[4].count !== 1 ? 's' : ''}
                            </div>
                            <div className="loto-gain-categorie">
                              {categories[4].gain > 0 ? `${categories[4].gain} da` : '-'}
                            </div>
                          </div>
                          
                          <div className="loto-categorie-gain">
                            <div className="loto-titre-categorie">3 numéros</div>
                            <div className="loto-valeur-categorie">
                              {categories[3].count} gagnant{categories[3].count !== 1 ? 's' : ''}
                            </div>
                            <div className="loto-gain-categorie">
                              {categories[3].gain > 0 ? `${categories[3].gain} da` : '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="loto-section-tirage">
                        <h3>Répartition des Gains</h3>
                        <div className="loto-repartition-gains">
                          <div className="loto-stat-gain">
                            <span>Total des gains:</span>
                            <strong>{draw.prizeDistribution?.totalRevenue?.toFixed(2) || '0.00'} da</strong>
                          </div>
                          <div className="loto-stat-gain">
                            <span>Distribué aux joueurs:</span>
                            <strong>{draw.prizeDistribution?.distributed?.toFixed(2) || '0.00'} da</strong>
                          </div>
                          <div className="loto-stat-gain">
                            <span>Part de la maison:</span>
                            <strong>{draw.prizeDistribution?.houseCut?.toFixed(2) || '0.00'} da</strong>
                          </div>
                        </div>
                      </div>
                      
                      {draw.winners && draw.winners.length > 0 && (
                        <div className="loto-section-tirage">
                          <h3>Liste des Gagnants</h3>
                          <div className="loto-liste-gagnants">
                            {draw.winners.slice(0, 5).map((winner, idx) => (
                              <div key={idx} className="loto-item-gagnant">
                                <div className="loto-avatar-gagnant">
                                  {winner.userName?.charAt(0) || 'G'}
                                </div>
                                <div className="loto-info-gagnant">
                                  <div className="loto-nom-gagnant">
                                    {winner.userName || 'Anonyme'}
                                  </div>
                                  <div className="loto-details-gagnant">
                                    {winner.matchedNumbers} numéros • {categories[winner.matchedNumbers]?.gain || '0'} da
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {draw.winners.length > 5 && (
                              <div className="loto-plus-gagnants">
                                + {draw.winners.length - 5} autre{draw.winners.length - 5 !== 1 ? 's' : ''} gagnant{draw.winners.length - 5 !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="loto-aucun-resultat">
                <div className="loto-illustration">
                  <i className="loto-icone">🎰</i>
                </div>
                <h3>Aucun tirage trouvé</h3>
                <p>Essayez de modifier vos critères de recherche</p>
                <button 
                  className="loto-bouton-primaire" 
                  onClick={resetFilters}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DrawsPage;