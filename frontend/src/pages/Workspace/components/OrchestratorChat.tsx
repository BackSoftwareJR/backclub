import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Copy, Check, Loader2, ChevronRight } from 'lucide-react';
import type { OrchestratorMessage, AgentFlowType } from '../../../types/workspace';
import { getSubAgentColor, getSubAgentIcon, getSubAgentName } from '../config/workspaceAgents';
import { workspaceAgentsApi } from '../../../api/workspaceAgents';
import './OrchestratorChat.css';

interface OrchestratorChatProps {
  projectId: number;
}

interface OnboardingStep {
  id: string;
  question: string;
  options?: string[];
  type: 'select' | 'multiselect' | 'text';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'tech_stack',
    question: 'Che tipo di sito vuoi realizzare per la struttura?',
    options: ['Sito HTML statico (semplice e veloce)', 'Applicazione React (moderna e interattiva)', 'Sito Laravel + CMS (gestione contenuti avanzata)'],
    type: 'select',
  },
  {
    id: 'care_values',
    question: 'Quali valori vuoi comunicare principalmente?',
    options: ['Familiarità e calore umano', 'Competenza medica e sicurezza', 'Ambiente naturale e qualità della vita', 'Innovazione e tecnologia assistiva', 'Tradizione e radicamento locale'],
    type: 'multiselect',
  },
  {
    id: 'target_audience',
    question: 'A chi si rivolge principalmente la struttura?',
    options: ['Figli caregiver (45-65 anni)', 'Anziani autosufficienti', 'Anziani non autosufficienti', 'Coppie di anziani', 'Famiglie con necessità specifiche'],
    type: 'multiselect',
  },
];

const INTERVIEW_STEPS: OnboardingStep[] = [
  {
    id: 'scope',
    question: 'Descrivi il cambiamento che vuoi realizzare. Cosa dovrebbe fare la nuova sezione/pagina?',
    type: 'text',
  },
  {
    id: 'tone',
    question: 'Che tono vuoi usare? (es. formale, empatico, moderno, rassicurante)',
    options: ['Formale e professionale', 'Caldo ed empatico', 'Moderno e dinamico', 'Rassicurante e familiare'],
    type: 'select',
  },
  {
    id: 'references',
    question: 'Hai esempi o riferimenti da cui trarre ispirazione?',
    type: 'text',
  },
];

const OrchestratorChat: React.FC<OrchestratorChatProps> = ({ projectId }) => {
  const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [activeFlow, setActiveFlow] = useState<AgentFlowType | null>(null);
  const [interviewStep, setInterviewStep] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string | string[]>>({});
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);

  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, string | string[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoadingHistory(true);
        const data = await workspaceAgentsApi.getOrchestratorMessages(projectId);
        setMessages(data);
      } catch {
        // start empty if no messages yet
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadMessages();
  }, [projectId]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const classifyFlow = (text: string): AgentFlowType => {
    const lower = text.toLowerCase();
    const minorKeywords = ['aggiorna', 'modifica', 'cambia', 'correggi', 'aggiungi', 'rimuovi', 'sostituisci'];
    const majorKeywords = ['rifare', 'riprogettare', 'nuova sezione', 'nuovo sito', 'redesign', 'rifacimento'];
    if (majorKeywords.some(k => lower.includes(k))) return 'major';
    if (minorKeywords.some(k => lower.includes(k))) return 'minor';
    return 'major';
  };

  const sendMessage = async (text?: string) => {
    const content = text ?? inputValue.trim();
    if (!content || isLoading) return;

    const flow = classifyFlow(content);
    const userMsg: OrchestratorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    if (flow === 'major') {
      setActiveFlow('major');
      setInterviewStep(0);
      setInterviewAnswers({});
      setSelectedOptions([]);
      setGeneratedPrompt(null);
      const botMsg: OrchestratorMessage = {
        id: `orch-${Date.now()}`,
        role: 'orchestrator',
        content: `Ho capito che vuoi fare una modifica importante. Per generare il prompt perfetto per Cursor, ti faccio 3 domande rapide.`,
        flow_type: 'major',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await workspaceAgentsApi.createOrchestratorMessage(projectId, content);
      setMessages(prev => [...prev, response]);
    } catch {
      const errMsg: OrchestratorMessage = {
        id: `err-${Date.now()}`,
        role: 'orchestrator',
        content: 'Errore nella comunicazione con il Tech Lead Agent. Riprova tra qualche istante.',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterviewAnswer = (answer: string | string[]) => {
    const step = INTERVIEW_STEPS[interviewStep];
    const updated = { ...interviewAnswers, [step.id]: answer };
    setInterviewAnswers(updated);
    setSelectedOptions([]);

    if (interviewStep < INTERVIEW_STEPS.length - 1) {
      setInterviewStep(prev => prev + 1);
    } else {
      const prompt = buildPerfectPrompt(updated);
      setGeneratedPrompt(prompt);
      setActiveFlow(null);
    }
  };

  const buildPerfectPrompt = (answers: Record<string, string | string[]>): string => {
    return `# Prompt Perfetto per Cursor

## Contesto Progetto
Struttura Senior Care — tone of voice: empatico, rassicurante, professionale.
Usa sempre "ospite" o "anziano", mai "paziente" o "ricoverato".

## Richiesta
${answers.scope || 'Non specificata'}

## Tono desiderato
${answers.tone || 'Empatico e professionale'}

## Riferimenti
${answers.references || 'Nessun riferimento specifico'}

## Istruzioni Tecniche
- Mantieni la coerenza con il Brand Book del progetto
- Usa i token CSS del design system (variabili --ws-*)
- Segui le convenzioni React/TypeScript del progetto
- Ogni componente deve avere il suo file CSS separato`;
  };

  const handleOnboardingAnswer = (answer: string | string[]) => {
    const step = ONBOARDING_STEPS[onboardingStep];
    const updated = { ...onboardingAnswers, [step.id]: answer };
    setOnboardingAnswers(updated);
    setSelectedOptions([]);

    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      setOnboardingStep(prev => prev + 1);
    } else {
      setActiveFlow(null);
      const doneMsg: OrchestratorMessage = {
        id: `orch-onboarding-done-${Date.now()}`,
        role: 'orchestrator',
        content: `Onboarding completato! Ho salvato le preferenze della struttura. Ora puoi chiedermi di creare contenuti, analizzare dati o pianificare campagne marketing. Come posso aiutarti?`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, doneMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentInterviewStep = INTERVIEW_STEPS[interviewStep];
  const currentOnboardingStep = ONBOARDING_STEPS[onboardingStep];

  return (
    <div className="orch-chat">
      {/* ── Header ── */}
      <div className="orch-chat__header">
        <div className="orch-chat__avatar">🧠</div>
        <div className="orch-chat__header-info">
          <span className="orch-chat__header-name">Tech Lead Agent</span>
          <span className="orch-chat__header-status">
            <span className="orch-chat__status-dot" />
            Orchestratore principale
          </span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="orch-chat__messages">
        {isLoadingHistory ? (
          <div className="orch-chat__loading">
            <Loader2 size={16} className="ws-spin" />
            <span>Caricamento conversazione...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="orch-chat__welcome">
            <div className="orch-chat__welcome-icon">🏡</div>
            <h3 className="orch-chat__welcome-title">Tech Lead Agent</h3>
            <p className="orch-chat__welcome-desc">
              Ciao! Sono il tuo Tech Lead Agent per il Senior Care. Posso aiutarti a creare contenuti, pianificare campagne, ottimizzare la struttura e molto altro. Come posso aiutarti oggi?
            </p>
            <div className="orch-chat__suggestions">
              {['Crea una pagina "I nostri servizi"', 'Analizza i costi della struttura', 'Pianifica una campagna Open Day'].map(s => (
                <button key={s} className="orch-chat__suggestion" onClick={() => sendMessage(s)}>
                  {s} <ChevronRight size={12} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`orch-chat__message orch-chat__message--${msg.role}`}
            >
              {msg.role !== 'user' && (
                <div className="orch-chat__message-avatar">
                  {msg.sub_agent ? getSubAgentIcon(msg.sub_agent) : '🧠'}
                </div>
              )}
              <div className="orch-chat__message-body">
                {msg.sub_agent && (
                  <span
                    className="orch-chat__subagent-badge"
                    style={{ backgroundColor: getSubAgentColor(msg.sub_agent) }}
                  >
                    {getSubAgentName(msg.sub_agent)}
                  </span>
                )}
                {msg.flow_type === 'minor' && (
                  <div className="orch-chat__log-minor">
                    <Loader2 size={12} className="ws-spin" />
                    <span>Task in esecuzione...</span>
                  </div>
                )}
                <p className="orch-chat__message-text">{msg.content}</p>
                {msg.artifacts?.map(artifact => (
                  <div key={artifact.id} className="orch-chat__artifact">
                    <div className="orch-chat__artifact-header">
                      <span className="orch-chat__artifact-title">{artifact.title}</span>
                      <button
                        className="orch-chat__copy-btn"
                        onClick={() => copyToClipboard(artifact.content, artifact.id)}
                      >
                        {copiedId === artifact.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === artifact.id ? 'Copiato!' : 'Copia'}
                      </button>
                    </div>
                    <pre className="orch-chat__artifact-content">{artifact.content}</pre>
                  </div>
                ))}
                <span className="orch-chat__message-time">{formatTime(msg.created_at)}</span>
              </div>
            </div>
          ))
        )}

        {/* ── Prompt Perfetto (dopo intervista) ── */}
        {generatedPrompt && (
          <div className="orch-chat__perfect-prompt">
            <div className="orch-chat__perfect-prompt-header">
              <span>✨ Prompt Perfetto Generato</span>
              <button
                className="orch-chat__copy-btn orch-chat__copy-btn--large"
                onClick={() => copyToClipboard(generatedPrompt, 'perfect-prompt')}
              >
                {copiedId === 'perfect-prompt' ? <Check size={13} /> : <Copy size={13} />}
                {copiedId === 'perfect-prompt' ? 'Copiato!' : 'Copia per Cursor'}
              </button>
            </div>
            <pre className="orch-chat__perfect-prompt-content">{generatedPrompt}</pre>
            <button className="orch-chat__dismiss-btn" onClick={() => setGeneratedPrompt(null)}>
              Chiudi
            </button>
          </div>
        )}

        {/* ── Interview UI (Flusso B) ── */}
        {activeFlow === 'major' && !generatedPrompt && (
          <div className="orch-chat__interview">
            <div className="orch-chat__interview-progress">
              {INTERVIEW_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`orch-chat__interview-dot ${i <= interviewStep ? 'active' : ''}`}
                />
              ))}
            </div>
            <p className="orch-chat__interview-question">{currentInterviewStep.question}</p>
            {currentInterviewStep.type === 'select' && currentInterviewStep.options && (
              <div className="orch-chat__interview-options">
                {currentInterviewStep.options.map(opt => (
                  <button
                    key={opt}
                    className="orch-chat__interview-option"
                    onClick={() => handleInterviewAnswer(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {currentInterviewStep.type === 'text' && (
              <div className="orch-chat__interview-text-input">
                <textarea
                  className="orch-chat__interview-textarea"
                  placeholder="Scrivi la tua risposta..."
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && e.currentTarget.value.trim()) {
                      e.preventDefault();
                      handleInterviewAnswer(e.currentTarget.value.trim());
                    }
                  }}
                />
                <button
                  className="orch-chat__interview-confirm"
                  onClick={(e) => {
                    const textarea = (e.currentTarget.previousSibling as HTMLTextAreaElement);
                    if (textarea?.value?.trim()) handleInterviewAnswer(textarea.value.trim());
                  }}
                >
                  Continua <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Onboarding Wizard (Flusso C) ── */}
        {activeFlow === 'onboarding' && (
          <div className="orch-chat__onboarding">
            <div className="orch-chat__onboarding-header">
              <span className="orch-chat__onboarding-title">🏡 Configurazione Struttura</span>
              <div className="orch-chat__onboarding-steps">
                {ONBOARDING_STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`orch-chat__onboarding-step-dot ${i < onboardingStep ? 'done' : i === onboardingStep ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
            <p className="orch-chat__onboarding-question">{currentOnboardingStep.question}</p>
            {currentOnboardingStep.type === 'select' && currentOnboardingStep.options && (
              <div className="orch-chat__onboarding-options">
                {currentOnboardingStep.options.map(opt => (
                  <button
                    key={opt}
                    className="orch-chat__onboarding-option"
                    onClick={() => handleOnboardingAnswer(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            {currentOnboardingStep.type === 'multiselect' && currentOnboardingStep.options && (
              <div className="orch-chat__onboarding-multiselect">
                <div className="orch-chat__onboarding-options">
                  {currentOnboardingStep.options.map(opt => (
                    <button
                      key={opt}
                      className={`orch-chat__onboarding-option ${selectedOptions.includes(opt) ? 'selected' : ''}`}
                      onClick={() => setSelectedOptions(prev =>
                        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
                      )}
                    >
                      {selectedOptions.includes(opt) && <Check size={12} />}
                      {opt}
                    </button>
                  ))}
                </div>
                {selectedOptions.length > 0 && (
                  <button
                    className="orch-chat__onboarding-confirm"
                    onClick={() => handleOnboardingAnswer(selectedOptions)}
                  >
                    Conferma ({selectedOptions.length} selezionati) <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="orch-chat__typing">
            <div className="orch-chat__message-avatar">🧠</div>
            <div className="orch-chat__typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      {activeFlow === null && (
        <div className="orch-chat__input-area">
          <textarea
            ref={inputRef}
            className="orch-chat__input"
            placeholder="Scrivi al Tech Lead Agent... (Enter per inviare)"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            className="orch-chat__send-btn"
            onClick={() => sendMessage()}
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? <Loader2 size={16} className="ws-spin" /> : <Send size={16} />}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrchestratorChat;
