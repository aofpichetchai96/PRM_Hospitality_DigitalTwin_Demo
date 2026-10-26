/** Thousands separators with a fixed number of decimals (prototype `fmt`) */
export function fmt(n: number, digits = 0) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Decimal hour → "HH:MM" (prototype `timeStr`) */
export function timeStr(time: number) {
  const minutes = Math.round(time * 60);
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
