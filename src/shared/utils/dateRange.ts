export type DateRangePreset =
  | "today"
  | "week"
  | "month"
  | "last3months"
  | "year"
  | "all"
  | "custom";

export type ResolvedDateRange = {
  start?: Date;
  end?: Date;
};

const startOfDayUTC = (d: Date): Date => {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
};

const endOfDayUTC = (d: Date): Date => {
  const copy = new Date(d);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
};

export const resolveDateRange = (
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
): ResolvedDateRange => {
  const now = new Date();

  switch (preset) {
    case "today":
      return { start: startOfDayUTC(now), end: endOfDayUTC(now) };

    case "week": {
      const day = now.getUTCDay();
      const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now);
      start.setUTCDate(diff);
      return { start: startOfDayUTC(start), end: endOfDayUTC(now) };
    }

    case "month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { start: startOfDayUTC(start), end: endOfDayUTC(now) };
    }

    case "last3months": {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate()),
      );
      return { start: startOfDayUTC(start), end: endOfDayUTC(now) };
    }

    case "year": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      return { start: startOfDayUTC(start), end: endOfDayUTC(now) };
    }

    case "custom":
      return {
        start: customStart ? startOfDayUTC(new Date(customStart)) : undefined,
        end: customEnd ? endOfDayUTC(new Date(customEnd)) : undefined,
      };

    default:
      return {}; // "all"
  }
};

export const getPreviousPeriod = (start?: Date, end?: Date): ResolvedDateRange => {
  if (!start || !end) return {};
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart, end: prevEnd };
};
