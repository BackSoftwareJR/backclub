import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Plus, 
  RefreshCw,
  DollarSign,
  Calendar,
  AlertCircle,
  Download
} from 'lucide-react';
import { paymentPlansApi } from '../../api/paymentPlans';
import { quotesApi } from '../../api/quotes';
import { contractsApi } from '../../api/contracts';
import type { PaymentPlan, PaymentPlanInstallment, PaymentPlanRenewal } from '../../api/paymentPlans';
import './EditPaymentPlanPage.css';

const EditPaymentPlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<PaymentPlan | null>(null);
  const [installments, setInstallments] = useState<PaymentPlanInstallment[]>([]);
  const [renewals, setRenewals] = useState<PaymentPlanRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadPaymentPlan();
    }
  }, [id]);

  const loadPaymentPlan = async () => {
    try {
      setLoading(true);
      const response = await paymentPlansApi.getById(Number(id));
      const planData = response.data;
      setPlan(planData);
      
      let loadedInstallments = planData.installments || [];
      let loadedRenewals = planData.renewals || [];
      
      // Corregge il payment_type per le rate di rinnovo esistenti che potrebbero non averlo corretto
      loadedInstallments = loadedInstallments.map((inst: PaymentPlanInstallment) => {
        // Se la descrizione contiene "Rinnovo" ma il payment_type non è 'renewal', correggilo
        if (inst.description && inst.description.toLowerCase().includes('rinnovo') && inst.payment_type !== 'renewal') {
          return { ...inst, payment_type: 'renewal' as const };
        }
        return inst;
      });
      
      // Se non ci sono rinnovi nel piano, estraili dal preventivo
      if (loadedRenewals.length === 0 && planData.quote?.items) {
        loadedRenewals = extractRenewalsFromQuote(planData.quote.items, planData.start_date, planData.id);
      }
      setRenewals(loadedRenewals);
      
      // Se ci sono rinnovi variabili senza rate, generale
      if (loadedRenewals.length > 0) {
        const variableRenewals = loadedRenewals.filter((r: PaymentPlanRenewal) => r.renewal_type === 'variable');
        const existingRenewalInstallments = loadedInstallments.filter((i: PaymentPlanInstallment) => 
          i.payment_type === 'renewal' || (i.description && i.description.toLowerCase().includes('rinnovo'))
        );
        
        if (variableRenewals.length > 0 && existingRenewalInstallments.length === 0) {
          // Genera le rate per i rinnovi variabili
          const renewalInstallments = generateRenewalInstallments(variableRenewals, planData.start_date, planData.id);
          loadedInstallments = [...loadedInstallments, ...renewalInstallments];
        }
      }
      
      setInstallments(loadedInstallments);
    } catch (error) {
      console.error('Errore nel caricamento piano:', error);
      alert('Errore nel caricamento del piano di pagamento');
      navigate('/segreteria/fatture?tab=piani');
    } finally {
      setLoading(false);
    }
  };

  const extractRenewalsFromQuote = (quoteItems: any[], startDate?: string, planId?: number) => {
    const extractedRenewals: PaymentPlanRenewal[] = [];
    const baseDate = startDate ? new Date(startDate) : new Date();

    quoteItems.forEach((item) => {
      // Controlla renewal_option (singolo)
      let renewalOption: any = item.renewal_option;
      if (typeof renewalOption === 'string') {
        try {
          renewalOption = JSON.parse(renewalOption);
        } catch (e) {
          renewalOption = undefined;
        }
      }

      // Controlla renewal_options (array)
      let renewalOptions: any = item.renewal_options;
      if (typeof renewalOptions === 'string') {
        try {
          renewalOptions = JSON.parse(renewalOptions);
        } catch (e) {
          renewalOptions = undefined;
        }
      }

      // Mappa duration a frequency
      const mapDurationToFrequency = (duration: string): 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly' => {
        switch (duration) {
          case 'monthly': return 'monthly';
          case 'quarterly': return 'quarterly';
          case 'semiannual': return 'semiannual';
          case 'annual': return 'yearly';
          default: return 'monthly';
        }
      };

      if (renewalOption && renewalOption.duration) {
        // Rinnovo singolo - sempre fisso
        const renewalStartDate = new Date(baseDate);
        renewalStartDate.setMonth(renewalStartDate.getMonth() + 1);

        extractedRenewals.push({
          id: 0,
          payment_plan_id: planId || 0,
          renewal_type: 'fixed',
          frequency: mapDurationToFrequency(renewalOption.duration),
          start_date: renewalStartDate.toISOString().split('T')[0],
          months_count: 12,
          fixed_amount: renewalOption.price || item.total / 12,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (renewalOptions && Array.isArray(renewalOptions) && renewalOptions.length > 0) {
        // Multi-rinnovo: variabile con più opzioni
        const cheapestOption = renewalOptions.reduce((min: any, opt: any) => 
          opt.price < (min?.price || Infinity) ? opt : min, 
          renewalOptions[0]
        );

        const renewalStartDate = new Date(baseDate);
        renewalStartDate.setMonth(renewalStartDate.getMonth() + 1);

        // Converti le opzioni nel formato variable_amounts
        const variableAmounts = renewalOptions.map((opt: any) => ({
          amount: opt.price,
          label: opt.description || `Opzione ${opt.duration || 'mensile'}`,
        }));

        extractedRenewals.push({
          id: 0,
          payment_plan_id: planId || 0,
          renewal_type: 'variable',
          frequency: mapDurationToFrequency(cheapestOption.duration || 'monthly'),
          start_date: renewalStartDate.toISOString().split('T')[0],
          months_count: 12,
          fixed_amount: cheapestOption.price, // Importo default (meno caro)
          variable_amounts: variableAmounts,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    return extractedRenewals;
  };

  const generateRenewalInstallments = (renewals: PaymentPlanRenewal[], _startDate?: string, planId?: number) => {
    const installments: PaymentPlanInstallment[] = [];
    let installmentCounter = 0;

    renewals.forEach((renewal) => {
      const renewalStartDate = new Date(renewal.start_date);
      const defaultAmount = renewal.fixed_amount || 0;
      const variableAmounts = renewal.variable_amounts || [];
      const defaultLabel = variableAmounts[0]?.label || 'Default';

      for (let i = 0; i < renewal.months_count; i++) {
        const dueDate = new Date(renewalStartDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        installmentCounter++;

        installments.push({
          id: 0,
          payment_plan_id: planId || 0,
          installment_number: installmentCounter,
          due_date: dueDate.toISOString().split('T')[0],
          amount: defaultAmount,
          original_amount: defaultAmount,
          discount_amount: 0,
          status: 'pending',
          payment_type: 'renewal',
          description: renewal.renewal_type === 'variable' 
            ? `Rinnovo Variabile ${i + 1}/${renewal.months_count} - ${defaultLabel}`
            : `Rinnovo Fisso ${i + 1}/${renewal.months_count}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    return installments;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '€ 0,00';
    }
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      return dateObj.toISOString().split('T')[0];
    } catch (error) {
      console.error('Errore nella formattazione della data:', error, date);
      return '';
    }
  };

  const handleUpdateInstallment = (index: number, field: string, value: any) => {
    const updated = [...installments];
    const installment = { ...updated[index] };
    
    if (field === 'due_date') {
      installment.due_date = value;
    } else if (field === 'amount') {
      const numValue = parseFloat(value) || 0;
      installment.amount = numValue;
      if (!installment.original_amount) {
        installment.original_amount = numValue;
      }
    } else if (field === 'original_amount') {
      const numValue = parseFloat(value) || 0;
      installment.original_amount = numValue;
      if (installment.discount_amount) {
        installment.amount = numValue - (installment.discount_amount || 0);
      } else {
        installment.amount = numValue;
      }
    } else if (field === 'discount_amount') {
      const numValue = parseFloat(value) || 0;
      installment.discount_amount = numValue;
      if (installment.original_amount) {
        installment.amount = installment.original_amount - numValue;
      } else {
        // Se non c'è original_amount, usa amount come base
        installment.original_amount = installment.amount + numValue;
      }
    } else if (field === 'final_amount') {
      // Modifica diretta dell'importo finale
      const numValue = parseFloat(value) || 0;
      installment.amount = numValue;
      // Se c'è uno sconto, aggiorna original_amount per mantenere lo sconto
      if (installment.discount_amount && installment.discount_amount > 0) {
        installment.original_amount = numValue + installment.discount_amount;
      } else if (!installment.original_amount) {
        // Se non c'è sconto e non c'è original_amount, imposta original_amount = amount
        installment.original_amount = numValue;
      }
    } else if (field === 'discount_reason') {
      installment.discount_reason = value;
    } else if (field === 'description') {
      installment.description = value;
    } else if (field === 'renewal_option') {
      // Per rinnovi variabili: seleziona l'opzione
      const selectedOption = renewals
        .find(r => r.renewal_type === 'variable' && r.variable_amounts)
        ?.variable_amounts?.find((opt: any) => opt.label === value);
      
      if (selectedOption) {
        installment.amount = selectedOption.amount;
        installment.original_amount = selectedOption.amount;
        // Estrai la parte base della descrizione (prima del primo " - ") e sostituisci con la nuova opzione
        const baseDescription = installment.description?.split(' - ')[0] || 'Rinnovo Variabile';
        // Limita la descrizione a 250 caratteri per evitare problemi con il database
        const fullDescription = `${baseDescription} - ${selectedOption.label}`;
        installment.description = fullDescription.length > 250 
          ? fullDescription.substring(0, 247) + '...' 
          : fullDescription;
      }
    }
    
    updated[index] = installment;
    setInstallments(updated);
  };

  const getRenewalOptionsForInstallment = (installment: PaymentPlanInstallment) => {
    // Trova il rinnovo variabile associato a questa rata
    const variableRenewal = renewals.find(r => 
      r.renewal_type === 'variable' && 
      r.variable_amounts && 
      installment.payment_type === 'renewal'
    );
    
    return variableRenewal?.variable_amounts || [];
  };

  // Helper per trovare l'indice univoco di una rata nell'array installments
  const findInstallmentIndex = (targetInstallment: PaymentPlanInstallment, positionInFiltered: number, isRenewal: boolean = false): number => {
    // Se ha un id, usalo per trovare la posizione esatta
    if (targetInstallment.id) {
      const foundIndex = installments.findIndex(inst => inst.id === targetInstallment.id);
      if (foundIndex !== -1) return foundIndex;
    }
    
    // Altrimenti, trova tutte le rate del tipo corretto e usa la posizione nell'array filtrato
    const matchingIndices: number[] = [];
    installments.forEach((inst, idx) => {
      if (isRenewal) {
        // Per rate di rinnovo
        if (inst.payment_type === 'renewal' || 
            (inst.description && inst.description.toLowerCase().includes('rinnovo'))) {
          matchingIndices.push(idx);
        }
      } else {
        // Per rate servizi
        if (inst.payment_type === 'installment' || inst.payment_type === 'one_time') {
          // Escludi rate di rinnovo anche se il tipo non è corretto
          if (!(inst.description && inst.description.toLowerCase().includes('rinnovo'))) {
            matchingIndices.push(idx);
          }
        }
      }
    });
    
    // Se la posizione è valida, restituisci l'indice corrispondente
    if (positionInFiltered >= 0 && positionInFiltered < matchingIndices.length) {
      return matchingIndices[positionInFiltered];
    }
    
    // Fallback: cerca per caratteristiche uniche
    return installments.findIndex(inst => {
      if (isRenewal) {
        return inst.payment_type === 'renewal' &&
               inst.installment_number === targetInstallment.installment_number &&
               inst.due_date === targetInstallment.due_date &&
               (inst.id === targetInstallment.id || 
                (inst.description === targetInstallment.description && !targetInstallment.id));
      } else {
        return (inst.payment_type === 'installment' || inst.payment_type === 'one_time') &&
               inst.installment_number === targetInstallment.installment_number &&
               inst.due_date === targetInstallment.due_date &&
               (inst.id === targetInstallment.id || 
                (inst.description === targetInstallment.description && !targetInstallment.id));
      }
    });
  };

  const handleAddInstallment = () => {
    const lastInstallment = installments[installments.length - 1];
    const newDate = lastInstallment 
      ? new Date(new Date(lastInstallment.due_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date();
    
    const newInstallment: PaymentPlanInstallment = {
      id: 0,
      payment_plan_id: plan!.id,
      installment_number: installments.length + 1,
      due_date: newDate.toISOString().split('T')[0],
      amount: 0,
      original_amount: 0,
      discount_amount: 0,
      status: 'pending',
      payment_type: 'installment',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setInstallments([...installments, newInstallment]);
  };

  const handleAddTantum = () => {
    const newDate = new Date();
    
    const newInstallment: PaymentPlanInstallment = {
      id: 0,
      payment_plan_id: plan!.id,
      installment_number: installments.length + 1,
      due_date: newDate.toISOString().split('T')[0],
      amount: 0,
      original_amount: 0,
      discount_amount: 0,
      status: 'pending',
      payment_type: 'one_time',
      payment_schedule_type: 'tantum',
      description: 'Pagamento Unico',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setInstallments([...installments, newInstallment]);
  };

  const handleAddRenewalInstallment = () => {
    // Aggiunge 12 rate di rinnovo mensili
    const lastInstallment = installments[installments.length - 1];
    const baseDate = lastInstallment 
      ? new Date(new Date(lastInstallment.due_date).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date();
    baseDate.setMonth(baseDate.getMonth() + 1);

    const newInstallments: PaymentPlanInstallment[] = [];
    for (let i = 0; i < 12; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      newInstallments.push({
        id: 0,
        payment_plan_id: plan!.id,
        installment_number: installments.length + i + 1,
        due_date: dueDate.toISOString().split('T')[0],
        amount: 0,
        original_amount: 0,
        discount_amount: 0,
        status: 'pending',
        payment_type: 'renewal',
        description: `Rata Rinnovo ${i + 1}/12`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    setInstallments([...installments, ...newInstallments]);
    
    // Crea anche un record renewal per tracciamento
    const newRenewal: PaymentPlanRenewal = {
      id: 0,
      payment_plan_id: plan!.id,
      renewal_type: 'variable',
      frequency: 'monthly',
      start_date: baseDate.toISOString().split('T')[0],
      months_count: 12,
      fixed_amount: 0,
      variable_amounts: [],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setRenewals([...renewals, newRenewal]);
  };

  const handleDownloadQuote = async () => {
    if (!plan?.quote) {
      alert('Nessun preventivo associato a questo piano');
      return;
    }

    try {
      const response = await quotesApi.generatePDF(plan.quote.id);
      const blob = response.data instanceof Blob 
        ? response.data 
        : new Blob([response.data], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preventivo_${plan.quote.quote_number || plan.quote.id}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nella generazione PDF:', error);
      alert('Errore nella generazione del PDF del preventivo');
    }
  };

  const handleDownloadContract = async () => {
    if (!plan?.contract) {
      alert('Nessun contratto associato a questo piano');
      return;
    }

    try {
      const blob = await contractsApi.downloadFile(plan.contract.id, 'contract');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contratto_${plan.contract.contract_number || plan.contract.id}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Errore nel download contratto:', error);
      alert(error.response?.data?.error || 'Errore nel download del contratto');
    }
  };

  const handleDeleteInstallment = (index: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa rata?')) {
      return;
    }
    const updated = installments.filter((_, i) => i !== index);
    // Rinumera le rate
    updated.forEach((inst, idx) => {
      inst.installment_number = idx + 1;
    });
    setInstallments(updated);
  };

  const handleUpdateRenewal = (index: number, field: string, value: any) => {
    const updated = [...renewals];
    const renewal = { ...updated[index] };

    if (field === 'renewal_type') {
      renewal.renewal_type = value;
      // Se cambia da variabile a fisso, resetta variable_amounts
      if (value === 'fixed' && renewal.variable_amounts) {
        renewal.variable_amounts = undefined;
      }
    } else if (field === 'frequency') {
      renewal.frequency = value;
    } else if (field === 'start_date') {
      renewal.start_date = value;
      // Ricalcola end_date se necessario
      if (renewal.months_count) {
        const startDate = new Date(value);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + renewal.months_count);
        renewal.end_date = endDate.toISOString().split('T')[0];
      }
    } else if (field === 'end_date') {
      renewal.end_date = value;
      // Ricalcola months_count se necessario
      if (renewal.start_date) {
        const startDate = new Date(renewal.start_date);
        const endDate = new Date(value);
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffMonths = Math.round(diffTime / (1000 * 60 * 60 * 24 * 30));
        if (diffMonths > 0) {
          renewal.months_count = diffMonths;
        }
      }
    } else if (field === 'months_count') {
      renewal.months_count = parseInt(value) || 12;
      // Ricalcola end_date
      if (renewal.start_date) {
        const startDate = new Date(renewal.start_date);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + renewal.months_count);
        renewal.end_date = endDate.toISOString().split('T')[0];
      }
    } else if (field === 'fixed_amount') {
      renewal.fixed_amount = parseFloat(value) || 0;
    } else if (field.startsWith('variable_option_label_')) {
      // Modifica label di un'opzione variabile
      const optionIndex = parseInt(field.split('_')[3]);
      if (renewal.variable_amounts && renewal.variable_amounts[optionIndex]) {
        renewal.variable_amounts[optionIndex].label = value;
      }
    } else if (field.startsWith('variable_option_amount_')) {
      // Modifica amount di un'opzione variabile
      const optionIndex = parseInt(field.split('_')[3]);
      const newAmount = parseFloat(value) || 0;
      if (renewal.variable_amounts && renewal.variable_amounts[optionIndex]) {
        renewal.variable_amounts[optionIndex].amount = newAmount;
      }
    } else if (field === 'add_variable_option') {
      // Aggiungi nuova opzione variabile
      if (!renewal.variable_amounts) {
        renewal.variable_amounts = [];
      }
      renewal.variable_amounts.push({
        amount: 0,
        label: `Opzione ${renewal.variable_amounts.length + 1}`
      });
    } else if (field === 'remove_variable_option') {
      // Rimuovi opzione variabile
      const optionIndex = parseInt(value);
      if (renewal.variable_amounts && renewal.variable_amounts[optionIndex]) {
        renewal.variable_amounts = renewal.variable_amounts.filter((_, i) => i !== optionIndex);
      }
    }

    updated[index] = renewal;
    setRenewals(updated);
  };

  const handleDeleteRenewal = async (renewalId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo rinnovo?')) {
      return;
    }
    try {
      await paymentPlansApi.deleteRenewal(plan!.id, renewalId);
      setRenewals(renewals.filter(r => r.id !== renewalId));
      alert('Rinnovo eliminato con successo');
    } catch (error: any) {
      console.error('Errore nell\'eliminazione rinnovo:', error);
      alert(error.response?.data?.message || 'Errore nell\'eliminazione del rinnovo');
    }
  };

  const handleSave = async () => {
    if (!plan) return;

    try {
      setSaving(true);
      
      // Crea una mappa dei numeri di rata corretti basati sull'ordine cronologico
      // Le rate servizi e rinnovi sono numerate separatamente, ciascuna parte da 1
      const installmentNumberMap = new Map<number | undefined, number>();
      
      // Aggiungi i numeri delle rate servizi ordinate (partono da 1)
      serviceInstallments.forEach((inst, index) => {
        if (inst.id) {
          installmentNumberMap.set(inst.id, index + 1);
        }
      });
      
      // Aggiungi i numeri delle rate rinnovi ordinate (partono da 1)
      renewalInstallments.forEach((inst, index) => {
        if (inst.id) {
          installmentNumberMap.set(inst.id, index + 1);
        }
      });
      
      // Salva le rate con i numeri corretti
      const installmentsToSave = installments.map(inst => {
        // Trova il numero corretto dalla mappa, altrimenti usa quello esistente
        const correctNumber = inst.id ? installmentNumberMap.get(inst.id) : undefined;
        
        return {
          id: inst.id || undefined,
          installment_number: correctNumber || inst.installment_number || 1,
          due_date: inst.due_date,
          amount: inst.amount,
          original_amount: inst.original_amount || inst.amount,
          discount_amount: inst.discount_amount || 0,
          discount_reason: inst.discount_reason || undefined,
          description: inst.description || undefined,
        };
      });

      await paymentPlansApi.updateInstallments(plan.id, installmentsToSave);

      // Salva/aggiorna i rinnovi
      for (const renewal of renewals) {
        const renewalData: any = {
          renewal_type: renewal.renewal_type,
          frequency: renewal.frequency,
          start_date: renewal.start_date,
          months_count: renewal.months_count,
          fixed_amount: renewal.fixed_amount,
          variable_amounts: renewal.variable_amounts,
        };
        
        // Aggiungi end_date se presente
        if (renewal.end_date) {
          renewalData.end_date = renewal.end_date;
        }
        
        // Aggiungi is_active se presente
        if (renewal.is_active !== undefined) {
          renewalData.is_active = renewal.is_active;
        }
        
        if (renewal.id) {
          // Aggiorna rinnovo esistente
          await paymentPlansApi.updateRenewal(plan.id, renewal.id, renewalData);
        } else {
          // Crea nuovo rinnovo
          await paymentPlansApi.addRenewal(plan.id, renewalData);
        }
      }
      
      // Dopo aver salvato i rinnovi, ricarica il piano per aggiornare le rate
      await loadPaymentPlan();

      alert('Piano di pagamento aggiornato con successo!');
      navigate('/segreteria/fatture?tab=piani');
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error);
      alert(error.response?.data?.message || 'Errore nel salvataggio del piano');
    } finally {
      setSaving(false);
    }
  };

  // Funzione helper per ordinare le rate per data e rinumeraarle
  const sortAndRenumberInstallments = (insts: PaymentPlanInstallment[]): PaymentPlanInstallment[] => {
    // Ordina per data (due_date) in ordine crescente
    const sorted = [...insts].sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
      // Se le date sono uguali, mantieni l'ordine originale
      if (dateA === dateB) {
        return (a.installment_number || 0) - (b.installment_number || 0);
      }
      return dateA - dateB;
    });
    
    // Rinumera le rate in base all'ordine cronologico
    return sorted.map((inst, index) => ({
      ...inst,
      installment_number: index + 1
    }));
  };

  // Separa rate servizi da rate rinnovi e ordina per data
  // Usa useMemo per ricalcolare solo quando installments cambia
  const serviceInstallments = useMemo(() => {
    const filtered = installments.filter(inst => {
      // Se ha payment_type 'renewal', è sicuramente un rinnovo
      if (inst.payment_type === 'renewal') {
        return false;
      }
      // Se la descrizione contiene "Rinnovo", è un rinnovo anche se il tipo non è corretto
      if (inst.description && inst.description.toLowerCase().includes('rinnovo')) {
        return false;
      }
      // Solo rate servizi (installment o one_time)
      return inst.payment_type === 'installment' || inst.payment_type === 'one_time';
    });
    return sortAndRenumberInstallments(filtered);
  }, [installments]);
  
  const renewalInstallments = useMemo(() => {
    const filtered = installments.filter(inst => {
      // Rate con payment_type 'renewal'
      if (inst.payment_type === 'renewal') {
        return true;
      }
      // Rate con descrizione che contiene "Rinnovo" (per sicurezza)
      if (inst.description && inst.description.toLowerCase().includes('rinnovo')) {
        return true;
      }
      return false;
    });
    return sortAndRenumberInstallments(filtered);
  }, [installments]);

  const calculateTotal = (insts: PaymentPlanInstallment[]) => {
    return insts.reduce((sum, inst) => {
      let amount = inst.amount;
      if (amount === null || amount === undefined) {
        amount = 0;
      }
      if (typeof amount === 'string') {
        amount = parseFloat(amount) || 0;
      }
      if (isNaN(amount)) {
        amount = 0;
      }
      return sum + amount;
    }, 0);
  };

  const serviceTotal = calculateTotal(serviceInstallments);
  const renewalTotal = calculateTotal(renewalInstallments);
  const totalAmount = serviceTotal + renewalTotal;

  if (loading) {
    return (
      <div className="segreteria-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="segreteria-empty-state">
        <p>Piano di pagamento non trovato</p>
        <button onClick={() => navigate('/segreteria/fatture?tab=piani')}>Torna indietro</button>
      </div>
    );
  }

  return (
    <div className="edit-payment-plan-page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate('/segreteria/fatture?tab=piani')}>
          <ArrowLeft size={16} />
          Indietro
        </button>
        <div className="page-header-content">
          <h1 className="page-title">Modifica Piano di Pagamento</h1>
          <p className="page-subtitle">
            <span>{plan.client?.company_name}</span>
            <span>{plan.project?.name || 'Progetto non specificato'}</span>
          </p>
        </div>
      </div>

      <div className="content-grid">
        {/* Informazioni Piano */}
        <div className="info-card">
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">Contratto</span>
              <span className="info-value">{plan.contract?.contract_number || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Cliente</span>
              <span className="info-value">{plan.client?.company_name || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Progetto</span>
              <span className="info-value">{plan.project?.name || '-'}</span>
            </div>
            <div className="info-item highlight">
              <span className="info-label">Totale Piano</span>
              <span className="info-value">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          {(plan.quote || plan.contract) && (
            <div className="info-actions">
              {plan.quote && (
                <button className="btn-download" onClick={handleDownloadQuote}>
                  <Download size={16} />
                  Scarica Preventivo PDF
                </button>
              )}
              {plan.contract && (
                <button className="btn-download" onClick={handleDownloadContract}>
                  <Download size={16} />
                  Scarica Contratto
                </button>
              )}
            </div>
          )}
        </div>

        {/* Rate Servizi */}
        <div className="service-installments-section">
          <div className="section-header">
            <div className="section-title">
              <Calendar size={20} />
              Rate Servizi
            </div>
            <div className="section-actions">
              <button className="btn-add-secondary" onClick={handleAddTantum}>
                <Plus size={16} />
                Aggiungi Pagamento Unico
              </button>
              <button className="btn-add" onClick={handleAddInstallment}>
                <Plus size={16} />
                Aggiungi Rata
              </button>
            </div>
          </div>

          {serviceInstallments.length > 0 ? (
            <>
              <div className="installments-table-container">
                <table className="installments-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tipo</th>
                      <th>Data Scadenza</th>
                      <th>Importo Originale</th>
                      <th>Sconto</th>
                      <th>Motivazione Sconto</th>
                      <th>Importo Finale</th>
                      <th>Descrizione</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceInstallments.map((installment, originalIndex) => {
                      // Trova l'indice corretto nell'array completo installments usando la funzione helper
                      const index = findInstallmentIndex(installment, originalIndex, false);
                      
                      return (
                        <tr key={installment.id || originalIndex}>
                          <td>{installment.installment_number}</td>
                          <td>
                            <span className={`payment-type-badge payment-type-${installment.payment_type}`}>
                              {installment.payment_type === 'one_time' ? 'Pagamento Unico' : 'Rata Servizio'}
                            </span>
                          </td>
                          <td>
                            <div className="date-input-wrapper">
                              <Calendar size={16} className="date-input-icon" />
                              <input
                                type="date"
                                value={formatDate(installment.due_date)}
                                onChange={(e) => handleUpdateInstallment(index, 'due_date', e.target.value)}
                                className="table-input date-input"
                              />
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={installment.original_amount || installment.amount || 0}
                              onChange={(e) => handleUpdateInstallment(index, 'original_amount', e.target.value)}
                              className="table-input"
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={installment.discount_amount || 0}
                              onChange={(e) => handleUpdateInstallment(index, 'discount_amount', e.target.value)}
                              className="table-input"
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={installment.discount_reason || ''}
                              onChange={(e) => handleUpdateInstallment(index, 'discount_reason', e.target.value)}
                              className="table-input"
                              placeholder="Motivazione..."
                            />
                          </td>
                          <td className="final-amount">
                            {formatCurrency(installment.amount || 0)}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={installment.description || ''}
                              onChange={(e) => handleUpdateInstallment(index, 'description', e.target.value)}
                              className="table-input"
                              placeholder="Descrizione..."
                            />
                          </td>
                          <td>
                            <button
                              className="btn-remove"
                              onClick={() => handleDeleteInstallment(index)}
                              title="Elimina rata"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="total-summary">
                <div className="total-item">
                  <span className="total-label">Totale Rate Servizi:</span>
                  <span className="total-value">{formatCurrency(serviceTotal)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <AlertCircle size={48} />
              <p>Nessuna rata servizio configurata</p>
            </div>
          )}
        </div>

        {/* Rate Rinnovi */}
        <div className="renewal-installments-section">
          <div className="section-header">
            <div className="section-title">
              <RefreshCw size={20} />
              Rate Rinnovi
            </div>
            <button className="btn-add" onClick={handleAddRenewalInstallment}>
              <Plus size={16} />
              Aggiungi Rata Rinnovo
            </button>
          </div>

          {renewalInstallments.length > 0 ? (
            <>
              <div className="installments-table-container">
                <table className="installments-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Data Scadenza</th>
                      <th>Opzione Rinnovo</th>
                      <th>Importo Originale</th>
                      <th>Sconto</th>
                      <th>Motivazione Sconto</th>
                      <th>Importo Finale</th>
                      <th>Descrizione</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renewalInstallments.map((installment, originalIndex) => {
                      // Trova l'indice corretto nell'array completo installments usando la funzione helper
                      const index = findInstallmentIndex(installment, originalIndex, true);
                      
                      const renewalOptions = getRenewalOptionsForInstallment(installment);
                      const isVariableRenewal = renewalOptions.length > 0;
                      const currentOptionLabel = isVariableRenewal 
                        ? renewalOptions.find(opt => opt.amount === installment.amount)?.label 
                        : null;

                      return (
                        <tr key={installment.id || `renewal-${originalIndex}`}>
                          <td>{installment.installment_number}</td>
                          <td>
                            <div className="date-input-wrapper">
                              <Calendar size={16} className="date-input-icon" />
                              <input
                                type="date"
                                value={formatDate(installment.due_date)}
                                onChange={(e) => handleUpdateInstallment(index, 'due_date', e.target.value)}
                                className="table-input date-input"
                              />
                            </div>
                          </td>
                          <td>
                            {isVariableRenewal ? (
                              <select
                                value={currentOptionLabel || ''}
                                onChange={(e) => handleUpdateInstallment(index, 'renewal_option', e.target.value)}
                                className="table-input"
                              >
                                <option value="">Seleziona opzione...</option>
                                {renewalOptions.map((option, optIdx) => (
                                  <option key={optIdx} value={option.label}>
                                    {option.label} - {formatCurrency(option.amount)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="no-option">Rinnovo Fisso</span>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={installment.original_amount || installment.amount || 0}
                              onChange={(e) => handleUpdateInstallment(index, 'original_amount', e.target.value)}
                              className="table-input"
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={installment.discount_amount || 0}
                              onChange={(e) => handleUpdateInstallment(index, 'discount_amount', e.target.value)}
                              className="table-input"
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={installment.discount_reason || ''}
                              onChange={(e) => handleUpdateInstallment(index, 'discount_reason', e.target.value)}
                              className="table-input"
                              placeholder="Motivazione..."
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={installment.amount || 0}
                              onChange={(e) => handleUpdateInstallment(index, 'final_amount', e.target.value)}
                              className="table-input"
                              placeholder="0.00"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={installment.description || ''}
                              onChange={(e) => handleUpdateInstallment(index, 'description', e.target.value)}
                              className="table-input"
                              placeholder="Descrizione..."
                            />
                          </td>
                          <td>
                            <button
                              className="btn-remove"
                              onClick={() => handleDeleteInstallment(index)}
                              title="Elimina rata rinnovo"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="total-summary">
                <div className="total-item">
                  <span className="total-label">Totale Rate Rinnovi:</span>
                  <span className="total-value">{formatCurrency(renewalTotal)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <AlertCircle size={48} />
              <p>Nessuna rata rinnovo configurata</p>
            </div>
          )}
        </div>

        {/* Configurazione Rinnovi */}
        <div className="renewals-config-section">
          <div className="section-header">
            <div className="section-title">
              <RefreshCw size={20} />
              Configurazione Rinnovi
            </div>
          </div>
          <div className="section-description">
            <p>Qui puoi configurare i parametri dei rinnovi (frequenza, tipo, durata). Le rate di rinnovo vengono visualizzate nella sezione "Rate Rinnovi" sopra.</p>
          </div>

          {renewals.length > 0 ? (
            <>

            {renewals.map((renewal, index) => (
              <div key={renewal.id} className="renewal-card">
                <div className="renewal-header">
                  <h4>Rinnovo #{index + 1}</h4>
                  <button
                    className="btn-remove"
                    onClick={() => renewal.id && handleDeleteRenewal(renewal.id)}
                    title="Elimina rinnovo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="renewal-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo Rinnovo</label>
                      <select
                        value={renewal.renewal_type}
                        onChange={(e) => handleUpdateRenewal(index, 'renewal_type', e.target.value)}
                        className="form-input"
                      >
                        <option value="fixed">Fisso</option>
                        <option value="variable">Variabile</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Frequenza</label>
                      <select
                        value={renewal.frequency}
                        onChange={(e) => handleUpdateRenewal(index, 'frequency', e.target.value)}
                        className="form-input"
                      >
                        <option value="monthly">Mensile</option>
                        <option value="bimonthly">Bimestrale</option>
                        <option value="quarterly">Trimestrale</option>
                        <option value="semiannual">Semestrale</option>
                        <option value="yearly">Annuale</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Data Inizio</label>
                      <div className="date-input-wrapper">
                        <Calendar size={16} className="date-input-icon" />
                        <input
                          type="date"
                          value={formatDate(renewal.start_date)}
                          onChange={(e) => handleUpdateRenewal(index, 'start_date', e.target.value)}
                          className="form-input date-input"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Data Fine</label>
                      <div className="date-input-wrapper">
                        <Calendar size={16} className="date-input-icon" />
                        <input
                          type="date"
                          value={renewal.end_date ? formatDate(renewal.end_date) : ''}
                          onChange={(e) => handleUpdateRenewal(index, 'end_date', e.target.value)}
                          className="form-input date-input"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Numero Mesi</label>
                      <input
                        type="number"
                        value={renewal.months_count}
                        onChange={(e) => handleUpdateRenewal(index, 'months_count', e.target.value)}
                        className="form-input"
                        min="1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Stato</label>
                      <select
                        value={renewal.is_active ? 'active' : 'inactive'}
                        onChange={(e) => handleUpdateRenewal(index, 'is_active', e.target.value === 'active')}
                        className="form-input"
                      >
                        <option value="active">Attivo</option>
                        <option value="inactive">Inattivo</option>
                      </select>
                    </div>
                  </div>
                  {renewal.renewal_type === 'fixed' && (
                    <div className="form-group">
                      <label>Importo Fisso Mensile</label>
                      <input
                        type="number"
                        step="0.01"
                        value={renewal.fixed_amount || 0}
                        onChange={(e) => handleUpdateRenewal(index, 'fixed_amount', e.target.value)}
                        className="form-input"
                      />
                    </div>
                  )}
                  {renewal.renewal_type === 'variable' && (
                    <div className="form-group">
                      <div className="variable-options-header">
                        <label>Opzioni Variabili</label>
                        <button
                          type="button"
                          className="btn-add-small"
                          onClick={() => handleUpdateRenewal(index, 'add_variable_option', '')}
                        >
                          <Plus size={14} />
                          Aggiungi Opzione
                        </button>
                      </div>
                      {renewal.variable_amounts && renewal.variable_amounts.length > 0 ? (
                        <div className="variable-options-list">
                          {renewal.variable_amounts.map((option, optIndex) => (
                            <div key={optIndex} className="variable-option-editable">
                              <div className="variable-option-row">
                                <input
                                  type="text"
                                  value={option.label}
                                  onChange={(e) => handleUpdateRenewal(index, `variable_option_label_${optIndex}`, e.target.value)}
                                  className="form-input variable-option-label"
                                  placeholder="Nome opzione..."
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  value={option.amount}
                                  onChange={(e) => handleUpdateRenewal(index, `variable_option_amount_${optIndex}`, e.target.value)}
                                  className="form-input variable-option-amount"
                                  placeholder="0.00"
                                />
                                <button
                                  type="button"
                                  className="btn-remove-small"
                                  onClick={() => handleUpdateRenewal(index, 'remove_variable_option', optIndex.toString())}
                                  title="Rimuovi opzione"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="variable-options-empty">
                          <p>Nessuna opzione configurata. Aggiungi almeno un'opzione.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            </>
          ) : (
            <div className="empty-state">
              <AlertCircle size={48} />
              <p>Nessun rinnovo configurato</p>
            </div>
          )}
        </div>

        {/* Totale Complessivo */}
        <div className="total-plan-section">
          <div className="total-plan-card">
            <div className="total-plan-header">
              <DollarSign size={24} />
              <h3>Totale Piano di Pagamento</h3>
            </div>
            <div className="total-plan-breakdown">
              <div className="total-breakdown-item">
                <span className="breakdown-label">Totale Rate Servizi:</span>
                <span className="breakdown-value">{formatCurrency(serviceTotal)}</span>
              </div>
              <div className="total-breakdown-item">
                <span className="breakdown-label">Totale Rate Rinnovi:</span>
                <span className="breakdown-value">{formatCurrency(renewalTotal)}</span>
              </div>
              <div className="total-breakdown-item total-breakdown-final">
                <span className="breakdown-label">Totale Complessivo:</span>
                <span className="breakdown-value">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-footer">
        <button className="btn-secondary" onClick={() => navigate('/segreteria/fatture?tab=piani')}>
          Annulla
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Salvataggio...' : 'Salva Modifiche'}
        </button>
      </div>
    </div>
  );
};

export default EditPaymentPlanPage;

