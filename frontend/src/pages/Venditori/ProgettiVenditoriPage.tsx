import React from 'react';
import GestioneProgettiPage from '../GestioneProgetti/GestioneProgettiPage';

/**
 * ProgettiVenditoriPage - Reindirizza alla pagina Gestione Progetti
 * Questa pagina mostra tutti i progetti avviati dai contratti,
 * accessibile anche dalla sezione Venditori
 */
const ProgettiVenditoriPage: React.FC = () => {
  // Usa direttamente la pagina GestioneProgettiPage
  // che mostra tutti i progetti con filtri e gestione completa
  return <GestioneProgettiPage />;
};

export default ProgettiVenditoriPage;

