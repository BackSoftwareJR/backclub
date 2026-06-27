import React, { useState, useEffect } from 'react';
import { Search, Loader, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import organicWebApi from '../api/organicWeb';
import type { AiSuggestionGroup, PageSpeedVerification } from '../api/organicWeb';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImplementationVerifierProps {
    projectId: number;
    lastAuditId?: number;
    suggestionGroups?: AiSuggestionGroup[];
    onReanalyze?: () => void;
}

type VerifierState = 'idle' | 'verifying' | 'result' | 'confirmed';

// ─── Star Rating ──────────────────────────────────────────────────────────────

const StarRating: React.FC<{ score: number }> = ({ score }) => {
    const stars = Math.round((score / 10) * 5);
    return (
        <span className="ow-quality-stars" aria-label={`${score} su 10`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>★</span>
            ))}
        </span>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

const ImplementationVerifier: React.FC<ImplementationVerifierProps> = ({
    projectId,
    lastAuditId,
    suggestionGroups = [],
    onReanalyze,
}) => {
    const [state, setState] = useState<VerifierState>('idle');
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [customContext, setCustomContext] = useState('');
    const [verification, setVerification] = useState<PageSpeedVerification | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pastVerifications, setPastVerifications] = useState<PageSpeedVerification[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        organicWebApi.listPageSpeedVerifications(projectId)
            .then(res => setPastVerifications(res.verifications ?? []))
            .catch(() => { /* silent */ });
    }, [projectId]);

    const handleVerify = async () => {
        const context = customContext.trim() || selectedArea;
        if (!context) return;

        setState('verifying');
        setError(null);
        setVerification(null);

        try {
            const res = await organicWebApi.verifyPageSpeedImplementation(
                projectId,
                context,
                lastAuditId
            );
            setVerification(res.verification);
            setState('result');
            // Refresh history
            organicWebApi.listPageSpeedVerifications(projectId)
                .then(r => setPastVerifications(r.verifications ?? []))
                .catch(() => { /* silent */ });
        } catch {
            setError(
                'Errore durante la verifica. Assicurati che il repository GitHub sia configurato nelle impostazioni del progetto.'
            );
            setState('idle');
        }
    };

    const contextForVerify = customContext.trim() || selectedArea;

    const result = verification?.verification_result;
    const qualityScore = verification?.quality_score ?? result?.quality_score ?? null;

    return (
        <div className="ow-verifier">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Search size={16} style={{ color: '#a78bfa' }} />
                    <h3 style={{ margin: 0, fontSize: 'var(--ws-font-md)', color: 'var(--ws-text)', fontWeight: 600 }}>
                        Verifica Implementazione
                    </h3>
                </div>
                {pastVerifications.length > 0 && (
                    <button
                        className="ow-btn ow-btn--ghost"
                        style={{ fontSize: 'var(--ws-font-xs)', padding: '3px 10px' }}
                        onClick={() => setShowHistory(h => !h)}
                    >
                        {showHistory ? 'Nascondi' : 'Storico'} ({pastVerifications.length})
                    </button>
                )}
            </div>

            {/* ── History ── */}
            {showHistory && pastVerifications.length > 0 && (
                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pastVerifications.slice(0, 5).map(v => (
                        <div key={v.id} className="ow-verifier-result" style={{ cursor: 'pointer' }} onClick={() => {
                            setVerification(v);
                            setState('result');
                            setShowHistory(false);
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {v.completed
                                    ? <CheckCircle size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
                                    : <XCircle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />}
                                <span style={{ fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text)', flex: 1 }}>
                                    {v.implementation_context.length > 60
                                        ? `${v.implementation_context.slice(0, 60)}…`
                                        : v.implementation_context}
                                </span>
                                {v.quality_score != null && (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>
                                        {v.quality_score}/10
                                    </span>
                                )}
                                <span style={{ fontSize: 10, color: 'var(--ws-text-tertiary)', whiteSpace: 'nowrap' }}>
                                    {new Date(v.created_at).toLocaleDateString('it-IT')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── State: Idle ── */}
            {state === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ margin: 0, fontSize: 'var(--ws-font-sm)', color: 'var(--ws-text-secondary)' }}>
                        L'agente ha applicato un fix? Verifica l'implementazione analizzando il repository GitHub del progetto.
                    </p>

                    {suggestionGroups.length > 0 && (
                        <div className="ow-form-group" style={{ marginBottom: 0 }}>
                            <label className="ow-label">Area da verificare</label>
                            <select
                                className="ow-select"
                                value={selectedArea}
                                onChange={e => setSelectedArea(e.target.value)}
                            >
                                <option value="">— Seleziona area —</option>
                                {suggestionGroups.map((g, i) => (
                                    <option key={i} value={g.area}>{g.area}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="ow-form-group" style={{ marginBottom: 0 }}>
                        <label className="ow-label">
                            {suggestionGroups.length > 0 ? 'Oppure descrivi cosa è stato implementato' : 'Descrivi cosa è stato implementato'}
                        </label>
                        <textarea
                            className="ow-textarea"
                            rows={3}
                            placeholder="Es: ottimizzazione immagini con lazy loading e compressione WebP applicata su tutte le pagine…"
                            value={customContext}
                            onChange={e => setCustomContext(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="ow-error-row">
                            <AlertCircle size={13} /> {error}
                        </div>
                    )}

                    <button
                        className="ow-btn ow-btn--primary"
                        onClick={handleVerify}
                        disabled={!contextForVerify}
                    >
                        <Search size={13} /> Verifica con Canopy Wave
                    </button>
                </div>
            )}

            {/* ── State: Verifying ── */}
            {state === 'verifying' && (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 12, padding: '24px 0',
                }}>
                    <Loader size={28} className="ws-spin" style={{ color: '#a78bfa' }} />
                    <p style={{ margin: 0, fontSize: 'var(--ws-font-sm)', color: 'var(--ws-text-secondary)', textAlign: 'center' }}>
                        Analisi repository GitHub in corso…
                    </p>
                    <p style={{ margin: 0, fontSize: 'var(--ws-font-xs)', color: 'var(--ws-text-tertiary)', textAlign: 'center' }}>
                        Canopy Wave sta leggendo il codice e confrontando con i requisiti
                    </p>
                </div>
            )}

            {/* ── State: Result ── */}
            {state === 'result' && verification && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {result?.completed
                            ? <CheckCircle size={18} style={{ color: '#22c55e' }} />
                            : <XCircle size={18} style={{ color: '#ef4444' }} />}
                        <h4 style={{ margin: 0, fontSize: 'var(--ws-font-md)', color: 'var(--ws-text)' }}>
                            Report di Verifica
                        </h4>
                    </div>

                    {qualityScore !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <StarRating score={qualityScore} />
                            <span style={{ fontSize: 'var(--ws-font-sm)', color: 'var(--ws-text-secondary)' }}>
                                {qualityScore}/10
                            </span>
                        </div>
                    )}

                    <div className="ow-verifier-result">
                        {result?.findings && result.findings.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <p style={{
                                    margin: '0 0 8px', fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.07em', textTransform: 'uppercase',
                                    color: '#22c55e',
                                }}>
                                    Trovato
                                </p>
                                {result.findings.map((f, i) => (
                                    <div key={i} className="ow-finding-item">
                                        <CheckCircle size={12} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                                        <span>{f}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {result?.missing && result.missing.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <p style={{
                                    margin: '0 0 8px', fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.07em', textTransform: 'uppercase',
                                    color: '#f87171',
                                }}>
                                    Da migliorare
                                </p>
                                {result.missing.map((m, i) => (
                                    <div key={i} className="ow-finding-item">
                                        <XCircle size={12} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                                        <span>{m}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {result?.recommendations && result.recommendations.length > 0 && (
                            <div>
                                <p style={{
                                    margin: '0 0 8px', fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.07em', textTransform: 'uppercase',
                                    color: '#fbbf24',
                                }}>
                                    Raccomandazioni
                                </p>
                                {result.recommendations.map((r, i) => (
                                    <div key={i} className="ow-finding-item">
                                        <AlertCircle size={12} style={{ color: '#fbbf24', flexShrink: 0, marginTop: 1 }} />
                                        <span>{r}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p style={{ margin: 0, fontSize: 'var(--ws-font-sm)', color: 'var(--ws-text-secondary)' }}>
                        Le modifiche sono state applicate correttamente?
                    </p>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            className="ow-btn ow-btn--primary"
                            style={{ flex: 1 }}
                            onClick={() => setState('confirmed')}
                        >
                            <CheckCircle size={13} /> Sì, applicate
                        </button>
                        <button
                            className="ow-btn ow-btn--ghost"
                            style={{ flex: 1 }}
                            onClick={() => {
                                setState('idle');
                                setVerification(null);
                            }}
                        >
                            <XCircle size={13} /> No, rivedi
                        </button>
                    </div>
                </div>
            )}

            {/* ── State: Confirmed ── */}
            {state === 'confirmed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle size={18} style={{ color: '#22c55e' }} />
                        <p style={{ margin: 0, fontSize: 'var(--ws-font-sm)', color: '#4ade80' }}>
                            Implementazione confermata. Puoi ora rianalizzare le performance.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        {onReanalyze && (
                            <button
                                className="ow-btn ow-btn--primary"
                                onClick={() => {
                                    setState('idle');
                                    setVerification(null);
                                    onReanalyze();
                                }}
                            >
                                <RefreshCw size={13} /> Rianalizza PageSpeed
                            </button>
                        )}
                        <button
                            className="ow-btn ow-btn--ghost"
                            onClick={() => {
                                setState('idle');
                                setVerification(null);
                                setCustomContext('');
                                setSelectedArea('');
                            }}
                        >
                            Nuova verifica
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImplementationVerifier;
