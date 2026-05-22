import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/backclub.css';

interface BackclubLayoutProps {
  children: React.ReactNode;
}

const BackclubLayout: React.FC<BackclubLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <div className="backclub-container">
      <nav className="backclub-nav">
        <div className="backclub-nav-content">
          <Link to="/" className="backclub-nav-logo" onClick={closeMenu}>
            Backclub
          </Link>
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
                style={location.pathname === '/' ? { color: 'var(--backclub-accent)' } : {}}
                onClick={closeMenu}
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                to="/filosofia" 
                className={`backclub-nav-link ${location.pathname === '/filosofia' ? 'active' : ''}`}
                style={location.pathname === '/filosofia' ? { color: 'var(--backclub-accent)' } : {}}
                onClick={closeMenu}
              >
                Filosofia
              </Link>
            </li>
            <li>
              <Link 
                to="/contatti" 
                className={`backclub-nav-link ${location.pathname === '/contatti' ? 'active' : ''}`}
                style={location.pathname === '/contatti' ? { color: 'var(--backclub-accent)' } : {}}
                onClick={closeMenu}
              >
                Contatti
              </Link>
            </li>
            <li>
              <Link 
                to="/login" 
                className="backclub-nav-link backclub-nav-link-accent"
                onClick={closeMenu}
              >
                Accedi
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      <main style={{ paddingTop: '80px' }}>
        {children}
      </main>
      <footer className="backclub-footer">
        <p className="backclub-footer-text">
          Un progetto di <a href="https://backsoftware.it" target="_blank" rel="noopener noreferrer" className="backclub-link">Backsoftware.it</a>
        </p>
      </footer>
    </div>
  );
};

export default BackclubLayout;

