import { readFileSync } from "node:fs";

/** Reads the semicolon-separated CSV files of the inventory (Excel in Spanish saves them this way). */
export class CsvReader {
  /** Returns one object per row, keyed by the header names. Empty rows are skipped. */
  static read(path: string): Record<string, string>[] {
    const text = readFileSync(path, "utf8").replace(/^﻿/, "");
    const [header, ...rows] = CsvReader.parse(text);
    return rows
      .filter((cells) => cells.some((cell) => cell.trim() !== ""))
      .map((cells) => Object.fromEntries(header.map((name, index) => [name.trim(), (cells[index] ?? "").trim()])));
  }

  /** Splits the text into rows and cells; supports quoted cells with ";" or line breaks inside. */
  private static parse(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"' && cell === "") quoted = true;
      else if (char === ";") {
        row.push(cell);
        cell = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else cell += char;
    }
    if (cell !== "" || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }
}
