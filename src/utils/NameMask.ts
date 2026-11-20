/** Hides people's full names where other users see them (bid history, custom orders): "Ana Collins" → "A*** C.". */
export class NameMask {
  static mask(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "***";
    const first = `${parts[0][0]}***`;
    return parts.length > 1 ? `${first} ${parts[parts.length - 1][0]}.` : first;
  }
}
