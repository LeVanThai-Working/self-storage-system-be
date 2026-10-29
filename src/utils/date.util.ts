const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VN_OFFSET = '+07:00';

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const vnTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: VN_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
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

/**
 * Checks whether two dates fall on the same calendar day in Vietnam Time (UTC+7).
 */
export function isSameDayVN(
  d1: Date | string,
  d2: Date | string = new Date()
): boolean {
  return getVNDateString(d1) === getVNDateString(d2);
}

/**
 * Validates whether a check-in time slot satisfies the minimum preparation lead time in minutes.
 * If check-in is on a future day in VN -> returns true.
 * If check-in is on the same day in VN:
 *   parses slot start time (e.g. "09:00 - 11:00" -> "09:00"),
 *   constructs slotStartTime in VN time,
 *   and checks if slotStartTime.getTime() >= now.getTime() + leadMinutes * 60 * 1000.
 */
export function validateSlotLeadTimeVN(
  checkInDate: Date | string,
  slotTimeStr: string,
  leadMinutes: number,
  now: Date = new Date()
): boolean {
  const targetDateStr = getVNDateString(checkInDate);
  const todayDateStr = getVNDateString(now);

  if (targetDateStr !== todayDateStr) {
    return true;
  }

  const rawStart = slotTimeStr.includes('-')
    ? slotTimeStr.split('-')[0].trim()
    : slotTimeStr.trim();

  const match = /^([01]\d|2[0-3]):[0-5]\d$/.exec(rawStart);
  if (!match) {
    return true;
  }

  const slotStartTime = new Date(
    `${todayDateStr}T${rawStart}:00.000${VN_OFFSET}`
  );
  return slotStartTime.getTime() >= now.getTime() + leadMinutes * 60 * 1000;
}

/**
 * Returns the HH:mm string representation of a time in Vietnam Time (UTC+7).
 */
export function getVNTimeString(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return vnTimeFormatter.format(d);
}

/**
 * Checks whether the actual check-in date is earlier than the scheduled check-in calendar day in Vietnam Time.
 */
export function isEarlyCheckInVN(
  scheduledCheckInDate: Date | string,
  actualDate: Date = new Date()
): boolean {
  return (
    startOfDayVN(actualDate).getTime() <
    startOfDayVN(scheduledCheckInDate).getTime()
  );
}

/**
 * Checks whether a given timestamp matches a reservation's checkInTimeSlot (e.g. "09:00 - 11:00")
 * on the scheduled check-in date in Vietnam Time.
 * Returns { isWithinSlot, isEarly, isLate, slotStart, slotEnd }.
 */
export function checkTimeSlotMatchVN(
  checkInDate: Date | string,
  slotTimeStr?: string | null,
  time: Date = new Date()
): {
  isWithinSlot: boolean;
  isEarly: boolean;
  isLate: boolean;
  slotStart?: Date;
  slotEnd?: Date;
} {
  const targetDateStr = getVNDateString(checkInDate);
  const checkTimeDateStr = getVNDateString(time);

  if (checkTimeDateStr < targetDateStr) {
    return { isWithinSlot: false, isEarly: true, isLate: false };
  }
  if (checkTimeDateStr > targetDateStr) {
    return { isWithinSlot: false, isEarly: false, isLate: true };
  }

  if (!slotTimeStr || typeof slotTimeStr !== 'string') {
    return { isWithinSlot: true, isEarly: false, isLate: false };
  }

  const parts = slotTimeStr.split('-').map((s) => s.trim());
  const rawStart = parts[0];
  const rawEnd = parts[1];

  const matchStart = /^([01]\d|2[0-3]):[0-5]\d$/.exec(rawStart);
  if (!matchStart) {
    return { isWithinSlot: true, isEarly: false, isLate: false };
  }

  const slotStart = new Date(`${targetDateStr}T${rawStart}:00.000${VN_OFFSET}`);
  let slotEnd: Date | undefined;

  if (rawEnd && /^([01]\d|2[0-3]):[0-5]\d$/.test(rawEnd)) {
    slotEnd = new Date(`${targetDateStr}T${rawEnd}:00.000${VN_OFFSET}`);
  }

  const timeMs = time.getTime();
  if (timeMs < slotStart.getTime()) {
    return {
      isWithinSlot: false,
      isEarly: true,
      isLate: false,
      slotStart,
      slotEnd,
    };
  }
  if (slotEnd && timeMs > slotEnd.getTime()) {
    return {
      isWithinSlot: false,
      isEarly: false,
      isLate: true,
      slotStart,
      slotEnd,
    };
  }

  return {
    isWithinSlot: true,
    isEarly: false,
    isLate: false,
    slotStart,
    slotEnd,
  };
}

/**
 * Checks whether a given timestamp falls within a facility's operating hours (e.g. { open: "08:00", close: "20:00" })
 * in Vietnam Time (UTC+7).
 * If operatingHours is not defined or invalid, defaults to within hours (true).
 */
export function checkOperatingHoursMatchVN(
  operatingHours?: { open: string; close: string } | null,
  time: Date = new Date()
): { isWithinOperatingHours: boolean; open?: string; close?: string } {
  if (
    !operatingHours ||
    typeof operatingHours.open !== 'string' ||
    typeof operatingHours.close !== 'string'
  ) {
    return { isWithinOperatingHours: true };
  }

  const open = operatingHours.open.trim();
  const close = operatingHours.close.trim();

  // Validate HH:mm
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(open) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(close)
  ) {
    return { isWithinOperatingHours: true };
  }

  const timeStr = getVNTimeString(time);

  const isWithin =
    open <= close
      ? timeStr >= open && timeStr <= close
      : timeStr >= open || timeStr <= close;

  return {
    isWithinOperatingHours: isWithin,
    open,
    close,
  };
}

/**
 * Calculates a person's exact age in completed years based on Vietnam Time (UTC+7).
 */
export function calculateAgeVN(dob: Date, now: Date = new Date()): number {
  const vnDobStr = getVNDateString(dob);
  const vnNowStr = getVNDateString(now);

  const [dobYear, dobMonth, dobDay] = vnDobStr.split('-').map(Number);
  const [nowYear, nowMonth, nowDay] = vnNowStr.split('-').map(Number);

  let age = nowYear - dobYear;
  if (nowMonth < dobMonth || (nowMonth === dobMonth && nowDay < dobDay)) {
    age--;
  }

  return Math.max(0, age);
}
