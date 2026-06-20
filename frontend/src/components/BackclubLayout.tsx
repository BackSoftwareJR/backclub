import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/backclub.css';

interface BackclubLayoutProps {
  children: React.ReactNode;
}

const BackclubLayout: React.FC<BackclubLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHome = location.pathname === '/';
  const isImmersive =
    isHome ||
    location.pathname === '/filosofia' ||
    location.pathname === '/contatti' ||
    location.pathname === '/login' ||
    location.pathname === '/richiedi-accesso';

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className={`backclub-container${isImmersive ? ' backclub-container-dark' : ''}`}>
      <nav className={`backclub-nav${isImmersive ? ' backclub-nav-dark' : ''}`}>
        <div className={`backclub-nav-content${isHome ? ' backclub-nav-content-home' : ''}`}>
          {!isHome && (
            <Link to="/" className="backclub-nav-logo" onClick={closeMenu}>
              BackClub
            </Link>
          )}
          <button 
            className="backclub-nav-toggle"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <span className={`backclub-nav-toggle-icon ${isMenuOpen ? 'open' : ''}`}></span>
          </button>
          <ul className={`backclub-nav-links ${isMenuOpen ? 'open' : ''}`}>
            <li>
              <Link
                to="/"
                className={`backclub-nav-link ${location.pathname === '/' ? 'active' : ''}`}
                onClick={closeMenu}
              >
                home
              </Link>
            </li>
            <li>
              <Link
                to="/filosofia"
                className={`backclub-nav-link ${location.pathname === '/filosofia' ? 'active' : ''}`}
                onClick={closeMenu}
              >
                filosofia
              </Link>
            </li>
            <li>
              <Link
                to="/contatti"
                className={`backclub-nav-link ${location.pathname === '/contatti' ? 'active' : ''}`}
                onClick={closeMenu}
              >
                contatti
              </Link>
            </li>
            <li className="backclub-nav-item-cta">
              <Link
                to="/login"
                className="backclub-nav-cta"
                onClick={closeMenu}
              >
                accedi
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      <main style={{ paddingTop: isImmersive ? 0 : '44px' }}>
        {children}
      </main>
      {!isImmersive && (
      <footer className="backclub-footer">
        <p className="backclub-footer-text">
          Un progetto da scoprire
        </p>
      </footer>
      )}
    </div>
  );
};

export default BackclubLayout;

