import { useEffect, useState } from "react";
import { useLocale } from "../state/LocaleContext";

/** Time left until a date, updated every second. */
export function Countdown({ until }: { until: string }) {
  const { i18n } = useLocale();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const left = Math.max(0, Date.parse(until) - now);
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    <span className="countdown" aria-live="off">
      {days > 0 && `${days} ${i18n.t("common.daysShort")} `}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
