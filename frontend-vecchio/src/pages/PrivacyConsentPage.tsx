import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Lock } from 'lucide-react';
import api from '../lib/axios';

export default function PrivacyConsentPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAccept = async () => {
        setIsLoading(true);
        setError('');
        try {
            await api.post('/privacy-consent');
            // Refresh user to update has_consented status
            window.location.href = '/'; // Hard reload to ensure auth state is fresh
        } catch (err) {
            console.error('Failed to record consent', err);
            setError('Si è verificato un errore. Riprova.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full glass-card p-8 rounded-xl border border-blue-500/30 shadow-2xl shadow-blue-900/20">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Consenso Obbligatorio</h1>
                        <p className="text-slate-400">Richiesto per gli Amministratori di Sistema</p>
                    </div>
                </div>

                <div className="space-y-6 text-slate-300 mb-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-200 mb-6">
                        <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="font-bold">
                                ATTENZIONE: L'accesso alla dashboard è bloccato fino all'accettazione dei seguenti termini.
                                Il tuo indirizzo IP e i dettagli del dispositivo verranno registrati al momento dell'accettazione.
                            </p>
                        </div>
                    </div>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">1. Licenza d'Uso</h2>
                        <p className="leading-relaxed">
                            Il presente software è concesso in licenza d'uso limitata e non esclusiva.
                            La versione attuale opera sotto la licenza identificativa:
                        </p>
                        <div className="bg-slate-950 p-4 rounded-lg mt-2 font-mono text-sm text-blue-400 break-all border border-slate-800">
                            KSOAIDHUGH3o847872t36ty29(/Y/Y/U!(T"!&ET!VBEEMdkaihaj
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">2. Restrizioni di Rivendita</h2>
                        <p>
                            Questa versione del software NON può essere rivenduta, distribuita o sub-licenziata a terzi per scopi commerciali o di lucro senza l'esplicita autorizzazione scritta di Back Club.
                            Qualsiasi tentativo di copia, rivendita o distribuzione non autorizzata costituisce una violazione dei termini di licenza e sarà perseguito a norma di legge.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">3. Sicurezza e Hosting Dati</h2>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><strong>Residenza dei Dati:</strong> I dati sono ospitati su server sicuri situati in <strong>Germania</strong>.</li>
                            <li><strong>Backup:</strong> Vengono eseguiti backup giornalieri automatici replicati in <strong>Lituania</strong>.</li>
                            <li><strong>Monitoraggio:</strong> L'infrastruttura è protetta da un sistema di sicurezza esterno.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-3">4. Limitazione di Responsabilità</h2>
                        <p className="uppercase text-sm">
                            IL SOFTWARE VIENE FORNITO "COSÌ COM'È". IN NESSUN CASO BACK CLUB SARÀ RESPONSABILE PER DANNI DIRETTI, INDIRETTI, ACCIDENTALI O CONSEQUENZIALI DERIVANTI DALL'USO DI QUESTO SOFTWARE.
                        </p>
                    </section>
                </div>

                {error && (
                    <div className="text-red-400 text-sm mb-4 text-center">
                        {error}
                    </div>
                )}

                <div className="flex flex-col items-center gap-4 pt-6 border-t border-slate-800">
                    <p className="text-sm text-slate-500 text-center max-w-2xl">
                        Cliccando su "Accetto e Continuo", dichiari di aver letto, compreso e accettato integralmente i termini sopra riportati.
                        Confermi inoltre di essere un amministratore autorizzato.
                    </p>
                    <Button
                        size="lg"
                        className="w-full max-w-md text-lg py-6"
                        onClick={handleAccept}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Registrazione Consenso...' : 'Accetto e Continuo'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
