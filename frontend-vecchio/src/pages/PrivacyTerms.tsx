import { DashboardLayout } from '../components/layout/DashboardLayout';

export default function PrivacyTerms() {
    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="glass-card p-8 rounded-xl">
                    <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy e Termini e Condizioni</h1>

                    <div className="space-y-6 text-slate-300">
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
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-red-200">
                                <p className="font-bold mb-2">ATTENZIONE:</p>
                                <p>
                                    Questa versione del software NON può essere rivenduta, distribuita o sub-licenziata a terzi per scopi commerciali o di lucro senza l'esplicita autorizzazione scritta di Back Club.
                                    Qualsiasi tentativo di copia, rivendita o distribuzione non autorizzata costituisce una violazione dei termini di licenza e sarà perseguito a norma di legge.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">3. Sicurezza e Hosting Dati</h2>
                            <p className="leading-relaxed mb-2">
                                La sicurezza dei dati è una priorità assoluta. Per garantire la massima protezione e conformità:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                                <li><strong>Residenza dei Dati:</strong> I dati sono ospitati su server sicuri situati in <strong>Germania</strong>.</li>
                                <li><strong>Backup:</strong> Vengono eseguiti backup giornalieri automatici replicati in <strong>Lituania</strong> per garantire la ridondanza e il recupero in caso di disastri.</li>
                                <li><strong>Monitoraggio:</strong> L'infrastruttura è protetta da un sistema di sicurezza esterno che monitora costantemente i log di accesso e blocca tentativi di intrusione non autorizzati.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">4. Limitazione di Responsabilità</h2>
                            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
                                <p className="leading-relaxed text-sm text-slate-400">
                                    IL SOFTWARE VIENE FORNITO "COSÌ COM'È", SENZA ALCUNA GARANZIA ESPLICITA O IMPLICITA.
                                    IN NESSUN CASO <strong>BACK CLUB</strong> SARÀ RESPONSABILE PER DANNI DIRETTI, INDIRETTI, ACCIDENTALI, SPECIALI, ESEMPLARI O CONSEQUENZIALI (INCLUSI, MA NON LIMITATI A, ACQUISIZIONE DI BENI O SERVIZI SOSTITUTIVI; PERDITA DI UTILIZZO, DATI O PROFITTI; O INTERRUZIONE DELL'ATTIVITÀ) COMUNQUE CAUSATI E SU QUALSIASI TEORIA DI RESPONSABILITÀ, SIA ESSA CONTRATTUALE, RESPONSABILITÀ STRETTA O TORTO (INCLUSA NEGLIGENZA O ALTRO) DERIVANTI IN QUALSIASI MODO DALL'USO DI QUESTO SOFTWARE, ANCHE SE AVVISATI DELLA POSSIBILITÀ DI TALI DANNI.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">5. Proprietà Intellettuale</h2>
                            <p className="leading-relaxed">
                                Il progetto è stato realizzato e sviluppato da <strong>Back Club</strong>.
                                Tutti i diritti di proprietà intellettuale, inclusi copyright e marchi, rimangono di proprietà esclusiva di Back Club.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-white mb-3">6. Contatti e Licenze Commerciali</h2>
                            <p className="leading-relaxed mb-4">
                                Per ottenere copie rivendibili, licenze commerciali estese o per qualsiasi informazione riguardante i diritti di utilizzo, si prega di contattare direttamente Back Club:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Sito Web: <a href="https://backclub.it" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">https://backclub.it</a></li>
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
