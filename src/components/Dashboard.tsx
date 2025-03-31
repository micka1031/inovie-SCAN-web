import React, { useEffect, useState } from 'react';
import { db } from '../config/firebase';
import { collection, query, getDocs, Timestamp, where, orderBy, limit } from 'firebase/firestore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import './Dashboard.css';

// Enregistrer les composants ChartJS nécessaires
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  PointElement, 
  LineElement,
  Filler
);

interface Passage {
  id: string;
  siteDepart: string;
  dateHeureDepart: Timestamp;
  idColis: string;
  statut: 'Livré' | 'En cours';
  siteFin?: string;
  dateHeureFin?: Timestamp;
  coursierChargement?: string;
  coursierLivraison?: string;
  vehiculeId?: string;
  tourneeId?: string;
}

interface DashboardStats {
  livraisons: number;
  enCours: number;
  totalColis: number;
  tempsMoyen: string;
  tauxLivraison: number;
}

interface SiteStats {
  nom: string;
  count: number;
  color: string;
}

interface CoursierStats {
  nom: string;
  livraisons: number;
  color: string;
}

interface HourlyStats {
  heure: string;
  count: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    livraisons: 0,
    enCours: 0,
    totalColis: 0,
    tempsMoyen: '00:00',
    tauxLivraison: 0
  });
  const [siteStats, setSiteStats] = useState<SiteStats[]>([]);
  const [coursierStats, setCoursierStats] = useState<CoursierStats[]>([]);
  const [hourlyStats, setHourlyStats] = useState<HourlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentPassages, setRecentPassages] = useState<Passage[]>([]);

  // Couleurs pour les graphiques
  const colors = [
    '#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#F44336', 
    '#009688', '#673AB7', '#FF9800', '#03A9F4', '#E91E63'
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Récupérer tous les passages
        const passagesRef = collection(db, 'passages');
        const passagesSnapshot = await getDocs(passagesRef);
        const passagesData = passagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Passage[];

        // Récupérer les passages récents pour l'affichage dans le tableau
        const recentPassagesQuery = query(
          collection(db, 'passages'),
          orderBy('dateHeureDepart', 'desc'),
          limit(5)
        );
        const recentPassagesSnapshot = await getDocs(recentPassagesQuery);
        const recentPassagesData = recentPassagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Passage[];
        setRecentPassages(recentPassagesData);

        // Calculer les statistiques principales
        const livres = passagesData.filter(p => p.statut === 'Livré').length;
        const enCours = passagesData.filter(p => p.statut === 'En cours').length;
        const total = passagesData.length;
        
        // Calculer le temps moyen de livraison
        let tempsTotal = 0;
        let livraisonsAvecTemps = 0;
        
        passagesData.forEach(passage => {
          if (passage.statut === 'Livré' && passage.dateHeureDepart && passage.dateHeureFin) {
            const depart = passage.dateHeureDepart.toDate();
            const fin = passage.dateHeureFin.toDate();
            const diffMs = fin.getTime() - depart.getTime();
            tempsTotal += diffMs;
            livraisonsAvecTemps++;
          }
        });
        
        const tempsMoyenMs = livraisonsAvecTemps > 0 ? tempsTotal / livraisonsAvecTemps : 0;
        const tempsMoyenMinutes = Math.floor(tempsMoyenMs / 60000);
        const tempsMoyenHeures = Math.floor(tempsMoyenMinutes / 60);
        const tempsMoyenMinutesRestantes = tempsMoyenMinutes % 60;
        const tempsMoyenFormatted = `${tempsMoyenHeures.toString().padStart(2, '0')}:${tempsMoyenMinutesRestantes.toString().padStart(2, '0')}`;
        
        // Taux de livraison
        const tauxLivraison = total > 0 ? (livres / total) * 100 : 0;

        setStats({
          livraisons: livres,
          enCours: enCours,
          totalColis: total,
          tempsMoyen: tempsMoyenFormatted,
          tauxLivraison: Math.round(tauxLivraison)
        });

        // Statistiques par site
        const siteMap = new Map<string, number>();
        passagesData.forEach(passage => {
          const site = passage.siteDepart;
          siteMap.set(site, (siteMap.get(site) || 0) + 1);
        });
        
        const siteStatsData = Array.from(siteMap.entries())
          .map(([nom, count], index) => ({
            nom,
            count,
            color: colors[index % colors.length]
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setSiteStats(siteStatsData);

        // Statistiques par coursier
        const coursierMap = new Map<string, number>();
        passagesData.forEach(passage => {
          if (passage.coursierLivraison) {
            const coursier = passage.coursierLivraison;
            coursierMap.set(coursier, (coursierMap.get(coursier) || 0) + 1);
          }
        });
        
        const coursierStatsData = Array.from(coursierMap.entries())
          .map(([nom, livraisons], index) => ({
            nom,
            livraisons,
            color: colors[index % colors.length]
          }))
          .sort((a, b) => b.livraisons - a.livraisons)
          .slice(0, 5);
        
        setCoursierStats(coursierStatsData);

        // Statistiques par heure
        const hourMap = new Map<number, number>();
        passagesData.forEach(passage => {
          if (passage.dateHeureDepart) {
            const heure = passage.dateHeureDepart.toDate().getHours();
            hourMap.set(heure, (hourMap.get(heure) || 0) + 1);
          }
        });
        
        const hourlyStatsData = Array.from({ length: 24 }, (_, i) => i)
          .map(heure => ({
            heure: `${heure}h`,
            count: hourMap.get(heure) || 0
          }));
        
        setHourlyStats(hourlyStatsData);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        // Utiliser des données de démonstration en cas d'erreur
        setStats({
          livraisons: 235,
          enCours: 42,
          totalColis: 277,
          tempsMoyen: '01:12',
          tauxLivraison: 85
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Données pour le graphique des sites
  const sitePieData = {
    labels: siteStats.map(site => site.nom),
    datasets: [
      {
        data: siteStats.map(site => site.count),
        backgroundColor: siteStats.map(site => site.color),
        borderColor: siteStats.map(site => site.color),
        borderWidth: 1,
      },
    ],
  };

  // Données pour le graphique des coursiers
  const coursierBarData = {
    labels: coursierStats.map(coursier => coursier.nom),
    datasets: [
      {
        label: 'Livraisons effectuées',
        data: coursierStats.map(coursier => coursier.livraisons),
        backgroundColor: coursierStats.map(coursier => coursier.color),
        borderColor: coursierStats.map(coursier => coursier.color),
        borderWidth: 1,
      },
    ],
  };

  // Données pour le graphique par heure
  const hourlyLineData = {
    labels: hourlyStats.map(hour => hour.heure),
    datasets: [
      {
        label: 'Nombre de passages',
        data: hourlyStats.map(hour => hour.count),
        fill: true,
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        borderColor: 'rgba(33, 150, 243, 1)',
        tension: 0.4,
      },
    ],
  };

  // Options pour les graphiques
  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Répartition par site',
        font: {
          size: 16,
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Performance par coursier',
        font: {
          size: 16,
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Activité par heure',
        font: {
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  // Formater la date pour l'affichage
  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Tableau de bord</h1>
      
      {/* Cartes de statistiques */}
      <div className="stats-cards">
        <div className="stat-card delivered">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <h3>Livraisons effectuées</h3>
            <div className="stat-value">{stats.livraisons}</div>
            <div className="stat-progress">
              <div className="progress-bar" style={{ width: `${stats.tauxLivraison}%` }}></div>
            </div>
            <div className="stat-subtext">{stats.tauxLivraison}% du total</div>
          </div>
        </div>
        
        <div className="stat-card in-progress">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <h3>En cours de livraison</h3>
            <div className="stat-value">{stats.enCours}</div>
            <div className="stat-subtext">Colis en transit</div>
          </div>
        </div>
        
        <div className="stat-card total">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div className="stat-info">
            <h3>Total des colis</h3>
            <div className="stat-value">{stats.totalColis}</div>
            <div className="stat-subtext">Tous statuts confondus</div>
          </div>
        </div>
        
        <div className="stat-card time">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <h3>Temps moyen de livraison</h3>
            <div className="stat-value">{stats.tempsMoyen}</div>
            <div className="stat-subtext">Heures:Minutes</div>
          </div>
        </div>
      </div>
      
      {/* Graphiques */}
      <div className="dashboard-charts">
        <div className="chart-row">
          <div className="chart-card">
            <div className="chart-content">
              <Bar data={coursierBarData} options={barOptions} />
            </div>
          </div>
          
          <div className="chart-card">
            <div className="chart-content">
              <Pie data={sitePieData} options={pieOptions} />
            </div>
          </div>
        </div>
        
        <div className="chart-card full-width">
          <div className="chart-content">
            <Line data={hourlyLineData} options={lineOptions} />
          </div>
        </div>
      </div>
      
      {/* Tableau des passages récents */}
      <div className="recent-passages">
        <h2>Passages récents</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Colis</th>
                <th>Site de départ</th>
                <th>Date de départ</th>
                <th>Statut</th>
                <th>Coursier</th>
              </tr>
            </thead>
            <tbody>
              {recentPassages.map(passage => (
                <tr key={passage.id} className={passage.statut === 'Livré' ? 'status-delivered' : 'status-in-progress'}>
                  <td>{passage.idColis}</td>
                  <td>{passage.siteDepart}</td>
                  <td>{passage.dateHeureDepart ? formatDate(passage.dateHeureDepart) : 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${passage.statut === 'Livré' ? 'delivered' : 'in-progress'}`}>
                      {passage.statut}
                    </span>
                  </td>
                  <td>{passage.coursierLivraison || 'Non assigné'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
