export const SESSION_COOKIE = 'sid';

export function sessionTtlMs(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? 8);
  return (Number.isFinite(hours) && hours > 0 ? hours : 8) * 60 * 60 * 1000;
}
