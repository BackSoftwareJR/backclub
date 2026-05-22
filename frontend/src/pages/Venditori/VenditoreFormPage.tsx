import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Search, UserPlus, Users } from 'lucide-react';
import sellersApi, { type AvailableUser } from '../../api/sellers';
import type { SellerFormData } from '../../types/sellers';
import './VenditoreFormPage.css';

const VenditoreFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [formData, setFormData] = useState<SellerFormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    contract_start_date: '',
    contract_end_date: '',
    territory: [],
    commission_rate: 10,
    departments: [],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [territoryInput, setTerritoryInput] = useState('');
  const [creationMode, setCreationMode] = useState<'new' | 'existing'>('new');
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      loadSeller();
    }
  }, [id, isEdit]);

  // Carica utenti disponibili quando si seleziona la modalità "utente esistente"
  useEffect(() => {
    if (creationMode === 'existing' && !isEdit) {
      loadAvailableUsers();
    }
  }, [creationMode, isEdit]);

  // Ricerca utenti quando cambia il termine di ricerca
  useEffect(() => {
    if (creationMode === 'existing' && !isEdit) {
      const timeoutId = setTimeout(() => {
        loadAvailableUsers(userSearchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [userSearchTerm, creationMode, isEdit]);

  const loadAvailableUsers = async (search?: string) => {
    try {
      setLoadingUsers(true);
      const users = await sellersApi.getAvailableUsers(search, 20);
      setAvailableUsers(users);
    } catch (error) {
      console.error('Errore nel caricamento utenti disponibili:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSelect = (user: AvailableUser) => {
    setSelectedUserId(user.id);
    setFormData({
      ...formData,
      user_id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '', // Non serve password per utente esistente
    });
    setUserSearchTerm(user.name);
  };

  const handleCreationModeChange = (mode: 'new' | 'existing') => {
    setCreationMode(mode);
    setSelectedUserId(null);
    setUserSearchTerm('');
    if (mode === 'new') {
      setFormData({
        ...formData,
        user_id: undefined,
        name: '',
        email: '',
        phone: '',
        password: '',
      });
    }
  };

  const loadSeller = async () => {
    try {
      setLoading(true);
      const seller = await sellersApi.getById(Number(id));
      setFormData({
        name: seller.user?.name || '',
        email: seller.user?.email || '',
        phone: seller.user?.phone || '',
        contract_start_date: seller.contract_start_date || '',
        contract_end_date: seller.contract_end_date || '',
        territory: seller.territory || [],
        commission_rate: seller.commission_rate || 10,
        departments: seller.departments?.map(d => d.id) || [],
      });
    } catch (error) {
      console.error('Errore nel caricamento venditore:', error);
      alert('Errore nel caricamento del venditore');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validazione: se si usa un utente esistente, deve essere selezionato
    if (!isEdit && creationMode === 'existing' && !selectedUserId) {
      alert('Seleziona un utente dalla lista o passa alla modalità "Crea Nuovo Utente"');
      return;
    }

    setSaving(true);

    try {
      if (isEdit && id) {
        await sellersApi.update(Number(id), formData);
      } else {
        // Prepara i dati per l'invio
        const submitData: SellerFormData = { ...formData };
        
        // Se si usa un utente esistente, rimuovi password e campi non necessari
        if (creationMode === 'existing' && selectedUserId) {
          submitData.user_id = selectedUserId;
          // Rimuovi password se presente (non serve per utente esistente)
          delete submitData.password;
        } else {
          // Per nuovo utente, assicurati che password sia presente
          if (!submitData.password) {
            alert('La password è obbligatoria per creare un nuovo utente');
            setSaving(false);
            return;
          }
        }
        
        await sellersApi.create(submitData);
      }
      navigate('/venditori/amministrazione-venditori');
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error);
      alert(error.response?.data?.error || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const addTerritory = () => {
    if (territoryInput.trim() && !formData.territory?.includes(territoryInput.trim())) {
      setFormData({
        ...formData,
        territory: [...(formData.territory || []), territoryInput.trim()],
      });
      setTerritoryInput('');
    }
  };

  const removeTerritory = (territory: string) => {
    setFormData({
      ...formData,
      territory: formData.territory?.filter(t => t !== territory) || [],
    });
  };

  if (loading) {
    return (
      <div className="venditori-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="venditore-form-page">
      <div className="form-header">
        <button 
          className="btn-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={18} />
          Indietro
        </button>
        <h1 className="venditori-page-title">
          {isEdit ? 'Modifica Venditore' : 'Nuovo Venditore'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="venditore-form">
        {!isEdit && (
          <div className="form-section">
            <h3 className="form-section-title">Selezione Utente</h3>
            <div className="creation-mode-selector">
              <button
                type="button"
                className={`mode-button ${creationMode === 'new' ? 'active' : ''}`}
                onClick={() => handleCreationModeChange('new')}
              >
                <UserPlus size={18} />
                Crea Nuovo Utente
              </button>
              <button
                type="button"
                className={`mode-button ${creationMode === 'existing' ? 'active' : ''}`}
                onClick={() => handleCreationModeChange('existing')}
              >
                <Users size={18} />
                Usa Utente Esistente
              </button>
            </div>

            {creationMode === 'existing' && (
              <div className="user-selector">
                <div className="form-group">
                  <label>Cerca Utente</label>
                  <div className="user-search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Cerca per nome o email..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="user-search-input"
                    />
                  </div>
                </div>
                {loadingUsers ? (
                  <div className="users-loading">Caricamento utenti...</div>
                ) : availableUsers.length > 0 ? (
                  <div className="users-list">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`user-item ${selectedUserId === user.id ? 'selected' : ''}`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="user-info">
                          <div className="user-name">{user.name}</div>
                          <div className="user-email">{user.email}</div>
                          {user.phone && <div className="user-phone">{user.phone}</div>}
                          {user.roles.length > 0 && (
                            <div className="user-roles">
                              Ruoli: {user.roles.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : userSearchTerm ? (
                  <div className="users-empty">Nessun utente trovato</div>
                ) : (
                  <div className="users-empty">Inizia a cercare un utente...</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-section">
          <h3 className="form-section-title">Informazioni Personali</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome Completo *</label>
              <input
                type="text"
                required={creationMode === 'new' || isEdit}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={creationMode === 'existing' && selectedUserId !== null && !isEdit}
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                required={creationMode === 'new' || isEdit}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={creationMode === 'existing' && selectedUserId !== null && !isEdit}
              />
            </div>
            <div className="form-group">
              <label>Telefono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={creationMode === 'existing' && selectedUserId !== null && !isEdit}
              />
            </div>
            {!isEdit && creationMode === 'new' && (
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Contratto</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Data Inizio Contratto</label>
              <input
                type="date"
                value={formData.contract_start_date}
                onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Data Scadenza Contratto</label>
              <input
                type="date"
                value={formData.contract_end_date}
                onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Provvigione (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Territorio</h3>
          <div className="territory-input-group">
            <input
              type="text"
              placeholder="Aggiungi territorio (es: Lombardia, Piemonte...)"
              value={territoryInput}
              onChange={(e) => setTerritoryInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTerritory();
                }
              }}
            />
            <button type="button" onClick={addTerritory} className="btn-add-territory">
              Aggiungi
            </button>
          </div>
          {formData.territory && formData.territory.length > 0 && (
            <div className="territory-tags">
              {formData.territory.map((territory, idx) => (
                <span key={idx} className="territory-tag">
                  {territory}
                  <button
                    type="button"
                    onClick={() => removeTerritory(territory)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="venditori-btn venditori-btn-secondary"
            onClick={() => navigate(-1)}
          >
            Annulla
          </button>
          <button
            type="submit"
            className="venditori-btn venditori-btn-primary"
            disabled={saving}
          >
            <Save size={18} />
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VenditoreFormPage;

