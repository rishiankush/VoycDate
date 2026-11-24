/** Age in years from an ISO `YYYY-MM-DD` birthday (UTC calendar). */
export function ageFromBirthDate(iso: string, today = new Date()) {
  const [year, month, day] = iso.split('-').map(Number);
  let age = today.getUTCFullYear() - year;
  const beforeBirthday =
    today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}
