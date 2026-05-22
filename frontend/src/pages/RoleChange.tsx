import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './RoleChange.css';

const RoleChange: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [roleLabel, setRoleLabel] = useState('');
  const [animationPhase, setAnimationPhase] = useState<'flying' | 'zooming' | 'revealing' | 'complete'>('flying');
  const [cameraProgress, setCameraProgress] = useState(0);
  const [textRevealProgress, setTextRevealProgress] = useState(0);

  const role = searchParams.get('role');
  const targetRoute = 
    role === 'venditori' || role === 'seller' ? '/seller' :
    role === 'freelance' ? '/freelance' :
    '/dashboard';

  const getRoleLabel = (role: string | null) => {
    const labels: Record<string, string> = {
      admin: 'Amministratore',
      freelance: 'Freelance',
      venditori: 'Venditore',
      seller: 'Venditore',
      client: 'Cliente',
    };
    return labels[role || ''] || role || 'Utente';
  };

  useEffect(() => {
    if (role) {
      setRoleLabel(getRoleLabel(role));
    }
  }, [role]);

  useEffect(() => {
    // Animazione della camera - vola sopra la città
    const cameraInterval = setInterval(() => {
      setCameraProgress(prev => {
        const newProgress = prev + 0.4;
        if (newProgress >= 100) {
          clearInterval(cameraInterval);
          return 100;
        }
        return newProgress;
      });
    }, 16); // ~60fps

    return () => clearInterval(cameraInterval);
  }, []);

  useEffect(() => {
    // Animazione del testo reveal
    if (animationPhase === 'revealing' || animationPhase === 'complete') {
      const textInterval = setInterval(() => {
        setTextRevealProgress(prev => {
          if (prev >= 100) {
            clearInterval(textInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 16);

      return () => clearInterval(textInterval);
    }
  }, [animationPhase]);

  useEffect(() => {
    // Gestione delle fasi dell'animazione
    const phaseTimer = setTimeout(() => {
      setAnimationPhase('zooming');
    }, 2000);

    const zoomTimer = setTimeout(() => {
      setAnimationPhase('revealing');
    }, 4000);

    const revealTimer = setTimeout(() => {
      setAnimationPhase('complete');
    }, 5500);

    return () => {
      clearTimeout(phaseTimer);
      clearTimeout(zoomTimer);
      clearTimeout(revealTimer);
    };
  }, []);

  useEffect(() => {
    // Refresh user data e redirect quando l'animazione è completa
    const refreshAndRedirect = async () => {
      if (animationPhase !== 'complete') return;

      try {
        await refreshUser();
        
        // Verifica che il ruolo sia stato aggiornato correttamente
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            const storedRole = parsedUser.current_role || parsedUser.role;
            
            if (storedRole !== role) {
              console.warn('Role mismatch, waiting for sync...', { storedRole, expectedRole: role });
              await new Promise(resolve => setTimeout(resolve, 500));
              await refreshUser();
            }
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
        
        // Attendi un momento per l'animazione di uscita
        setTimeout(() => {
          window.location.replace(targetRoute);
        }, 1000);
      } catch (error) {
        console.error('Error refreshing user:', error);
        setTimeout(() => {
          window.location.replace(targetRoute);
        }, 1200);
      }
    };

    refreshAndRedirect();
  }, [animationPhase, role, targetRoute, refreshUser]);

  return (
    <div className="role-change-container">
      {/* Città 3D in background - più raffinata */}
      <div className="city-scene">
        <div 
          className="city-grid" 
          style={{ 
            transform: `translateZ(${-8000 + cameraProgress * 80}px) scale(${1 + cameraProgress * 0.015}) rotateX(${5 - cameraProgress * 0.05}deg)`,
            opacity: Math.max(0, 1 - cameraProgress * 0.01)
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <div 
              key={i} 
              className="building" 
              style={{
                left: `${(i % 8) * 12.5}%`,
                top: `${Math.floor(i / 8) * 12.5}%`,
                height: `${80 + Math.random() * 150}px`,
                animationDelay: `${i * 0.05}s`,
                opacity: Math.max(0, 0.6 - (cameraProgress / 100) * 0.6)
              }} 
            />
          ))}
        </div>
        
        {/* Grid pattern sottile */}
        <div className="city-grid-pattern" style={{ opacity: Math.max(0, 0.3 - cameraProgress * 0.003) }} />
      </div>

      {/* Overlay elegante */}
      <div className={`role-change-overlay phase-${animationPhase}`}>
        <div className="role-change-content">
          {/* Ruolo principale - stile Apple Intelligence */}
          <div className={`role-display ${animationPhase === 'revealing' || animationPhase === 'complete' ? 'visible' : ''}`}>
            <div className="role-label-wrapper">
              <span className="role-label">Ruolo</span>
            </div>
            
            <h1 
              className="role-title"
              style={{
                clipPath: `inset(0 ${100 - textRevealProgress}% 0 0)`,
                WebkitClipPath: `inset(0 ${100 - textRevealProgress}% 0 0)`
              }}
            >
              {roleLabel}
            </h1>
            
            <div className="role-divider" />
            
            <p 
              className="role-subtitle"
              style={{
                opacity: Math.max(0, (textRevealProgress - 30) / 70),
                transform: `translateY(${Math.max(0, 20 - (textRevealProgress - 30) / 70 * 20)}px)`
              }}
            >
              Benvenuto, <span className="user-name">{user?.nome || user?.name || 'Utente'}</span>
            </p>
          </div>

          {/* Indicatore di caricamento minimalista */}
          <div className={`loading-indicator ${animationPhase === 'complete' ? 'fade-out' : ''}`}>
            <div className="loading-bar-wrapper">
              <div 
                className="loading-progress" 
                style={{ width: `${cameraProgress}%` }}
              />
            </div>
            <p className="loading-text">Preparazione dashboard...</p>
          </div>
        </div>
      </div>

      {/* Particelle sottili e raffinate */}
      <div className="particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <div 
            key={i} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              opacity: 0.3 + Math.random() * 0.4
            }}
          />
        ))}
      </div>

      {/* Light rays effect */}
      <div className="light-rays" style={{ opacity: Math.max(0, 0.4 - cameraProgress * 0.004) }} />
    </div>
  );
};

export default RoleChange;

