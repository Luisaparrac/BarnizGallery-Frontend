import { Signal } from "../../core/Signal";
import "../ui/kit/dom-ui.css";

/**
 * Bar at the bottom of the screen while the visitor picks an avatar on the pedestals (HTML over
 * the canvas): what to do, the name of the chosen one and the Continue button (disabled until
 * one is chosen).
 */
export class LobbyPrompt {
  readonly continuePressed = new Signal();

  private readonly bar: HTMLDivElement;
  private readonly text: HTMLSpanElement;
  private readonly button: HTMLButtonElement;

  constructor(continueLabel: string) {
    this.bar = document.createElement("div");
    this.bar.className = "mu-hud-bar";
    this.bar.hidden = true;
    this.text = document.createElement("span");
    this.text.setAttribute("role", "status");
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "mu-button is-primary";
    this.button.textContent = continueLabel;
    this.button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (!this.button.disabled) this.continuePressed.emit();
    });
    this.bar.append(this.text, this.button);
    document.body.append(this.bar);
  }

  show(text: string, canContinue: boolean): void {
    this.text.textContent = text;
    this.button.disabled = !canContinue;
    this.bar.hidden = false;
  }

  hide(): void {
    this.bar.hidden = true;
  }

  dispose(): void {
    this.bar.remove();
  }
}
