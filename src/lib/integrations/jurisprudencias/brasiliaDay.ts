/** Brasília keeps UTC−3 all year (no daylight saving since 2019). */
const BRASILIA_UTC_OFFSET_HOURS = -3;
const MS_PER_HOUR = 3_600_000;

/** When today began in Brasília, where the service's daily allowances reset. */
export function startOfBrasiliaDay(now: Date): Date {
  const local = new Date(now.getTime() + BRASILIA_UTC_OFFSET_HOURS * MS_PER_HOUR);
  const midnightLocalAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnightLocalAsUtc - BRASILIA_UTC_OFFSET_HOURS * MS_PER_HOUR);
}
