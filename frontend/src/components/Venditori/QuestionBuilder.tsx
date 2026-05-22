import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { priceListQuestionsApi, type PriceListItemQuestion, type QuestionAnswer, type AnswerCondition } from '../../api/priceListQuestions';
import '../../components/Venditori/QuestionBuilder.css';

interface QuestionBuilderProps {
  priceListItemId: number;
  isEdit: boolean;
}

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({ priceListItemId, isEdit }) => {
  const [questions, setQuestions] = useState<PriceListItemQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    if (isEdit && priceListItemId) {
      loadQuestions();
    }
  }, [priceListItemId, isEdit]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await priceListQuestionsApi.getQuestions(priceListItemId);
      setQuestions(data);
    } catch (error) {
      console.error('Errore nel caricamento domande:', error);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = async () => {
    try {
      const newQuestion = await priceListQuestionsApi.createQuestion(priceListItemId, {
        question_text: 'Nuova domanda',
        question_type: 'multiple_choice',
        is_required: false,
        order: questions.length,
      });
      setQuestions([...questions, newQuestion]);
      setExpandedQuestion(newQuestion.id);
    } catch (error) {
      console.error('Errore nella creazione domanda:', error);
      alert('Errore nella creazione della domanda');
    }
  };

  const updateQuestion = async (questionId: number, updates: Partial<PriceListItemQuestion>) => {
    try {
      const updated = await priceListQuestionsApi.updateQuestion(priceListItemId, questionId, updates);
      setQuestions(questions.map(q => q.id === questionId ? updated : q));
    } catch (error) {
      console.error('Errore nell\'aggiornamento domanda:', error);
      alert('Errore nell\'aggiornamento della domanda');
    }
  };

  const deleteQuestion = async (questionId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa domanda?')) return;
    
    try {
      await priceListQuestionsApi.deleteQuestion(priceListItemId, questionId);
      setQuestions(questions.filter(q => q.id !== questionId));
      if (expandedQuestion === questionId) {
        setExpandedQuestion(null);
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione domanda:', error);
      alert('Errore nell\'eliminazione della domanda');
    }
  };

  const addAnswer = async (questionId: number) => {
    try {
      const question = questions.find(q => q.id === questionId);
      if (!question || question.question_type !== 'multiple_choice') return;

      const newAnswer = await priceListQuestionsApi.addAnswer(priceListItemId, questionId, {
        answer_text: 'Nuova risposta',
        order: (question.answers?.length || 0),
      });
      
      setQuestions(questions.map(q => 
        q.id === questionId 
          ? { ...q, answers: [...(q.answers || []), newAnswer] }
          : q
      ));
    } catch (error) {
      console.error('Errore nella creazione risposta:', error);
      alert('Errore nella creazione della risposta');
    }
  };

  const updateAnswer = async (answerId: number, updates: Partial<QuestionAnswer>) => {
    try {
      const updated = await priceListQuestionsApi.updateAnswer(answerId, updates);
      setQuestions(questions.map(q => ({
        ...q,
        answers: q.answers?.map(a => a.id === answerId ? updated : a) || []
      })));
    } catch (error) {
      console.error('Errore nell\'aggiornamento risposta:', error);
      alert('Errore nell\'aggiornamento della risposta');
    }
  };

  const deleteAnswer = async (answerId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa risposta?')) return;
    
    try {
      await priceListQuestionsApi.deleteAnswer(answerId);
      setQuestions(questions.map(q => ({
        ...q,
        answers: q.answers?.filter(a => a.id !== answerId) || []
      })));
    } catch (error) {
      console.error('Errore nell\'eliminazione risposta:', error);
      alert('Errore nell\'eliminazione della risposta');
    }
  };

  const addCondition = async (answerId: number) => {
    try {
      const newCondition = await priceListQuestionsApi.addCondition(answerId, {
        price_adjustment: 0,
        cost_amount: 0,
      });
      
      setQuestions(questions.map(q => ({
        ...q,
        answers: q.answers?.map(a => 
          a.id === answerId 
            ? { ...a, conditions: [...(a.conditions || []), newCondition] }
            : a
        ) || []
      })));
    } catch (error) {
      console.error('Errore nella creazione condizione:', error);
      alert('Errore nella creazione della condizione');
    }
  };

  const updateCondition = async (conditionId: number, updates: Partial<AnswerCondition>) => {
    try {
      const updated = await priceListQuestionsApi.updateCondition(conditionId, updates);
      setQuestions(questions.map(q => ({
        ...q,
        answers: q.answers?.map(a => ({
          ...a,
          conditions: a.conditions?.map(c => c.id === conditionId ? updated : c) || []
        })) || []
      })));
    } catch (error) {
      console.error('Errore nell\'aggiornamento condizione:', error);
      alert('Errore nell\'aggiornamento della condizione');
    }
  };

  const deleteCondition = async (conditionId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa condizione?')) return;
    
    try {
      await priceListQuestionsApi.deleteCondition(conditionId);
      setQuestions(questions.map(q => ({
        ...q,
        answers: q.answers?.map(a => ({
          ...a,
          conditions: a.conditions?.filter(c => c.id !== conditionId) || []
        })) || []
      })));
    } catch (error) {
      console.error('Errore nell\'eliminazione condizione:', error);
      alert('Errore nell\'eliminazione della condizione');
    }
  };

  if (loading) {
    return <div className="question-builder-loading">Caricamento domande...</div>;
  }

  return (
    <div className="question-builder">
      <div className="question-builder-header">
        <h3 className="form-section-title">
          <HelpCircle size={20} />
          Domande Servizio
        </h3>
        <p className="form-section-description">
          Configura le domande che verranno mostrate ai venditori quando selezionano questo servizio.
          Puoi associare condizioni (variazioni prezzo/costi) a ogni risposta.
        </p>
        <button
          type="button"
          className="btn-add-question"
          onClick={addQuestion}
        >
          <Plus size={18} />
          Aggiungi Domanda
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="question-builder-empty">
          <p>Nessuna domanda configurata. Aggiungi una domanda per iniziare.</p>
        </div>
      ) : (
        <div className="questions-list">
          {questions.map((question, qIndex) => (
            <div key={question.id} className="question-item">
              <div className="question-header">
                <div className="question-header-left">
                  <span className="question-number">Domanda {qIndex + 1}</span>
                  <input
                    type="text"
                    className="question-text-input"
                    value={question.question_text}
                    onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                    placeholder="Testo domanda..."
                  />
                </div>
                <div className="question-header-right">
                  <select
                    className="question-type-select"
                    value={question.question_type}
                    onChange={(e) => updateQuestion(question.id, { 
                      question_type: e.target.value as 'multiple_choice' | 'text' | 'number' 
                    })}
                  >
                    <option value="multiple_choice">Scelta multipla</option>
                    <option value="text">Testo libero</option>
                    <option value="number">Numero</option>
                  </select>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={question.is_required}
                      onChange={(e) => updateQuestion(question.id, { is_required: e.target.checked })}
                    />
                    <span>Obbligatoria</span>
                  </label>
                  <button
                    type="button"
                    className="btn-expand-question"
                    onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                  >
                    {expandedQuestion === question.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    type="button"
                    className="btn-remove-question"
                    onClick={() => deleteQuestion(question.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {expandedQuestion === question.id && (
                <div className="question-details">
                  {question.question_type === 'multiple_choice' && (
                    <div className="answers-section">
                      <div className="answers-header">
                        <h4>Risposte</h4>
                        <button
                          type="button"
                          className="btn-add-answer"
                          onClick={() => addAnswer(question.id)}
                        >
                          <Plus size={14} />
                          Aggiungi Risposta
                        </button>
                      </div>
                      {question.answers && question.answers.length > 0 ? (
                        <div className="answers-list">
                          {question.answers.map((answer) => (
                            <div key={answer.id} className="answer-item">
                              <div className="answer-header">
                                <input
                                  type="text"
                                  className="answer-text-input"
                                  value={answer.answer_text}
                                  onChange={(e) => updateAnswer(answer.id, { answer_text: e.target.value })}
                                  placeholder="Testo risposta..."
                                />
                                <button
                                  type="button"
                                  className="btn-remove-answer"
                                  onClick={() => deleteAnswer(answer.id)}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              
                              <div className="conditions-section">
                                <div className="conditions-header">
                                  <h5>Condizioni (variazioni prezzo/costi)</h5>
                                  <button
                                    type="button"
                                    className="btn-add-condition"
                                    onClick={() => addCondition(answer.id)}
                                  >
                                    <Plus size={12} />
                                    Aggiungi Condizione
                                  </button>
                                </div>
                                {answer.conditions && answer.conditions.length > 0 ? (
                                  <div className="conditions-list">
                                    {answer.conditions.map((condition) => (
                                      <div key={condition.id} className="condition-item">
                                        <div className="form-grid">
                                          <div className="form-group">
                                            <label>Variazione Prezzo (€)</label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={condition.price_adjustment}
                                              onChange={(e) => updateCondition(condition.id, { 
                                                price_adjustment: parseFloat(e.target.value) || 0 
                                              })}
                                            />
                                            <small>Può essere negativo</small>
                                          </div>
                                          <div className="form-group">
                                            <label>Costo Aggiuntivo (€)</label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              value={condition.cost_amount}
                                              onChange={(e) => updateCondition(condition.id, { 
                                                cost_amount: parseFloat(e.target.value) || 0 
                                              })}
                                            />
                                          </div>
                                        </div>
                                        <div className="form-group full-width">
                                          <label>Descrizione Costo</label>
                                          <input
                                            type="text"
                                            value={condition.cost_description || ''}
                                            onChange={(e) => updateCondition(condition.id, { 
                                              cost_description: e.target.value 
                                            })}
                                            placeholder="Es: Costo per integrazione personalizzata"
                                          />
                                        </div>
                                        <div className="form-group full-width">
                                          <label>Descrizione Lavorazione</label>
                                          <textarea
                                            rows={2}
                                            value={condition.work_description || ''}
                                            onChange={(e) => updateCondition(condition.id, { 
                                              work_description: e.target.value 
                                            })}
                                            placeholder="Descrizione dettagliata della lavorazione per analisi costi..."
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          className="btn-remove-condition"
                                          onClick={() => deleteCondition(condition.id)}
                                        >
                                          <X size={12} />
                                          Rimuovi Condizione
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="no-conditions">Nessuna condizione configurata per questa risposta</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-answers">Nessuna risposta configurata. Aggiungi una risposta per iniziare.</p>
                      )}
                    </div>
                  )}
                  
                  {question.question_type !== 'multiple_choice' && (
                    <div className="question-info">
                      <p>
                        Per domande di tipo <strong>{question.question_type === 'text' ? 'testo libero' : 'numero'}</strong>, 
                        le risposte non possono avere condizioni predefinite. 
                        Le condizioni possono essere applicate solo alle risposte multiple choice.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionBuilder;

