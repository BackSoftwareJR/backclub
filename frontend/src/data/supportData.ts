export interface SupportArticle {
  id: string;
  title: string;
  category: 'amministrazione' | 'sales-kit' | 'contrattualistica' | 'tecnico' | 'sicurezza';
  content: string; // HTML/Markdown
  downloadUrl?: string;
  tags?: string[];
}

export interface SupportCategory {
  id: string;
  title: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  articles: SupportArticle[];
}

export const supportCategories: SupportCategory[] = [
  {
    id: 'amministrazione',
    title: 'Amministrazione & Provvigioni',
    description: 'Pagamenti, fatture, calcolo fee e storico bonifici.',
    icon: 'Wallet',
    color: 'purple',
    articles: [
      {
        id: 'admin-1',
        title: 'Come funzionano le commissioni',
        category: 'amministrazione',
        content: 'La tua percentuale di commissione è definita nel contratto e varia per ogni venditore. La commissione si calcola sull\'importo delle rate dei servizi effettivamente pagate dal cliente, non su rinnovi, hosting o dominio. I crediti diventano disponibili quando il cliente paga la fattura; dovrai essere in possesso di partita IVA ed emettere fattura quando i crediti risultano prelevabili.',
        tags: ['commissioni', 'provvigioni', 'fee', 'partita iva']
      },
      {
        id: 'admin-2',
        title: 'Crediti presunti, in attesa e disponibili',
        category: 'amministrazione',
        content: 'Crediti presunti o previsti: rate del piano di pagamento del contratto non ancora fatturate. In attesa: fattura emessa ma cliente non ha ancora pagato. Disponibili (da riscuotere): il cliente ha pagato, puoi emettere fattura e richiedere il bonifico. Consulta la sezione Commissioni per dettagli e storico.',
        tags: ['crediti', 'presunti', 'attesa', 'bonifici']
      },
      {
        id: 'admin-3',
        title: 'Partita IVA e fattura per le commissioni',
        category: 'amministrazione',
        content: 'Per ricevere le provvigioni devi essere in possesso di partita IVA. Quando i crediti risultano "prelevabili" (stato "In attesa di riscossione") emetti la tua fattura verso BackClub; dopo la saldatura riceverai il bonifico. Lo storico dei bonifici è nella sezione Commissioni.',
        tags: ['partita iva', 'fattura', 'bonifici', 'riscossione']
      }
    ]
  },
  {
    id: 'sales-kit',
    title: 'Sales Kit & Prodotti',
    description: 'Listini, brochure, schede tecniche, video e script di vendita.',
    icon: 'Briefcase',
    color: 'blue',
    articles: [
      {
        id: 'sales-1',
        title: 'Listini prezzi e spiegazione servizi',
        category: 'sales-kit',
        content: 'Nella sezione Listini trovi tutti i servizi per settore (Video e Grafica, Siti Web, Ads Center, Casa Famiglia, CRM). Ogni voce ha descrizione, prezzo, opzioni di pagamento e link a landing/scheda tecnica. Usa i listini per presentare il servizio al cliente con chiarezza.',
        tags: ['listini', 'prezzi', 'servizi', 'settori']
      },
      {
        id: 'sales-2',
        title: 'Come presentare un servizio al cliente',
        category: 'sales-kit',
        content: 'Prepara la proposta partendo dal listino: scegli il servizio, mostra prezzo e modalità di pagamento (unica soluzione o rate). Spiega benefici e caratteristiche (features) e, se disponibile, condividi il documento informativo o la scheda tecnica dalla pagina dettaglio del listino.',
        tags: ['presentazione', 'cliente', 'proposta', 'listino']
      },
      {
        id: 'sales-3',
        title: 'Video consigliati e formazione vendita',
        category: 'sales-kit',
        content: 'Nel Sales Kit trovi video consigliati su prodotti, presentazione servizi e tecniche di vendita. Usali per approfondire i servizi e per migliorare come li presenti al cliente.',
        tags: ['video', 'formazione', 'vendita']
      },
      {
        id: 'sales-4',
        title: 'Brochure, schede tecniche e script',
        category: 'sales-kit',
        content: 'Brochure e schede tecniche sono disponibili nella pagina dettaglio di ogni servizio in Listini (link e download). Gli script di vendita e le best practice sono nella sezione Sales Kit del Supporto.',
        tags: ['brochure', 'schede tecniche', 'script', 'download']
      }
    ]
  },
  {
    id: 'contrattualistica',
    title: 'Contrattualistica',
    description: 'Moduli d\'ordine, termini di servizio e firme digitali.',
    icon: 'FileText',
    color: 'indigo',
    articles: [
      {
        id: 'contr-1',
        title: 'Come creare un nuovo preventivo',
        category: 'contrattualistica',
        content: 'Per creare un nuovo preventivo, vai alla sezione Preventivi e clicca su "Nuovo Preventivo". Compila tutti i campi richiesti e salva. Il preventivo sarà disponibile per la firma digitale.',
        tags: ['preventivo', 'nuovo', 'creazione']
      },
      {
        id: 'contr-2',
        title: 'Firma digitale dei contratti',
        category: 'contrattualistica',
        content: 'I contratti possono essere firmati digitalmente direttamente dalla piattaforma. Una volta che il cliente accetta il preventivo, riceverà un link per la firma.',
        tags: ['firma', 'digitale', 'contratti']
      },
      {
        id: 'contr-3',
        title: 'Termini di servizio e condizioni',
        category: 'contrattualistica',
        content: 'I termini di servizio standard sono inclusi automaticamente in ogni contratto. Per consultarli, accedi alla sezione Contratti e apri il documento di interesse.',
        tags: ['termini', 'condizioni', 'servizio']
      }
    ]
  },
  {
    id: 'tecnico',
    title: 'Tecnico & CRM',
    description: 'Problemi di login, bug del sito e guide all\'uso del CRM.',
    icon: 'Laptop',
    color: 'orange',
    articles: [
      {
        id: 'tech-1',
        title: 'Problemi di accesso e login',
        category: 'tecnico',
        content: 'Se riscontri problemi di accesso, verifica di utilizzare le credenziali corrette. Se il problema persiste, contatta il supporto tecnico tramite la sezione Supporto.',
        tags: ['login', 'accesso', 'problemi']
      },
      {
        id: 'tech-2',
        title: 'Guide all\'uso del CRM',
        category: 'tecnico',
        content: 'Il CRM include funzionalità per gestire clienti, preventivi, contratti e commissioni. Consulta le guide nella sezione Help per maggiori dettagli su ogni funzionalità.',
        tags: ['crm', 'guide', 'tutorial']
      },
      {
        id: 'tech-3',
        title: 'Segnalazione bug e problemi tecnici',
        category: 'tecnico',
        content: 'Per segnalare bug o problemi tecnici, utilizza la funzione "Apri Segnalazione" nella sezione Supporto. Fornisci il maggior numero di dettagli possibile per una risoluzione rapida.',
        tags: ['bug', 'segnalazione', 'problemi']
      }
    ]
  },
  {
    id: 'sicurezza',
    title: 'Sicurezza & Privacy',
    description: 'GDPR, informative privacy per i clienti e protocolli di sicurezza.',
    icon: 'ShieldCheck',
    color: 'emerald',
    articles: [
      {
        id: 'sec-1',
        title: 'Conformità GDPR',
        category: 'sicurezza',
        content: 'Siamo completamente conformi al GDPR. Tutti i dati dei clienti sono trattati secondo le normative europee sulla protezione dei dati personali.',
        tags: ['gdpr', 'privacy', 'conformità']
      },
      {
        id: 'sec-2',
        title: 'Localizzazione dei server',
        category: 'sicurezza',
        content: 'I dati sono ospitati su server certificati ISO 27001 situati in Italia. Questo garantisce la massima sicurezza e conformità con le normative italiane ed europee.',
        tags: ['server', 'sicurezza', 'italia']
      },
      {
        id: 'sec-3',
        title: 'Informativa privacy per clienti',
        category: 'sicurezza',
        content: 'L\'informativa privacy per i clienti è disponibile nella sezione Sicurezza & Privacy. Puoi scaricarla e condividerla con i tuoi clienti quando necessario.',
        tags: ['privacy', 'informativa', 'clienti']
      }
    ]
  }
];

// Security & Privacy specific documents
export const securityDocuments = [
  {
    id: 'doc-1',
    title: 'Informativa Privacy Cliente',
    type: 'PDF',
    downloadUrl: '/documents/informativa-privacy-cliente.pdf',
    description: 'Documento ufficiale per la privacy dei clienti conforme al GDPR'
  },
  {
    id: 'doc-2',
    title: 'Modulo Consenso Dati',
    type: 'PDF',
    downloadUrl: '/documents/modulo-consenso-dati.pdf',
    description: 'Modulo per la raccolta del consenso al trattamento dei dati personali'
  },
  {
    id: 'doc-3',
    title: 'Certificazione Sicurezza Server',
    type: 'PDF',
    downloadUrl: '/documents/certificazione-sicurezza-server.pdf',
    description: 'Certificazione ISO 27001 dei server di hosting'
  }
];

// Security FAQ
export const securityFAQ = [
  {
    id: 'faq-1',
    question: 'Cosa rispondere se il cliente chiede dove sono i server?',
    answer: 'I dati sono ospitati su server certificati ISO 27001 situati in Italia. Questo garantisce la massima sicurezza e conformità con le normative italiane ed europee sulla protezione dei dati personali. I server sono gestiti da provider certificati e sottoposti a controlli regolari.'
  },
  {
    id: 'faq-2',
    question: 'Siamo conformi al GDPR?',
    answer: 'Sì, siamo completamente conformi al Regolamento Generale sulla Protezione dei Dati (GDPR). Tutti i dati dei clienti sono trattati secondo le normative europee. Abbiamo implementato misure tecniche e organizzative appropriate per garantire la sicurezza dei dati e il rispetto dei diritti degli interessati.'
  },
  {
    id: 'faq-3',
    question: 'Come posso condividere l\'informativa privacy con i clienti?',
    answer: 'Puoi scaricare l\'informativa privacy dalla sezione Sicurezza & Privacy e condividerla con i clienti via email o durante le riunioni. Il documento è sempre aggiornato e conforme alle ultime normative.'
  },
  {
    id: 'faq-4',
    question: 'I dati dei clienti sono criptati?',
    answer: 'Sì, tutti i dati sensibili sono criptati sia in transito (tramite protocollo HTTPS) che a riposo. Utilizziamo algoritmi di crittografia avanzati per garantire la massima sicurezza delle informazioni.'
  }
];

// Amministrazione & Provvigioni – contenuto guida per modal Supporto Venditori
export interface AmministrazioneGuideSection {
  id: string;
  title: string;
  content: string;
}

export const amministrazioneGuideSections: AmministrazioneGuideSection[] = [
  {
    id: 'intro-commissione',
    title: 'La tua percentuale di commissione',
    content: 'La percentuale di commissione che ti viene applicata è quella associata al tuo profilo venditore. La trovi sempre aggiornata nella sezione Commissioni. Ogni venditore ha la propria percentuale definita in contratto e gestita dalla piattaforma.'
  },
  {
    id: 'cosa-sono',
    title: 'Cosa sono le commissioni',
    content: 'Le commissioni (o provvigioni) sono la parte che ti spetta sulla vendita dei servizi ai clienti. Non sono un anticipo: maturano e diventano "crediti" quando il cliente ha effettivamente pagato la rata o il servizio fatturato. Fino a quel momento restano previste o in attesa, come spiegato più avanti.'
  },
  {
    id: 'come-si-calcolano',
    title: 'Come vengono calcolate',
    content: 'La commissione si calcola sull\'importo della rata del servizio pagata dal cliente (o sull\'importo del servizio se pagato in un’unica soluzione). Formula: Importo rata × (Tua percentuale di commissione / 100). Esempio: rata da 1.000 € e commissione al 10% → 1.000 × 10% = 100 € di provvigione per quella rata. Il calcolo è sempre sulla singola rata (o sul singolo pagamento) del servizio, non sul totale del contratto in un colpo solo.'
  },
  {
    id: 'su-cosa-si-calcola',
    title: 'Su cosa si calcolano (e su cosa no)',
    content: 'Le commissioni si calcolano sulle rate dei servizi inclusi nel piano di pagamento del contratto e effettivamente fatturati e pagati dal cliente (siti, sviluppo, consulenza, pacchetti servizio, ecc.). Non si calcolano su: rinnovi annuali (es. dominio, hosting), costi ricorrenti di sola manutenzione/rinnovo, o voci che non fanno parte del piano di pagamento principale del contratto. In sintesi: sì su servizi e relative rate; no su rinnovi hosting/dominio e simili.'
  },
  {
    id: 'crediti-presunti-attesa-disponibili',
    title: 'Crediti presunti, in attesa e disponibili (prelevabili)',
    content: 'Crediti presunti (o previsti): sono le provvigioni relative alle rate che fanno parte del piano di pagamento del contratto ma per cui non è ancora stata emessa fattura al cliente. Sono quindi "stimate" in base a importo rata e tua percentuale. In attesa: la fattura sulla rata è stata emessa al cliente ma non è ancora stata saldata; la commissione esiste ma non è ancora liquidabile. Disponibili (prelevabili / "In attesa di riscossione"): il cliente ha pagato la fattura; la commissione è maturata e puoi emettere la tua fattura verso BackClub e procedere alla riscossione (bonifico).'
  },
  {
    id: 'esempio-pratico',
    title: 'Esempio pratico',
    content: 'Contratto con 3 rate da 1.200 € ciascuna, tua commissione 10%. Rate 1 e 2: cliente ha pagato → per ognuna hai 120 € di commissione "disponibile" (prelevabile). Rata 3: fattura emessa ma non ancora pagata → 120 € "in attesa". Se nel piano ci fossero altre rate future non ancora fatturate, quelle apparirebbero come "previste" (presunte). Totale previsto sul contratto: 3 × 120 € = 360 €; ne avrai 240 € da riscuotere (rate 1 e 2) e 120 € in attesa del pagamento della rata 3.'
  },
  {
    id: 'partita-iva-fattura',
    title: 'Partita IVA e fattura quando i crediti sono prelevabili',
    content: 'Per ricevere le provvigioni devi essere in possesso di partita IVA. Quando i crediti risultano effettivamente prelevabili (stato "In attesa di riscossione" nella sezione Commissioni), è il momento di emettere la tua fattura verso BackClub per l\'importo delle commissioni maturate. Dopo l’invio della fattura e la verifica da parte della segreteria, la commissione viene saldata e riceverai il bonifico. Non emettere fattura su importi ancora "in attesa" o solo "previsti": solo quando lo stato è prelevabile/riscossione.'
  },
  {
    id: 'pagamenti-fatture-storico',
    title: 'Pagamenti, fatture e storico bonifici',
    content: 'Nella sezione Commissioni trovi: il riepilogo dei contratti con totali pagati e rate residue; le commissioni per stato (previste, in attesa, da riscuotere, riscosse); il dettaglio per ogni contratto con timeline delle rate e relative provvigioni. Lo storico dei bonifici corrisponde alle commissioni con stato "Riscossa": lì vedi date e importi effettivamente liquidati. Per fatture e documenti fiscali relativi alle tue provvigioni, fai riferimento alle comunicazioni della segreteria e ai dettagli in Commissioni.'
  }
];

// ========== Sales Kit & Prodotti – contenuto per modal Supporto Venditori ==========

export interface SalesKitVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  duration?: string;
  type?: 'formazione' | 'prodotto' | 'vendita';
}

export interface SalesKitResource {
  id: string;
  title: string;
  description: string;
  url?: string;
  downloadUrl?: string;
  type: 'brochure' | 'scheda' | 'script' | 'pdf';
}

export interface SalesKitGuideSection {
  id: string;
  title: string;
  content: string;
}

/** Video consigliati: formazione, presentazione servizi, tecniche di vendita. */
export const salesKitVideos: SalesKitVideo[] = [
  {
    id: 'video-1',
    title: 'Introduzione al catalogo servizi BackClub',
    description: 'Panoramica dei settori (Video e Grafica, Siti Web, Ads Center, Casa Famiglia, CRM) e come orientarsi nei listini.',
    url: '#',
    duration: '~8 min',
    type: 'formazione'
  },
  {
    id: 'video-2',
    title: 'Come presentare un servizio al cliente',
    description: 'Dalla scelta del servizio dal listino alla proposta: prezzo, rate, benefici e come usare schede tecniche e documenti informativi.',
    url: '#',
    duration: '~12 min',
    type: 'vendita'
  },
  {
    id: 'video-3',
    title: 'Siti Web e pacchetti: cosa includere in proposta',
    description: 'Focus su servizi Siti Web: caratteristiche, opzioni di pagamento e come spiegare valore e costi al cliente.',
    url: '#',
    duration: '~10 min',
    type: 'prodotto'
  },
  {
    id: 'video-4',
    title: 'Ads Center e campagne: linguaggio e obiettivi',
    description: 'Come parlare di advertising e campagne con il cliente e collegare le voci del listino agli obiettivi di business.',
    url: '#',
    duration: '~9 min',
    type: 'prodotto'
  },
  {
    id: 'video-5',
    title: 'Gestione obiezioni e chiusura',
    description: 'Best practice su obiezioni di prezzo, confronti con concorrenti e chiusura della proposta collegata al listino.',
    url: '#',
    duration: '~11 min',
    type: 'vendita'
  }
];

/** Guide testuali approfondite: listini, presentazione, materiali, settori, obiezioni. */
export const salesKitGuideSections: SalesKitGuideSection[] = [
  {
    id: 'sales-listini',
    title: 'Listini prezzi e spiegazione dei servizi',
    content: 'I listini sono il cuore della proposta. Nella sezione Listini (menu venditore) trovi tutti i servizi attivi, filtrati per settore: Video e Grafica, Siti Web, Ads Center, Casa Famiglia, CRM Gestionali. Ogni voce mostra nome, descrizione, prezzo base, tipo di prezzo (fisso/variabile/personalizzato), opzioni di pagamento (unica soluzione, rate, 30/40/30, ecc.) e, dove presenti, link alla landing page e alla scheda tecnica. Usa il listino per: (1) scegliere il servizio giusto per il cliente, (2) mostrare prezzo e modalità di pagamento in modo trasparente, (3) scaricare o condividere il documento informativo dalla pagina dettaglio del servizio. I listini sono sempre aggiornati: fai riferimento a essi in ogni preventivo.'
  },
  {
    id: 'sales-presentare',
    title: 'Come presentare un servizio al cliente',
    content: 'Presentare un servizio in modo efficace significa collegarlo sempre al listino e ai materiali ufficiali. Passi suggeriti: (1) Ascolta il bisogno del cliente e individua il settore/servizio più adatto. (2) Apri la sezione Listini, filtra per settore se utile, e scegli la voce che risponde al bisogno. (3) Nella proposta parla di benefici e caratteristiche (le "features" del servizio) e mostra chiaramente prezzo e modalità di pagamento (una tantum o rate). (4) Se nella scheda listino è presente un documento informativo o una scheda tecnica, scaricali dalla pagina dettaglio del servizio e condividili con il cliente per dare autorevolezza. (5) Evita di inventare prezzi o condizioni: usa sempre i dati del listino così da allineare proposta, preventivo e contratto.'
  },
  {
    id: 'sales-prima-chiamata',
    title: 'Prima chiamata e primo incontro: domande da fare',
    content: 'Nella prima chiamata o nel primo incontro l’obiettivo è inquadrare il bisogno e capire quale servizio (e settore) è più adatto. Domande utili: "Qual è l’obiettivo principale che vuoi raggiungere?" "Hai già un sito / campagne / strumenti di gestione?" "Come gestisci oggi la presenza online (o i contatti, le campagne)?" "Hai un budget indicativo o preferisci che ti proponga delle soluzioni?" "Preferisci un investimento in un’unica soluzione o dilazionato in rate?" Le risposte ti orientano verso il settore giusto (Siti Web, Ads, CRM, Video e Grafica, Casa Famiglia) e verso le voci del listino da mostrare. Dopo la chiamata, apri i Listini, filtra per settore e prepara una proposta con 1–2 servizi rilevanti e prezzi chiari.'
  },
  {
    id: 'sales-settori',
    title: 'Focus per settore: cosa enfatizzare',
    content: 'Video e Grafica: enfatizza qualità, tempi di consegna e supporto alla comunicazione (social, materiali). Siti Web: valore della presenza online, SEO, responsive, eventuale e-commerce o form di contatto. Ads Center: obiettivi di visibilità e lead, budget e target (B2B/B2C, zona), metriche (click, conversioni). Casa Famiglia: servizi dedicati al settore e benefici concreti per la struttura. CRM Gestionali: organizzazione contatti, riduzione tempo amministrativo, report e automazioni. Per ogni settore usa le voci del listino come riferimento: nome servizio, prezzo, cosa è incluso (features) e opzioni di pagamento. Non improvvisare: se il cliente chiede qualcosa fuori listino, proponi di verificare con il team e tornare con una proposta allineata.'
  },
  {
    id: 'sales-obiezioni',
    title: 'Gestione obiezioni: prezzo, confronti, timing',
    content: 'Obiezione sul prezzo: riporta il valore (benefici, cosa è incluso, confronto con "fare da soli" o con il costo di non agire). Mostra le opzioni di pagamento del listino (rate, 30/40/30) per alleggerire il carico iniziale. Confronto con concorrenti: non sminuire la concorrenza; sottolinea punti di forza dei nostri servizi (supporto, qualità, trasparenza dei prezzi dal listino). "È troppo / voglio pensarci": chiedi cosa manca per decidere, offri materiali (scheda tecnica, documento informativo dal listino) e proponi un follow-up con una proposta scritta (preventivo) così il cliente ha tutto nero su bianco. In ogni caso mantieni sempre coerenza con i prezzi e le condizioni del listino.'
  },
  {
    id: 'sales-video',
    title: 'Video consigliati e formazione',
    content: 'I video consigliati in questa sezione coprono: introduzione al catalogo servizi, come presentare un servizio al cliente, focus su singoli prodotti (es. Siti Web, Ads Center) e tecniche di vendita (obiezioni, chiusura). Usali per approfondire i servizi che vendi e per uniformare il modo in cui li presenti. Aggiorniamo i link quando sono disponibili nuovi contenuti; in caso di link non attivi contatta il supporto.'
  },
  {
    id: 'sales-materiali',
    title: 'Brochure, schede tecniche e script di vendita',
    content: 'Brochure e schede tecniche sono collegate ai singoli servizi del listino. Dalla pagina Listini, clicca su un servizio per aprire il dettaglio: lì trovi, se presenti, link alla landing page, scheda tecnica e pulsante per scaricare il documento informativo (PDF). Usa questi materiali in riunione o inviali al cliente per supportare la proposta. Gli script di vendita e le best practice sono riassunti nelle guide di questa sezione (Come presentare un servizio, Gestione obiezioni). Per materiali aggiuntivi o aggiornamenti chiedi al tuo referente o al supporto.'
  },
  {
    id: 'sales-preventivo',
    title: 'Dal listino al preventivo',
    content: 'Il preventivo che crei in piattaforma deve riflettere il listino: i servizi si aggiungono dalla stessa base prezzi che vedi in Listini, con prezzi e opzioni di pagamento coerenti. Così il cliente vede in preventivo esattamente ciò di cui avete parlato (servizio, prezzo, rate) e non ci sono sorprese. Dopo aver presentato il servizio con l’ausilio di listino e materiali, passa alla creazione del preventivo dalla sezione Preventivi usando i servizi dal listino.'
  },
  {
    id: 'sales-chiusura',
    title: 'Chiusura e prossimi passi',
    content: 'Quando il cliente è pronto a procedere: (1) Riepiloga servizio, prezzo e modalità di pagamento come da listino. (2) Crea il preventivo in piattaforma con gli stessi dati. (3) Invia il preventivo e indica i passi successivi (firma, attivazione). Non proporre sconti o condizioni non previste dal listino senza aver verificato: mantieni coerenza tra ciò che dici, ciò che è nel preventivo e ciò che sarà in contratto. Se il cliente chiede modifiche (più servizi, altre rate), torna al listino e ai dettagli servizio per costruire una proposta aggiornata e trasparente.'
  }
];

/** Risorse scaricabili o link (brochure, schede, script). */
export const salesKitResources: SalesKitResource[] = [
  {
    id: 'res-1',
    title: 'Brochure catalogo servizi',
    description: 'Sintesi dei principali servizi e settori per condivisione con il cliente.',
    url: '#',
    type: 'brochure'
  },
  {
    id: 'res-2',
    title: 'Guida rapida listini',
    description: 'Come leggere e usare i listini in sede di proposta e preventivo.',
    downloadUrl: '#',
    type: 'pdf'
  },
  {
    id: 'res-3',
    title: 'Script prima chiamata / primo incontro',
    description: 'Struttura della conversazione e domande da fare per inquadrare il bisogno.',
    url: '#',
    type: 'script'
  },
  {
    id: 'res-4',
    title: 'Schede tecniche per settore',
    description: 'Disponibili nella pagina dettaglio di ogni servizio in Listini (link e download).',
    url: '/seller/listini',
    type: 'scheda'
  }
];

// ========== Contrattualistica – guide per pagina dedicata ==========

export interface ContrattualisticaGuideSection {
  id: string;
  title: string;
  content: string;
}

/** Link cartella Google Drive "Policy clienti" – policy e documenti da condividere con i clienti. */
export const POLICY_DRIVE_URL = 'https://drive.google.com/drive/folders/10YSQkIt_Ux0McK96aiBr0Gjm1tiy2ten?usp=sharing';

export const contrattualisticaGuideSections: ContrattualisticaGuideSection[] = [
  {
    id: 'contr-privacy-gdpr',
    title: 'Privacy policy e consenso prima del preventivo (GDPR)',
    content: 'È importante per il GDPR che il cliente firmi la privacy policy (informativa privacy e consenso al trattamento dei dati) prima di ricevere o firmare il preventivo. Il consenso deve essere raccolto prima di procedere con la proposta commerciale. In pratica: (1) invia o fai firmare al cliente la privacy policy e il modulo di consenso, (2) solo dopo che il cliente ha firmato puoi inviare il preventivo e procedere con il contratto. Tutte le policy e i documenti aggiornati sono disponibili nella cartella Google Drive "Policy clienti" (link in basso). Scarica l’informativa e il modulo di consenso da lì e assicurati di usarli in ogni nuovo rapporto commerciale.'
  },
  {
    id: 'contr-policy-drive',
    title: 'Policy e documenti: dove trovarli (Google Drive)',
    content: `Tutte le policy (informativa privacy, consenso, termini, ecc.) devono essere caricate in questa cartella man mano che vengono aggiornate, così tutti usano sempre la versione corretta e siamo in linea con il GDPR. Cartella "Policy clienti": ${POLICY_DRIVE_URL}. Come accedere: apri il link da browser (PC, tablet o smartphone) o dall'app Google Drive. Se non hai l'app: su telefono/tablet scarica "Google Drive" dal Play Store (Android) o dall'App Store (iPhone/iPad); su PC apri drive.google.com nel browser (non serve installare nulla) oppure installa "Google Drive per desktop" da drive.google.com/drive/download. Come scaricare un file: (1) Da browser: accedi con l'account Google autorizzato se richiesto, poi nella cartella clicca con il tasto destro sul file e scegli "Scarica", oppure apri il file e nel menu in alto (tre puntini o "File") seleziona "Scarica" / "Download". (2) Da app Google Drive (telefono/tablet): apri il link o la cartella "Policy clienti", tocca il file, tocca il menu (tre puntini), "Scarica" o "Salva offline"; il file finirà nella cartella Download del dispositivo. Per avere la cartella sempre a portata di mano: da browser clicca su "Aggiungi al mio Drive" (icona stellina o pulsante in alto) così la cartella apparirà in "Il mio Drive".`
  },
  {
    id: 'contr-preventivo',
    title: 'Come creare un nuovo preventivo',
    content: 'Prima di creare il preventivo assicurati che il cliente abbia firmato la privacy policy e il consenso al trattamento dati (vedi sezione "Privacy policy e consenso prima del preventivo"). Poi vai alla sezione Preventivi nel menu venditore e clicca su "Nuovo Preventivo". Si apre il wizard in più passaggi: (1) Selezione servizi dal listino, (2) Configurazione (opzioni di pagamento, rate, rinnovi), (3) Dati cliente, (4) Riepilogo e invio. Compila tutti i campi richiesti e salva; il preventivo sarà disponibile per la condivisione con il cliente e per la firma. I servizi e i prezzi devono coincidere con il listino: non modificare importi a mano se non previsto dalla piattaforma.'
  },
  {
    id: 'contr-firma',
    title: 'Firma digitale dei contratti',
    content: 'I contratti possono essere firmati digitalmente dalla piattaforma. Quando il cliente accetta il preventivo, riceve un link per la firma. Il flusso è gestito dalla segreteria: dopo l’accettazione del preventivo viene generato il contratto e inviato al cliente per la firma digitale. Tu puoi seguire lo stato del preventivo (in attesa, approvato, richiesta contratto) dalla sezione Preventivi. Una volta firmato il contratto, il progetto passa in stato "avviato" e si procede con il piano di pagamento.'
  },
  {
    id: 'contr-termini',
    title: 'Termini di servizio e condizioni',
    content: 'I termini di servizio standard sono inclusi automaticamente in ogni contratto. Per consultarli accedi alla sezione Contratti e apri il documento di interesse; in alternativa chiedi alla segreteria la versione aggiornata. Non modificare i termini in autonomia: eventuali condizioni particolari vanno concordate con il team e inserite nel contratto dalla segreteria. Se il cliente chiede chiarimenti sui termini, indirizzalo alla segreteria o al referente legale.'
  },
  {
    id: 'contr-richiesta-contratto',
    title: 'Da preventivo approvato a richiesta contratto',
    content: 'Quando il cliente ha approvato il preventivo, puoi richiedere l’attivazione del contratto dalla scheda del preventivo (azione "Richiedi contratto"). La segreteria riceve la richiesta e procede con la generazione del contratto e l’invio al cliente per la firma. Fino alla firma il progetto resta in stato "preventivo approvato"; dopo la firma digitale il contratto è attivo e si può procedere con fatture e piano di pagamento.'
  },
  {
    id: 'contr-moduli',
    title: 'Moduli d’ordine e documenti',
    content: 'I moduli d’ordine e i documenti contrattuali sono gestiti dalla piattaforma: il preventivo fa da base per il contratto e per il piano di pagamento. Non usare moduli esterni o documenti fuori piattaforma per evitare disallineamenti. Se il cliente richiede un ordine o un documento particolare (es. ordine di acquisto), segnalalo alla segreteria che potrà fornire il formato adatto o integrare il flusso.'
  },
  {
    id: 'contr-stati',
    title: 'Stati del preventivo e del contratto',
    content: 'Preventivo: bozza, inviato, in attesa, approvato, rifiutato, richiesta contratto. Dopo l’approvazione puoi richiedere il contratto. Contratto: in preparazione, in attesa firma, attivo, sospeso, concluso. Solo quando il contratto è attivo si attivano fatture e piano di pagamento. Nella sezione Preventivi e Contratti vedi sempre lo stato aggiornato; in caso di dubbi contatta la segreteria.'
  }
];

// ========== Tecnico & CRM – guide per pagina dedicata ==========

export interface TecnicoCrmGuideSection {
  id: string;
  title: string;
  content: string;
}

export const tecnicoCrmGuideSections: TecnicoCrmGuideSection[] = [
  {
    id: 'tech-login',
    title: 'Problemi di accesso e login',
    content: 'Se riscontri problemi di accesso verifica di usare le credenziali corrette (email e password). Se hai dimenticato la password usa il link "Password dimenticata" nella pagina di login. Se il problema persiste (errore dopo login, pagina bianca, redirect errato) non tentare ripetuti accessi: apri una segnalazione tramite "Apri Segnalazione" indicando cosa succede, su quale dispositivo e browser usi e eventuale messaggio di errore. Il supporto tecnico ti risponderà per risolvere l’accesso.'
  },
  {
    id: 'tech-crm-panoramica',
    title: 'Panoramica del CRM venditore',
    content: 'Il CRM venditore include: Dashboard (riepilogo attività e KPI), Listini (catalogo servizi e prezzi), Preventivi (creazione e gestione preventivi), Contratti (stato contratti e clienti), Clienti (anagrafica clienti assegnati), Commissioni (provvigioni e storico), Contatti/Leads (contatti da sviluppare), Agenda (appuntamenti). Dal menu laterale (o dal menu mobile) accedi a ogni sezione. I dati sono sincronizzati con la segreteria: modifiche a preventivi e contratti sono visibili secondo i permessi del tuo profilo.'
  },
  {
    id: 'tech-crm-preventivi-contratti',
    title: 'Preventivi e contratti nel CRM',
    content: 'Preventivi: dalla sezione Preventivi puoi creare un nuovo preventivo (wizard con servizi dal listino, configurazione, cliente, riepilogo), visualizzare l’elenco, aprire il dettaglio e seguire lo stato (bozza, inviato, approvato, ecc.). Dopo l’approvazione puoi richiedere il contratto. Contratti: nella sezione Contratti vedi i contratti collegati ai tuoi clienti e il loro stato (in attesa firma, attivo, ecc.). Per dettagli su flussi e stati consulta la sezione Supporto > Contrattualistica.'
  },
  {
    id: 'tech-crm-commissioni-listini',
    title: 'Commissioni e listini nel CRM',
    content: 'Commissioni: nella sezione Commissioni trovi il riepilogo delle tue provvigioni (in attesa, da riscuotere, riscosse) per contratto e lo storico. I dati sono aggiornati quando la segreteria registra fatture e pagamenti. Listini: nella sezione Listini vedi i servizi attivi per settore, prezzi e opzioni di pagamento; da lì apri il dettaglio di ogni servizio per descrizione, documenti e link. Per approfondimenti su commissioni e listini usa le sezioni Supporto > Amministrazione & Provvigioni e Sales Kit & Prodotti.'
  },
  {
    id: 'tech-segnalazione',
    title: 'Segnalazione bug e problemi tecnici: Apri Segnalazione',
    content: 'Per segnalare un bug, un malfunzionamento o un problema tecnico (es. pagina che non carica, pulsante che non funziona, dati errati, errore durante un’operazione) usa la funzione "Apri Segnalazione" disponibile in Supporto. Clicca su "Apri Segnalazione" (dalla pagina Supporto o da questa sezione Tecnico & CRM) e compila il modulo: descrivi il problema in modo chiaro, indica in quale sezione della piattaforma si verifica e, se possibile, i passaggi per riprodurlo. Allega screenshot o messaggi di errore se utili. Il team tecnico riceve la segnalazione e ti risponde per la risoluzione. Non usare email generiche: le segnalazioni dalla piattaforma vengono tracciate e gestite in modo prioritario.'
  },
  {
    id: 'tech-browser-dispositivi',
    title: 'Browser e dispositivi consigliati',
    content: 'La piattaforma è ottimizzata per i browser più recenti (Chrome, Firefox, Safari, Edge). Assicurati di usare una versione aggiornata del browser e di aver abilitato JavaScript e i cookie se richiesto. Su mobile la stessa interfaccia si adatta con layout dedicato. Se riscontri problemi su un dispositivo o browser specifico indicalo nella segnalazione quando apri un ticket: aiuta il supporto a riprodurre il problema.'
  },
  {
    id: 'tech-contatti-supporto',
    title: 'Quando usare Apri Segnalazione',
    content: 'Usa "Apri Segnalazione" per: bug o errori della piattaforma, problemi di login o accesso, dati che non si aggiornano correttamente, funzionalità che non rispondono come previsto, richieste tecniche o di configurazione. Per domande su commissioni, listini o contratti puoi prima consultare le guide in Supporto (Amministrazione, Sales Kit, Contrattualistica); se dopo la lettura serve comunque assistenza apri una segnalazione specificando l’argomento. Per urgenze operative contatta anche i canali indicati nella pagina Supporto (es. telefono/WhatsApp se previsti).'
  }
];

// Flatten all articles for search
export const allArticles: SupportArticle[] = supportCategories.flatMap(category => category.articles);
