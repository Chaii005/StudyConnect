import { useState, useEffect, forwardRef } from 'react';

export const SafeInput = forwardRef(function SafeInput({ value, onChange, onCompositionStart, onCompositionEnd, ...props }, ref) {
  const [localValue, setLocalValue] = useState(value ?? '');

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <input
      ref={ref}
      {...props}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
    />
  );
});

export const SafeTextarea = forwardRef(function SafeTextarea({ value, onChange, onCompositionStart, onCompositionEnd, ...props }, ref) {
  const [localValue, setLocalValue] = useState(value ?? '');

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <textarea
      ref={ref}
      {...props}
      value={localValue}
      onChange={handleChange}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
    />
  );
});
