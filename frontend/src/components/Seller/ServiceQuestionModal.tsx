import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { priceListQuestionsApi, type PriceListItemQuestion } from '../../api/priceListQuestions';
import type { QuestionAnswer } from '../../types/quotes';
import './ServiceQuestionModal.css';

interface ServiceQuestionModalProps {
  serviceId: number;
  serviceName: string;
  basePrice: number; // Prezzo base del servizio
  existingAnswers?: QuestionAnswer[];
  onClose: () => void;
  onConfirm: (answers: QuestionAnswer[]) => void;
}

const ServiceQuestionModal: React.FC<ServiceQuestionModalProps> = ({
  serviceId,
  serviceName,
  basePrice,
  existingAnswers = [],
  onClose,
  onConfirm,
}) => {
  const [questions, setQuestions] = useState<PriceListItemQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>(() => {
    const initial: Record<number, QuestionAnswer> = {};
    existingAnswers.forEach(a => {
      initial[a.question_id] = a;
    });
    return initial;
  });

  useEffect(() => {
    loadQuestions();
  }, [serviceId]);

  const currentQuestion = questions[currentQuestionIndex];

  // Scroll e focus quando il modal si apre per la prima volta
  useEffect(() => {
    if (questions.length > 0 && !loading) {
      // Quando le domande sono caricate, scroll immediato alla prima domanda
      const questionContainer = document.getElementById(`question-${questions[0]?.id}`);
      if (questionContainer) {
        questionContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus dopo un breve delay per permettere lo scroll
        setTimeout(() => {
          const firstInput = questionContainer.querySelector('input[type="radio"], input[type="number"], textarea') as HTMLElement;
          if (firstInput) {
            firstInput.focus();
          } else {
            const firstOption = questionContainer.querySelector('.answer-option') as HTMLElement;
            if (firstOption) {
              firstOption.focus();
            }
          }
        }, 200);
      }
    }
  }, [questions.length, loading]);

  // Scroll e focus quando cambia la domanda corrente
  useEffect(() => {
    if (questions.length > 0 && currentQuestion) {
      const questionContainer = document.getElementById(`question-${currentQuestion.id}`);
      if (questionContainer) {
        // Scroll fluido alla domanda corrente
        questionContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus immediato sul primo elemento interattivo
        setTimeout(() => {
          const firstInput = questionContainer.querySelector('input[type="radio"], input[type="number"], textarea') as HTMLElement;
          if (firstInput) {
            firstInput.focus();
          } else {
            const firstOption = questionContainer.querySelector('.answer-option') as HTMLElement;
            if (firstOption) {
              firstOption.focus();
            }
          }
        }, 150);
      }
    }
  }, [currentQuestionIndex, currentQuestion]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await priceListQuestionsApi.getQuestions(serviceId);
      // Ordina per order (le condizioni sono già caricate dal backend)
      const sorted = data.sort((a, b) => a.order - b.order);
      setQuestions(sorted);
    } catch (error) {
      console.error('Errore nel caricamento domande:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Calcola variazioni prezzo in tempo reale basate sulle risposte
  const calculatePriceAdjustments = (): number => {
    let totalAdjustment = 0;
    
    Object.values(answers).forEach(answer => {
      if (answer.answer_id) {
        // Trova la risposta selezionata e le sue condizioni
        const question = questions.find(q => q.id === answer.question_id);
        if (question && question.answers) {
          const selectedAnswer = question.answers.find(a => a.id === answer.answer_id);
          if (selectedAnswer && selectedAnswer.conditions) {
            selectedAnswer.conditions.forEach(condition => {
              // Converti esplicitamente in numero per evitare concatenazione stringhe
              const adjustment = parseFloat(String(condition.price_adjustment || 0));
              if (!isNaN(adjustment)) {
                totalAdjustment += adjustment;
              }
            });
          }
        }
      }
    });
    
    return totalAdjustment;
  };

  // Assicurati che basePrice sia un numero
  const basePriceNum = typeof basePrice === 'string' ? parseFloat(basePrice) : (basePrice || 0);
  const priceAdjustment = calculatePriceAdjustments();
  const finalPrice = basePriceNum + priceAdjustment;

  const handleAnswer = (questionId: number, answer: Partial<QuestionAnswer>) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        question_id: questionId,
        ...answer,
      },
    }));
  };

  const canGoNext = () => {
    if (!currentQuestion) return false;
    if (!currentQuestion.is_required) return true;
    
    const answer = answers[currentQuestion.id];
    if (!answer) return false;
    
    if (currentQuestion.question_type === 'multiple_choice') {
      return !!answer.answer_id;
    } else if (currentQuestion.question_type === 'text') {
      return !!answer.text_answer && answer.text_answer.trim().length > 0;
    } else if (currentQuestion.question_type === 'number') {
      return answer.number_answer !== undefined && answer.number_answer !== null;
    }
    
    return false;
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Ultima domanda, conferma
      handleConfirm();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleConfirm = () => {
    const answersArray = Object.values(answers);
    // Calcola aggiustamenti prezzo prima di confermare (stesso calcolo di calculatePriceAdjustments)
    let priceAdjustments = 0;
    answersArray.forEach(answer => {
      if (answer.answer_id) {
        const question = questions.find(q => q.id === answer.question_id);
        if (question && question.answers) {
          const selectedAnswer = question.answers.find(a => a.id === answer.answer_id);
          if (selectedAnswer && selectedAnswer.conditions) {
            selectedAnswer.conditions.forEach(condition => {
              // Converti esplicitamente in numero
              const adjustment = parseFloat(String(condition.price_adjustment || 0));
              if (!isNaN(adjustment)) {
                priceAdjustments += adjustment;
              }
            });
          }
        }
      }
    });
    
    // Arrotonda a 2 decimali per evitare errori di floating point
    priceAdjustments = Math.round(priceAdjustments * 100) / 100;
    
    // Aggiungi price_adjustments a ogni risposta per riferimento
    const answersWithAdjustments = answersArray.map(a => ({
      ...a,
      calculated_price_adjustment: priceAdjustments, // Totale per riferimento
    }));
    
    onConfirm(answersWithAdjustments);
  };

  const allRequiredAnswered = () => {
    const required = questions.filter(q => q.is_required);
    return required.every(q => {
      const answer = answers[q.id];
      if (!answer) return false;
      
      if (q.question_type === 'multiple_choice') {
        return !!answer.answer_id;
      } else if (q.question_type === 'text') {
        return !!answer.text_answer && answer.text_answer.trim().length > 0;
      } else if (q.question_type === 'number') {
        return answer.number_answer !== undefined && answer.number_answer !== null;
      }
      return false;
    });
  };

  const overlayProps = {
    className: "service-question-modal-overlay",
    onClick: onClose,
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  };

  const modalProps = {
    className: "service-question-modal-apple",
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    initial: { opacity: 0, scale: 0.96 as number, y: 8 as number },
    animate: { opacity: 1, scale: 1 as number, y: 0 as number },
    exit: { opacity: 0, scale: 0.96 as number, y: 8 as number },
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
  };

  if (loading) {
    return (
      <motion.div {...overlayProps}>
        <motion.div {...modalProps}>
          <div className="modal-loading">
            <div className="loading-spinner"></div>
            <p>Caricamento domande...</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (questions.length === 0) {
    return (
      <motion.div {...overlayProps}>
        <motion.div {...modalProps}>
          <div className="modal-header-apple">
            <div className="modal-header-top">
              <span className="modal-service-title">{serviceName.toUpperCase()}</span>
              <button className="modal-close-apple" onClick={onClose}>
                <X size={18} />
            </button>
            </div>
          </div>
          <div className="modal-content-apple">
            <p className="no-questions">Nessuna domanda configurata per questo servizio.</p>
          </div>
          <div className="modal-footer-apple">
            <div className="modal-footer-right">
              <button className="btn-nav-primary-apple" onClick={handleConfirm}>
                <Check size={18} />
              Conferma
            </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Calcola il prezzo di variazione per ogni risposta
  const getAnswerPriceAdjustment = (answerId: number): number => {
    const question = questions.find(q => q.id === currentQuestion?.id);
    if (!question || !question.answers) return 0;
    
    const answer = question.answers.find(a => a.id === answerId);
    if (!answer || !answer.conditions) return 0;
    
    return answer.conditions.reduce((sum, condition) => {
      return sum + parseFloat(String(condition.price_adjustment || 0));
    }, 0);
  };

  return (
    <motion.div {...overlayProps}>
      <motion.div {...modalProps}>
        {/* Header - Minimalist */}
        <div className="modal-header-apple">
          <div className="modal-header-top">
            <span className="modal-service-title">{serviceName.toUpperCase()}</span>
            <button className="modal-close-apple" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="modal-progress-dots">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentQuestionIndex;
              return (
          <div 
                  key={q.id}
                  className={`progress-dot ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
          />
              );
            })}
          </div>
        </div>

        {/* Content - Question & Answers */}
        <div className="modal-content-apple">
          {currentQuestion && (
            <div className="question-container-apple" id={`question-${currentQuestion.id}`}>
              <div className="question-header-apple">
                <h3 className="question-text-apple">{currentQuestion.question_text}</h3>
                {currentQuestion.is_required && (
                  <span className="required-badge-apple">OBBLIGATORIA</span>
                )}
              </div>

              <div className="question-answer-apple">
                {currentQuestion.question_type === 'multiple_choice' && (
                  <div className="answer-tiles">
                    {currentQuestion.answers?.map((answer) => {
                      const isSelected = answers[currentQuestion.id]?.answer_id === answer.id;
                      const priceAdjustment = getAnswerPriceAdjustment(answer.id);
                      
                      return (
                        <div
                          key={answer.id}
                          className={`answer-tile ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleAnswer(currentQuestion.id, { answer_id: answer.id })}
                        >
                          <div className="answer-tile-content">
                            <span className="answer-tile-text">{answer.answer_text}</span>
                            {priceAdjustment !== 0 && (
                              <span className={`answer-tile-price ${priceAdjustment > 0 ? 'positive' : 'negative'}`}>
                                {priceAdjustment > 0 ? '+' : ''}€ {Math.abs(priceAdjustment).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <div className="answer-tile-checkmark">
                              <Check size={18} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.question_type === 'text' && (
                  <textarea
                    className="answer-textarea-apple"
                    placeholder="Scrivi la tua risposta..."
                    value={answers[currentQuestion.id]?.text_answer || ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, { text_answer: e.target.value })}
                    rows={4}
                  />
                )}

                {currentQuestion.question_type === 'number' && (
                  <input
                    type="number"
                    className="answer-number-apple"
                    placeholder="Inserisci un numero..."
                    value={answers[currentQuestion.id]?.number_answer || ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, { 
                      number_answer: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Price & Navigation */}
        <div className="modal-footer-apple">
          <div className="modal-footer-left">
            {currentQuestionIndex > 0 && (
          <button
                className="btn-nav-ghost"
            onClick={handlePrevious}
          >
            <ChevronLeft size={18} />
            Indietro
          </button>
            )}
          </div>
          
          <div className="modal-footer-center">
            <div className="modal-price-display">
              <span className="price-label">Prezzo Finale:</span>
              <span className="price-value" key={finalPrice}>
                € {finalPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="modal-footer-right">
          {currentQuestionIndex < questions.length - 1 ? (
            <button
                className="btn-nav-primary-apple"
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              Avanti
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
                className="btn-nav-primary-apple"
              onClick={handleConfirm}
              disabled={!allRequiredAnswered()}
            >
              <Check size={18} />
              Conferma
            </button>
          )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ServiceQuestionModal;

