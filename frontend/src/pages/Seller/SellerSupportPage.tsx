import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Wallet, 
  Briefcase, 
  FileText, 
  Laptop, 
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Ticket,
  Phone,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supportCategories, allArticles, securityDocuments, securityFAQ } from '../../data/supportData';
import './SellerSupportPage.css';

const WHATSAPP_URL = 'https://wa.me/393513052627';
const SUPPORT_PHONE = 'tel:+393513052627';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
};

const SellerSupportPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTicketSuccess, setShowTicketSuccess] = useState(false);

  useEffect(() => {
    if ((location.state as { ticketCreated?: boolean })?.ticketCreated) {
      setShowTicketSuccess(true);
      window.history.replaceState({}, '', location.pathname);
      const t = setTimeout(() => setShowTicketSuccess(false), 4000);
      return () => clearTimeout(t);
    }
  }, [location.state, location.pathname]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<Set<string>>(new Set());

  const filteredArticles = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allArticles.filter(article => 
      article.title.toLowerCase().includes(term) ||
      article.content.toLowerCase().includes(term) ||
      article.tags?.some(tag => tag.toLowerCase().includes(term)) ||
      article.category.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      Wallet, Briefcase, FileText, Laptop, ShieldCheck
    };
    return icons[iconName] || FileText;
  };

  const getMobileTopicIcon = (categoryId: string, iconName: string) => {
    if (categoryId === 'amministrazione') return CreditCard;
    return getIcon(iconName);
  };

  const getIconColorClass = (color: string) => `icon-${color}`;

  const handleCategoryClick = (categoryId: string) => {
    if (categoryId === 'sicurezza') {
      setShowSecurityModal(true);
    } else if (categoryId === 'amministrazione') {
      navigate('/seller/supporto/amministrazione-provvigioni');
    } else if (categoryId === 'sales-kit') {
      navigate('/seller/supporto/sales-kit-prodotti');
    } else if (categoryId === 'contrattualistica') {
      navigate('/seller/supporto/contrattualistica');
    } else if (categoryId === 'tecnico') {
      navigate('/seller/supporto/tecnico-crm');
    } else {
      console.log('Category clicked:', categoryId);
    }
  };

  const toggleFAQ = (faqId: string) => {
    const newExpanded = new Set(expandedFAQ);
    if (newExpanded.has(faqId)) {
      newExpanded.delete(faqId);
    } else {
      newExpanded.add(faqId);
    }
    setExpandedFAQ(newExpanded);
  };

  const handleDownload = (url: string, title: string) => {
    console.log('Download:', url, title);
    alert(`Download di ${title} - URL: ${url}`);
  };

  const recommendedArticles = allArticles.slice(0, 5);

  return (
    <div className={`seller-support-page ${resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <AnimatePresence>
        {showTicketSuccess && (
          <motion.div
            className="support-ticket-success-banner"
            role="status"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            <CheckCircle2 size={16} />
            Segnalazione inviata con successo. Il team ti risponderà al più presto.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MOBILE LAYOUT ========== */}
      <div className="support-mobile-wrap">
        <header className="support-mobile-header">
          <h1 className="support-mobile-title">{t('menu.supporto')}</h1>
          <motion.div
            className="support-mobile-search-container"
            whileFocus={{ scale: 1.01 }}
          >
            <Search className="support-mobile-search-icon" size={18} strokeWidth={2} />
            <input
              type="text"
              className="support-mobile-search-input"
              placeholder="Cerca nel supporto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </motion.div>
        </header>

        <AnimatePresence>
          {searchTerm && filteredArticles.length > 0 && (
            <motion.div
              className="support-search-results support-mobile-search-results"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="support-search-results-header">
                <span>Trovati {filteredArticles.length} risultati</span>
              </div>
              <div className="support-search-results-list">
                {filteredArticles.map(article => (
                  <div key={article.id} className="support-search-result-item">
                    <h3>{article.title}</h3>
                    <p>{article.content.substring(0, 150)}...</p>
                    <span className="support-search-result-category">
                      {supportCategories.find(c => c.id === article.category)?.title}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {searchTerm && filteredArticles.length === 0 && searchTerm.trim() && (
          <div className="support-search-no-results support-mobile-no-results">
            <p>{t('support.no_results_for', { term: searchTerm })}</p>
          </div>
        )}

        <motion.section
          className="support-topics-section"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="support-topics-grid">
            {supportCategories.map(category => {
              const Icon = getMobileTopicIcon(category.id, category.icon);
              const iconColorClass = getIconColorClass(category.color);
              return (
                <motion.button
                  key={category.id}
                  type="button"
                  className="support-topic-card"
                  onClick={() => handleCategoryClick(category.id)}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className={`support-topic-card-icon ${iconColorClass}`}>
                    <Icon size={24} strokeWidth={2} />
                  </div>
                  <span className="support-topic-card-title">{category.title}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        <section className="support-contact-inset">
          <h2 className="support-inset-header">HAI BISOGNO DI AIUTO?</h2>
          <div className="support-inset-group">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="support-inset-row">
              <MessageCircle className="support-inset-icon support-inset-icon-green" size={22} strokeWidth={2} />
              <span className="support-inset-label">Chatta con noi</span>
              <span className="support-inset-detail">Tempo medio: 2 min</span>
              <ChevronRight className="support-inset-chevron" size={20} />
            </a>
            <button type="button" className="support-inset-row" onClick={() => navigate('/seller/supporto/nuovo-ticket')}>
              <Ticket className="support-inset-icon support-inset-icon-blue" size={22} strokeWidth={2} />
              <span className="support-inset-label">Apri Segnalazione</span>
              <span className="support-inset-detail">Admin/Tecnico</span>
              <ChevronRight className="support-inset-chevron" size={20} />
            </button>
            <a href={SUPPORT_PHONE} className="support-inset-row">
              <Phone className="support-inset-icon support-inset-icon-gray" size={22} strokeWidth={2} />
              <span className="support-inset-label">Chiama Supporto</span>
              <span className="support-inset-detail">Lun-Ven 09-18</span>
              <ChevronRight className="support-inset-chevron" size={20} />
            </a>
          </div>
        </section>

        {recommendedArticles.length > 0 && (
          <section className="support-articles-section">
            <h2 className="support-articles-title">Articoli Consigliati</h2>
            <div className="support-articles-list">
              {recommendedArticles.map((article, index) => (
                <React.Fragment key={article.id}>
                  <button type="button" className="support-article-row">
                    <span className="support-article-title">{article.title}</span>
                    <ChevronRight className="support-article-chevron" size={18} />
                  </button>
                  {index < recommendedArticles.length - 1 && <div className="support-article-divider" />}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ========== DESKTOP LAYOUT ========== */}
      <div className="support-desktop-wrap">
        <div className="support-hero">
          <motion.div
            className="support-hero-content"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 className="support-hero-greeting" variants={itemVariants}>
              Ciao {user?.name || 'Venditore'}, come possiamo aiutarti?
            </motion.h1>

            <motion.div className="support-search-container" variants={itemVariants}>
              <motion.div
                className="support-search-wrapper"
                whileFocus={{ scale: 1.01 }}
              >
                <Search className="support-search-icon" size={20} />
                <input
                  type="text"
                  className="support-search-input"
                  placeholder="Cerca nel supporto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </motion.div>

              <AnimatePresence>
                {searchTerm && filteredArticles.length > 0 && (
                  <motion.div
                    className="support-search-results"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="support-search-results-header">
                      <span>Trovati {filteredArticles.length} risultati</span>
                    </div>
                    <div className="support-search-results-list">
                      {filteredArticles.map(article => (
                        <div key={article.id} className="support-search-result-item">
                          <h3>{article.title}</h3>
                          <p>{article.content.substring(0, 150)}...</p>
                          <span className="support-search-result-category">
                            {supportCategories.find(c => c.id === article.category)?.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {searchTerm && filteredArticles.length === 0 && (
                <div className="support-search-no-results">
                  <p>{t('support.no_results_for', { term: searchTerm })}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="support-categories-container"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <div className="support-categories-grid">
            {supportCategories.map(category => {
              const Icon = getIcon(category.icon);
              const iconColorClass = getIconColorClass(category.color);
              return (
                <motion.div
                  key={category.id}
                  className="support-category-card"
                  onClick={() => handleCategoryClick(category.id)}
                  variants={itemVariants}
                  whileHover={{ y: -3, transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`support-category-icon ${iconColorClass}`}>
                    <Icon size={32} />
                  </div>
                  <div className="support-category-content">
                    <h2 className="support-category-title">{category.title}</h2>
                    <p className="support-category-description">{category.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          className="support-contact-strip"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          <motion.div className="support-contact-header" variants={itemVariants}>
            <h2>Hai bisogno di altro aiuto?</h2>
          </motion.div>
          <div className="support-contact-cards">
            <motion.a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="support-contact-card support-contact-whatsapp"
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <MessageCircle className="support-contact-icon" size={28} />
              <h3>Chat Rapida</h3>
              <p>Per urgenze dal cliente</p>
            </motion.a>
            <motion.button
              type="button"
              className="support-contact-card support-contact-ticket"
              onClick={() => navigate('/seller/supporto/nuovo-ticket')}
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <Ticket className="support-contact-icon" size={28} />
              <h3>Apri Segnalazione</h3>
              <p>Per problemi amministrativi</p>
            </motion.button>
            <motion.a
              href={SUPPORT_PHONE}
              className="support-contact-card support-contact-phone"
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <Phone className="support-contact-icon" size={28} />
              <h3>Supporto Telefonico</h3>
              <p>Lun-Ven 09-18</p>
            </motion.a>
          </div>
        </motion.div>
      </div>

      {/* Security & Privacy Modal */}
      <AnimatePresence>
        {showSecurityModal && (
          <motion.div
            className="support-modal-overlay"
            onClick={() => setShowSecurityModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="support-modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] as const }}
            >
              <div className="support-modal-header">
                <div className="support-modal-title-section">
                  <ShieldCheck className="support-modal-icon" size={32} />
                  <h2>Sicurezza &amp; Privacy</h2>
                </div>
                <button
                  className="support-modal-close"
                  onClick={() => setShowSecurityModal(false)}
                  aria-label="Chiudi"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="support-modal-body">
                <section className="support-modal-section">
                  <h3 className="support-modal-section-title">Documenti per i Clienti</h3>
                  <div className="support-documents-list">
                    {securityDocuments.map(doc => (
                      <div key={doc.id} className="support-document-item">
                        <div className="support-document-info">
                          <h4>{doc.title}</h4>
                          <p>{doc.description}</p>
                        </div>
                        <button
                          className="support-document-download"
                          onClick={() => handleDownload(doc.downloadUrl, doc.title)}
                        >
                          <Download size={16} />
                          <span>Scarica PDF</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="support-modal-section">
                  <h3 className="support-modal-section-title">Formazione Venditore - FAQ</h3>
                  <div className="support-faq-list">
                    {securityFAQ.map(faq => {
                      const isExpanded = expandedFAQ.has(faq.id);
                      return (
                        <div key={faq.id} className="support-faq-item">
                          <button
                            className="support-faq-question"
                            onClick={() => toggleFAQ(faq.id)}
                          >
                            <span>{faq.question}</span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                className="support-faq-answer"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22 }}
                              >
                                <p>{faq.answer}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SellerSupportPage;
