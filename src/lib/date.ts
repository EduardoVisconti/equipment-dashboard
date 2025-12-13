export function parseDateOnly(date: string) {
  if (!date) return null;

  // Se já vier com T, é ISO completo
  if (date.includes("T")) {
    return new Date(date);
  }

  // Se for YYYY-MM-DD, força local time
  return new Date(`${date}T00:00:00`);
}
