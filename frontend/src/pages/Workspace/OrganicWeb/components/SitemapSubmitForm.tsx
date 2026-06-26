import React, { useState } from 'react';
import { Plus, Loader } from 'lucide-react';
import organicWebApi from '../../../../api/organicWeb';

interface SitemapSubmitFormProps {
    projectId: number;
    onSubmitted: () => void;
}

const SitemapSubmitForm: React.FC<SitemapSubmitFormProps> = ({ projectId, onSubmitted }) => {
    const [url, setUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;
        setSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            await organicWebApi.submitSitemap(projectId, url.trim());
            setSuccess(true);
            setUrl('');
            onSubmitted();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore durante l\'invio della sitemap.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="ow-sitemap-submit-form">
            <div className="ow-form-group" style={{ marginBottom: 0 }}>
                <label className="ow-label">URL Sitemap</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        type="url"
                        className="ow-input"
                        placeholder="https://esempio.com/sitemap.xml"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        required
                    />
                    <button
                        type="submit"
                        className="ow-btn ow-btn--primary"
                        disabled={submitting || !url.trim()}
                        style={{ flexShrink: 0 }}
                    >
                        {submitting ? <Loader size={13} className="ws-spin" /> : <Plus size={13} />}
                        Invia
                    </button>
                </div>
            </div>
            {error && <div className="ow-error-row" style={{ marginTop: 8 }}>{error}</div>}
            {success && <div className="ow-success-row" style={{ marginTop: 8 }}>Sitemap inviata con successo.</div>}
        </form>
    );
};

export default SitemapSubmitForm;
