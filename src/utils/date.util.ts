const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET = '+07:00';

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Returns the YYYY-MM-DD string representation of a date in Vietnam Time (UTC+7).
 */
export function getVNDateString(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return vnDateFormatter.format(d);
}

/**
 * Returns the start of day (00:00:00.000) in Vietnam Time as a UTC Date object.
 */
export function startOfDayVN(date: Date | string = new Date()): Date {
  const dateStr = getVNDateString(date);
  return new Date(`${dateStr}T00:00:00.000${VN_OFFSET}`);
}

/**
 * Returns the end of day (23:59:59.999) in Vietnam Time as a UTC Date object.
 */
export function endOfDayVN(date: Date | string = new Date()): Date {
  const dateStr = getVNDateString(date);
  return new Date(`${dateStr}T23:59:59.999${VN_OFFSET}`);
}

/**
 * Adds hours to a Date object.
 */
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Adds days to a Date object.
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Checks whether a given check-in time slot on a specific check-in date has already passed in Vietnam Time.
 * If checkInDate is before today in VN -> true.
 * If checkInDate is after today in VN -> false.
 * If checkInDate is today in VN -> checks if slot start time (HH:mm) is in the past.
 */
export function isSlotPassedTodayVN(
  checkInDate: Date | string,
  slotTimeStr: string,
  now: Date = new Date()
): boolean {
  const targetDateStr = getVNDateString(checkInDate);
  const todayDateStr = getVNDateString(now);

  if (targetDateStr < todayDateStr) {
    return true;
  }
  if (targetDateStr > todayDateStr) {
    return false;
  }

  // Parse slot start time (e.g. "09:00 - 11:00" -> "09:00" or just "09:00")
  const rawStart = slotTimeStr.includes('-')
    ? slotTimeStr.split('-')[0].trim()
    : slotTimeStr.trim();

  // Validate HH:mm
  const match = /^([01]\d|2[0-3]):[0-5]\d$/.exec(rawStart);
  if (!match) {
    return false;
  }

  const slotStartTime = new Date(
    `${todayDateStr}T${rawStart}:00.000${VN_OFFSET}`
  );
  return slotStartTime.getTime() <= now.getTime();
}
