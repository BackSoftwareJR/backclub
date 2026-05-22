import React from 'react';
import { useParams } from 'react-router-dom';

const SellerProjectDetailPage: React.FC = () => {
  const { id } = useParams();
  return <div>Dettaglio Progetto {id}</div>;
};

export default SellerProjectDetailPage;

