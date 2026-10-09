type Child = Node | string | null | undefined | false;

/** Minimal hyperscript helper: h("div.class#id", { onclick }, child, child...) */
export function h<K extends keyof HTMLElementTagNameMap>(
  spec: K | `${K}.${string}`,
  props: Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const [tag, ...classes] = spec.split(".");
  const el = document.createElement(tag) as HTMLElementTagNameMap[K];
  if (classes.length) el.className = classes.join(" ");
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else if (k in el && k !== "list") (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c) el.append(c);
  return el;
}
