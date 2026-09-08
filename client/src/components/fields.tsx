/**
 * Field library — every input flavour of the product, styled on the same
 * design tokens (navy/lavender palette, 9px radius, focus ring) so any form
 * anywhere looks and behaves the same. Each control forwards native props, so
 * the library never blocks a form API, and every control can be wrapped in
 * <Field> to add a label, hint and inline error.
 *
 *   TextInput     name/email/url/any string
 *   NumberInput   geometry, prices, counts
 *   TextAreaInput multi-line text
 *   SelectField   options (chevron adornment)
 *   SearchField   filter boxes (magnifier)
 *   PasswordInput password with show/hide
 *   ColorField    preset swatches + custom colour picker + hex readout
 *   RangeField    sliders
 *   Field         label / optional / hint / error wrapper
 */
import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useState } from 'react';
import { IconChevronDown, IconEye, IconEyeOff, IconSearch, IconX } from './icons';

export function Field({
  label,
  required,
  hint,
  error,
  children,
  htmlFor,
  className = '',
}: {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={`f-row ${className}`}>
      {label && (
        <label className="f-label" htmlFor={htmlFor}>
          <span>{label}</span>
          {required && (
            <span className="f-req" title="Required">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && <span className="f-hint">{hint}</span>}
      {error && <span className="f-error">{error}</span>}
    </div>
  );
}

const sizeClass = (size: 'md' | 'sm' | 'lg') => (size === 'md' ? '' : size === 'sm' ? 'f-sm' : 'f-lg');

export function TextInput({
  size = 'md',
  invalid,
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: 'md' | 'sm' | 'lg'; invalid?: boolean }) {
  return <input className={`f-input ${sizeClass(size)} ${invalid ? 'f-invalid' : ''} ${className}`.trim()} {...rest} />;
}

export function NumberInput({
  size = 'md',
  invalid,
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & { size?: 'md' | 'sm' | 'lg'; invalid?: boolean }) {
  return <input type="number" className={`f-input ${sizeClass(size)} ${invalid ? 'f-invalid' : ''} ${className}`.trim()} {...rest} />;
}

export function TextAreaInput({
  size = 'md',
  invalid,
  className = '',
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & { size?: 'md' | 'sm' | 'lg'; invalid?: boolean }) {
  return <textarea className={`f-area ${sizeClass(size)} ${invalid ? 'f-invalid' : ''} ${className}`.trim()} {...rest} />;
}

export function SelectField({
  size = 'md',
  invalid,
  className = '',
  children,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: 'md' | 'sm' | 'lg'; invalid?: boolean }) {
  return (
    <span className="f-select-wrap">
      <select className={`f-select ${sizeClass(size)} ${invalid ? 'f-invalid' : ''} ${className}`.trim()} {...rest}>
        {children}
      </select>
      <IconChevronDown size={15} />
    </span>
  );
}

export function SearchField({ size = 'md', className = '', ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: 'md' | 'sm' | 'lg' }) {
  return (
    <span className="f-search">
      <IconSearch size={15} />
      <input type="search" className={`f-input ${sizeClass(size)} ${className}`.trim()} {...rest} />
    </span>
  );
}

export function PasswordInput({
  size = 'md',
  invalid,
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: 'md' | 'sm' | 'lg'; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <span className="f-password">
      <input type={show ? 'text' : 'password'} className={`f-input ${sizeClass(size)} ${invalid ? 'f-invalid' : ''} ${className}`.trim()} {...rest} />
      <button type="button" className="f-eye" tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)}>
        {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
      </button>
    </span>
  );
}

/** Colour field: preset swatches + custom picker + hex value. Optionally clears. */
export function ColorField({
  value,
  onChange,
  presets = ['#1b2559', '#0ea5a0', '#2563eb', '#7c3aed', '#e11d48', '#f59e0b', '#0f172a', '#ffffff'],
  allowClear = true,
  name,
  'aria-label': ariaLabel,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  presets?: string[];
  allowClear?: boolean;
  name?: string;
  'aria-label'?: string;
}) {
  const hex = value ?? '#ffffff';
  return (
    <span className="f-color">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          className={`swatch ${value?.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
          style={{ background: c }}
          aria-label={`Colour ${c}`}
          onClick={() => onChange(c)}
        />
      ))}
      <label className="f-color-picker" title="Custom colour" aria-label={ariaLabel ?? 'Custom colour'}>
        <input type="color" name={name} value={hex} onChange={(e) => onChange(e.target.value)} />
      </label>
      {allowClear && (
        <button type="button" className="swatch" title="Clear colour" aria-label="Clear colour" onClick={() => onChange(null)}>
          <IconX size={11} />
        </button>
      )}
      <span className="f-color-hex">{value ? value.toUpperCase() : 'None'}</span>
    </span>
  );
}

export function RangeField({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max' | 'step'> & {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <span className="f-range">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} {...rest} />
      <output>
        {value}
        {unit}
      </output>
    </span>
  );
}
