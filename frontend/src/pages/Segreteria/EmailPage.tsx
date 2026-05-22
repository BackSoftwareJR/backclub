import React, { useState } from 'react';
import { Mail, Search, Inbox, Send, Archive, Star, Paperclip, User } from 'lucide-react';
import './EmailPage.css';

interface Email {
  id: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  linkedTo?: {
    type: 'client' | 'invoice' | 'quote';
    id: number;
    name: string;
  };
}

const EmailPage: React.FC = () => {
  // const [emails, setEmails] = useState<Email[]>([]); // TODO: Load from API
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'archived'>('inbox');

  // Mock data
  const mockEmails: Email[] = [
    {
      id: 1,
      subject: 'Fattura n. 2025-001',
      from: 'cliente@example.com',
      to: 'segreteria@backclub.it',
      date: new Date().toISOString(),
      body: 'Gentile segreteria, in allegato la fattura...',
      isRead: false,
      isStarred: true,
      hasAttachments: true,
      linkedTo: { type: 'invoice', id: 1, name: 'FATT-2025-001' }
    },
  ];

  const filteredEmails = mockEmails.filter(email => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      email.subject.toLowerCase().includes(searchLower) ||
      email.from.toLowerCase().includes(searchLower) ||
      email.body.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="segreteria-email-page">
      <div className="venditori-page-header">
        <div>
          <h1 className="venditori-page-title">Comunicazioni</h1>
          <p className="venditori-page-subtitle">Gestisci email e comunicazioni</p>
        </div>
      </div>

      <div className="segreteria-email-container">
        {/* Sidebar Folders */}
        <div className="segreteria-email-sidebar">
          <button
            className={`segreteria-folder-btn ${folder === 'inbox' ? 'active' : ''}`}
            onClick={() => setFolder('inbox')}
          >
            <Inbox size={18} />
            <span>Posta in arrivo</span>
            <span className="segreteria-folder-count">12</span>
          </button>
          <button
            className={`segreteria-folder-btn ${folder === 'sent' ? 'active' : ''}`}
            onClick={() => setFolder('sent')}
          >
            <Send size={18} />
            <span>Inviati</span>
          </button>
          <button
            className={`segreteria-folder-btn ${folder === 'archived' ? 'active' : ''}`}
            onClick={() => setFolder('archived')}
          >
            <Archive size={18} />
            <span>Archiviati</span>
          </button>
        </div>

        {/* Email List */}
        <div className="segreteria-email-list">
          <div className="segreteria-email-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="venditori-search-input"
              placeholder="Cerca email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="segreteria-emails">
            {filteredEmails.length === 0 ? (
              <div className="venditori-empty-state">
                <Mail size={64} className="venditori-empty-state-icon" />
                <h3>Nessuna email trovata</h3>
              </div>
            ) : (
              filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className={`segreteria-email-item ${!email.isRead ? 'unread' : ''} ${selectedEmail?.id === email.id ? 'selected' : ''}`}
                  onClick={() => setSelectedEmail(email)}
                >
                  <div className="segreteria-email-header">
                    <div className="segreteria-email-from">
                      <User size={16} />
                      <span>{email.from}</span>
                    </div>
                    <div className="segreteria-email-meta">
                      {email.hasAttachments && <Paperclip size={14} />}
                      {email.isStarred && <Star size={14} fill="currentColor" />}
                      <span className="segreteria-email-date">
                        {new Date(email.date).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                  <div className="segreteria-email-subject">{email.subject}</div>
                  {email.linkedTo && (
                    <div className="segreteria-email-linked">
                      <span className="segreteria-linked-badge">
                        {email.linkedTo.type === 'invoice' ? 'Fattura' : 
                         email.linkedTo.type === 'quote' ? 'Preventivo' : 'Cliente'}: {email.linkedTo.name}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Detail */}
        <div className="segreteria-email-detail">
          {selectedEmail ? (
            <>
              <div className="segreteria-email-detail-header">
                <div>
                  <h2 className="segreteria-email-detail-subject">{selectedEmail.subject}</h2>
                  <div className="segreteria-email-detail-from">
                    <span>Da: {selectedEmail.from}</span>
                    <span>Per: {selectedEmail.to}</span>
                  </div>
                </div>
              </div>
              <div className="segreteria-email-detail-body">
                <p>{selectedEmail.body}</p>
                {selectedEmail.linkedTo && (
                  <div className="segreteria-email-link-section">
                    <strong>Collegato a:</strong>
                    <span className="segreteria-linked-badge">
                      {selectedEmail.linkedTo.type === 'invoice' ? 'Fattura' : 
                       selectedEmail.linkedTo.type === 'quote' ? 'Preventivo' : 'Cliente'}: {selectedEmail.linkedTo.name}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="segreteria-email-empty-detail">
              <Mail size={48} />
              <p>Seleziona un'email per visualizzarla</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailPage;

