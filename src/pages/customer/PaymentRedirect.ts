import type { NavigateFunction } from "react-router-dom";

/** Sends the customer to the gateway: an external URL for a real gateway, an internal page for the simulated one. */
export class PaymentRedirect {
  static go(checkoutUrl: string, navigate: NavigateFunction): void {
    if (/^https?:\/\//.test(checkoutUrl)) window.location.href = checkoutUrl;
    else navigate(checkoutUrl);
  }
}
