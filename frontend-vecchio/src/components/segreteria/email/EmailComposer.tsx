import { useState } from 'react';
import { Mail, Paperclip, X, Send, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../lib/axios';

interface EmailComposerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    defaultTo?: string[];
    defaultSubject?: string;
    defaultBody?: string;
}

export function EmailComposer({ 
    isOpen, 
    onClose, 
    onSuccess,
    defaultTo = [],
    defaultSubject = '',
    defaultBody = ''
}: EmailComposerProps) {
    const [to, setTo] = useState<string[]>(defaultTo);
    const [toInput, setToInput] = useState('');
    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultBody);
    const [attachments, setAttachments] = useState<number[]>([]);
    const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
    const [showDocumentPicker, setShowDocumentPicker] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const addRecipient = () => {
        const email = toInput.trim();
        if (email && email.includes('@') && !to.includes(email)) {
            setTo([...to, email]);
            setToInput('');
        }
    };

    const removeRecipient = (email: string) => {
        setTo(to.filter(e => e !== email));
    };

    const handleSend = async () => {
        if (to.length === 0 || !subject || !body) {
            return;
        }

        setIsSending(true);
        try {
            await api.post('/email/send-custom', {
                to,
                subject,
                body,
                attachments: attachments.length > 0 ? attachments : undefined,
            });

            onSuccess?.();
            onClose();
            // Reset form
            setTo([]);
            setSubject('');
            setBody('');
            setAttachments([]);
        } catch (error) {
            console.error('Failed to send email', error);
        } finally {
            setIsSending(false);
        }
    };

    const loadDocuments = async () => {
        try {
            const response = await api.get('/segreteria/documents', { params: { per_page: 50 } });
            setAvailableDocuments(response.data.data || response.data);
        } catch (error) {
            console.error('Failed to load documents', error);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-semibold text-white">Invia Email</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {/* To */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Destinatari</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {to.map((email) => (
                                    <span
                                        key={email}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-400"
                                    >
                                        {email}
                                        <button
                                            onClick={() => removeRecipient(email)}
                                            className="hover:text-blue-300"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={toInput}
                                    onChange={(e) => setToInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                                    placeholder="Aggiungi email..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={addRecipient}
                                    className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs hover:bg-blue-500/20 transition-colors"
                                >
                                    Aggiungi
                                </button>
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Oggetto</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Oggetto email..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Messaggio</label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Scrivi il messaggio..."
                                rows={10}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>

                        {/* Attachments */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-medium text-slate-400">Allegati</label>
                                <button
                                    onClick={() => {
                                        setShowDocumentPicker(!showDocumentPicker);
                                        if (!showDocumentPicker) loadDocuments();
                                    }}
                                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    <Paperclip className="w-3 h-3" />
                                    Scegli documenti
                                </button>
                            </div>
                            {attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {attachments.map((docId) => {
                                        const doc = availableDocuments.find(d => d.id === docId);
                                        return doc ? (
                                            <span
                                                key={docId}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300"
                                            >
                                                <FileText className="w-3 h-3" />
                                                {doc.original_name}
                                                <button
                                                    onClick={() => setAttachments(attachments.filter(id => id !== docId))}
                                                    className="hover:text-white"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                            {showDocumentPicker && (
                                <div className="mt-2 max-h-40 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg p-2 space-y-1">
                                    {availableDocuments.map((doc) => (
                                        <button
                                            key={doc.id}
                                            onClick={() => {
                                                if (!attachments.includes(doc.id)) {
                                                    setAttachments([...attachments, doc.id]);
                                                }
                                            }}
                                            className="w-full text-left px-2 py-1.5 hover:bg-slate-700 rounded text-xs text-slate-300 flex items-center gap-2"
                                        >
                                            <FileText className="w-3 h-3" />
                                            {doc.original_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-800">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={to.length === 0 || !subject || !body || isSending}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-3 h-3" />
                            {isSending ? 'Invio...' : 'Invia'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

