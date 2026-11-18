import type { Id } from "../domain/common";

export interface ChipOption {
  id: Id;
  label: string;
  /** Color swatch (hex) or "multi" for the multicolor dot. */
  swatch?: string | null;
}

/** Toggle buttons to choose one or several catalog values. */
export function ChipPicker({ options, selected, onChange, multiple = true }: { options: ChipOption[]; selected: Id[]; onChange(next: Id[]): void; multiple?: boolean }) {
  const toggle = (id: Id) => {
    if (!multiple) return onChange(selected.includes(id) ? [] : [id]);
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  };
  return (
    <div className="chips">
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <button key={option.id} type="button" className={`chip${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => toggle(option.id)}>
            {option.swatch !== undefined && <span className={`swatch${option.swatch ? "" : " swatch-multi"}`} style={option.swatch ? { background: option.swatch } : undefined} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
