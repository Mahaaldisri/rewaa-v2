import { useId, type ChangeEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";

/**
 * Form primitives with real labels, required markers, Arabic error messages and
 * accessible wiring (`aria-invalid`, `aria-describedby`, `role="alert"`).
 */

interface BaseProps {
  label: string;
  name?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

const controlClass = (error?: string, disabled?: boolean) =>
  cn(
    "h-11 w-full rounded-md border bg-surface px-3.5 text-[13.5px] text-ink-900 transition placeholder:text-ink-400",
    "focus:outline-none focus:ring-2",
    error
      ? "border-danger/50 focus:border-danger focus:ring-danger/20"
      : "border-ink-200 focus:border-brand-500 focus:ring-brand-200",
    disabled && "cursor-not-allowed bg-ink-50 text-ink-400"
  );

function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
  className,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[12.5px] font-semibold text-ink-700">
        {label}
        {required && <span className="ms-1 text-danger" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(مطلوب)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[11.5px] leading-5 text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[11.5px] font-medium text-danger">
          <Icon name="alert" size={12} strokeWidth={2.2} />
          {error}
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: string, error?: string) =>
  [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;

/* -------------------------------- Input --------------------------------- */
interface InputProps extends BaseProps {
  type?: "text" | "email" | "tel" | "number" | "date" | "password" | "search" | "url";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: IconName;
  autoComplete?: string;
  min?: number | string;
  max?: number | string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
  onBlur?: () => void;
  maxLength?: number;
}

export function TextField({
  label,
  name,
  hint,
  error,
  required,
  className,
  disabled,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  autoComplete,
  min,
  max,
  inputMode,
  onBlur,
  maxLength,
}: InputProps) {
  const generatedId = useId();
  const id = `${name ?? "field"}-${generatedId}`;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        {icon && (
          <Icon
            name={icon}
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, hint, error)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          onBlur={onBlur}
          className={cn(controlClass(error, disabled), icon && "ps-9")}
        />
      </div>
    </FieldShell>
  );
}

/* ------------------------------- Textarea -------------------------------- */
interface TextareaProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

export function TextArea({
  label,
  name,
  hint,
  error,
  required,
  className,
  disabled,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
}: TextareaProps) {
  const generatedId = useId();
  const id = `${name ?? "textarea"}-${generatedId}`;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlClass(error, disabled), "h-auto py-2.5 leading-6")}
      />
      {maxLength && (
        <p className="text-end text-[11px] text-ink-400">
          {value.length}/{maxLength}
        </p>
      )}
    </FieldShell>
  );
}

/* --------------------------------- Select -------------------------------- */
interface SelectProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export function SelectField({
  label,
  name,
  hint,
  error,
  required,
  className,
  disabled,
  value,
  onChange,
  options,
  placeholder = "اختر…",
}: SelectProps) {
  const generatedId = useId();
  const id = `${name ?? "select"}-${generatedId}`;

  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        <select
          id={id}
          name={name}
          value={value}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, hint, error)}
          onChange={(event) => onChange(event.target.value)}
          className={cn(controlClass(error, disabled), "appearance-none pe-9")}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          size={16}
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-400"
        />
      </div>
    </FieldShell>
  );
}

/* ------------------------------- Checkbox -------------------------------- */
interface CheckboxProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CheckboxField({ label, checked, onChange, error, required, disabled, className }: CheckboxProps) {
  const generatedId = useId();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={generatedId} className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-6 text-ink-700">
        <input
          id={generatedId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 size-4 shrink-0 rounded-xs border-ink-300 text-brand-700 focus:ring-brand-300"
        />
        <span>{label}</span>
      </label>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[11.5px] font-medium text-danger">
          <Icon name="alert" size={12} strokeWidth={2.2} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ Radio group ------------------------------ */
interface RadioGroupProps {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string; description?: string; icon?: IconName; disabled?: boolean }[];
  error?: string;
  columns?: 1 | 2 | 3;
  className?: string;
}

/** Accessible radio card group — used by the service wizard and product finder. */
export function RadioCardGroup({
  legend,
  name,
  value,
  onChange,
  options,
  error,
  columns = 2,
  className,
}: RadioGroupProps) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-2.5 text-[13px] font-bold text-ink-800">{legend}</legend>
      <div
        className={cn(
          "grid gap-2.5",
          columns === 1 ? "grid-cols-1" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        )}
      >
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition",
                selected
                  ? "border-brand-500 bg-brand-50/60 ring-1 ring-inset ring-brand-200"
                  : "border-ink-200 bg-surface hover:border-brand-300 hover:bg-ink-50/60",
                option.disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={selected}
                disabled={option.disabled}
                onChange={() => onChange(option.id)}
                className="mt-0.5 size-4 shrink-0 text-brand-700 focus:ring-brand-300"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[13px] font-bold text-ink-900">
                  {option.icon && <Icon name={option.icon} size={15} className="text-brand-600" />}
                  {option.label}
                </span>
                {option.description && (
                  <span className="mt-1 block text-[11.5px] leading-5 text-ink-500">{option.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-[11.5px] font-medium text-danger">
          <Icon name="alert" size={12} strokeWidth={2.2} />
          {error}
        </p>
      )}
    </fieldset>
  );
}
