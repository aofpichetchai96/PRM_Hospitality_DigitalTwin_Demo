// The real time in Thailand (header clock, the assistant's context line). The simulation clock is separate: it is
// the footer slider and drives every simulated number.
import { useSyncExternalStore } from "react";

const BANGKOK = "Asia/Bangkok";
const clockTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: BANGKOK,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
// "28 Oct 26"
const clockDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: BANGKOK,
  day: "2-digit",
  month: "short",
  year: "2-digit",
});

/** Wall-clock minute in Thailand, ticking on the client; null while prerendering (no hydration mismatch) */
function subscribeMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 5_000);
  return () => window.clearInterval(id);
}
const minuteNow = () => Math.floor(Date.now() / 60_000);
const noMinute = () => null;

export function useBangkokClock() {
  const minute = useSyncExternalStore(subscribeMinute, minuteNow, noMinute);
  if (minute === null) return { time: "--:--", date: "" };
  const now = new Date(minute * 60_000);
  return { time: clockTime.format(now), date: clockDate.format(now) };
}
