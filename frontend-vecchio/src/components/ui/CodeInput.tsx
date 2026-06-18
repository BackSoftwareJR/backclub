/**
 * Input specializzato per codici 2FA
 * Auto-tab tra i digit, paste support, iOS autofill
 */

import { useRef, useState, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function CodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}: CodeInputProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  // Focus primo input al mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Callback quando codice completo
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (index: number, digit: string) => {
    // Solo numeri
    const sanitized = digit.replace(/[^0-9]/g, '');
    
    if (sanitized.length === 0) {
      // Cancellazione
      const newValue = digits.map((d, i) => i === index ? '' : d).join('');
      onChange(newValue);
      return;
    }

    if (sanitized.length === 1) {
      // Singolo digit
      const newDigits = [...digits];
      newDigits[index] = sanitized;
      onChange(newDigits.join(''));
      
      // Auto-focus next
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
        setActiveIndex(index + 1);
      }
    } else {
      // Paste di codice completo
      handlePaste(sanitized);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && digits[index] === '') {
      // Se vuoto, torna indietro
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handlePaste = (pastedText: string) => {
    const numbers = pastedText.replace(/[^0-9]/g, '').slice(0, length);
    onChange(numbers);
    
    // Focus ultimo digit o next empty
    const nextIndex = Math.min(numbers.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
    setActiveIndex(nextIndex);
  };

  const handlePasteEvent = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    handlePaste(pastedText);
  };

  return (
    <div className="flex gap-2.5 justify-center px-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePasteEvent}
          onFocus={() => setActiveIndex(index)}
          disabled={disabled}
          className={`
            w-14 h-16 text-center text-3xl font-semibold rounded-2xl
            border-2 transition-all duration-300
            ${error 
              ? 'border-red-400 bg-red-50/50 text-red-700 shadow-sm shadow-red-100' 
              : activeIndex === index
                ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100 ring-4 ring-blue-100/50 scale-105'
                : digit
                  ? 'border-gray-300 bg-white shadow-sm hover:border-gray-400'
                  : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
            focus:outline-none 
            backdrop-blur-sm
          `}
          style={{
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
}

