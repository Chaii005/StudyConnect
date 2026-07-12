import { useState, useEffect, useRef } from 'react';

export function SafeInput({ value, onChange, onCompositionStart, onCompositionEnd, ...props }) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const isComposing = useRef(false);

  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    if (!isComposing.current && onChange) {
      onChange(e);
    }
  };

  return (
    <input
      {...props}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={(e) => {
        isComposing.current = true;
        if (onCompositionStart) onCompositionStart(e);
      }}
      onCompositionEnd={(e) => {
        isComposing.current = false;
        if (onCompositionEnd) onCompositionEnd(e);
        if (onChange) onChange(e);
      }}
    />
  );
}

export function SafeTextarea({ value, onChange, onCompositionStart, onCompositionEnd, ...props }) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const isComposing = useRef(false);

  useEffect(() => {
    if (!isComposing.current) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    if (!isComposing.current && onChange) {
      onChange(e);
    }
  };

  return (
    <textarea
      {...props}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={(e) => {
        isComposing.current = true;
        if (onCompositionStart) onCompositionStart(e);
      }}
      onCompositionEnd={(e) => {
        isComposing.current = false;
        if (onCompositionEnd) onCompositionEnd(e);
        if (onChange) onChange(e);
      }}
    />
  );
}
