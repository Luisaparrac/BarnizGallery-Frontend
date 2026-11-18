import type { ReactNode } from "react";

/** Label, control and optional hint or error, stacked. */
export function Field({ label, hint, error, children, wide }: { label: string; hint?: string; error?: string | null; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field${wide ? " field-wide" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

/** A group of controls that is not a single input (chip pickers, radio groups). */
export function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="field field-wide">
      <legend className="field-label">{label}</legend>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </fieldset>
  );
}
