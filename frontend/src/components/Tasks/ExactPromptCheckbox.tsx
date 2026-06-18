import React from 'react';
import './ExactPromptCheckbox.css';

interface ExactPromptCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

const ExactPromptCheckbox: React.FC<ExactPromptCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
  id = 'exact-prompt',
}) => (
  <div className="exact-prompt-checkbox">
    <label htmlFor={id} className="exact-prompt-checkbox-label">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>Corrispondenza esatta prompt</span>
    </label>
    <p className="exact-prompt-checkbox-hint" title="Quando attivo, il prompt viene inviato così com'è senza miglioramento AI via Groq">
      Se attivo, il prompt viene inviato così com&apos;è all&apos;orchestratore, senza miglioramento AI (Groq).
    </p>
  </div>
);

export default ExactPromptCheckbox;
