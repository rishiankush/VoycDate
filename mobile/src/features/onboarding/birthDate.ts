/** Inserts slashes as the user types digits: "15031997" becomes "15/03/1997". */
export function formatBirthDateInput(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
}

/** Returns an ISO date (YYYY-MM-DD) for a complete, real DD/MM/YYYY input, otherwise null. */
export function parseBirthDateInput(input: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real || date.getTime() > Date.now()) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function toDisplayBirthDate(iso: string) {
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function ageFromBirthDate(iso: string, today = new Date()) {
  const [year, month, day] = iso.split('-').map(Number);
  let age = today.getFullYear() - year;
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}
