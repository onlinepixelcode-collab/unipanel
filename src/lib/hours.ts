import { SHOWROOMS, type Showroom, type CityId } from "./site";

const TZ = "Africa/Johannesburg";

/** Current wall-clock time in SAST, independent of the visitor's timezone. */
export function nowInSAST(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: dayMap[get("weekday")] ?? 0,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function easterSunday(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}

const key = (d: Date) => d.toISOString().slice(0, 10);

/** South African public holidays (Public Holidays Act), incl. Sunday → Monday rule. */
export function saPublicHolidays(year: number): Set<string> {
  const fixed = ["01-01", "03-21", "04-27", "05-01", "06-16", "08-09", "09-24", "12-16", "12-25", "12-26"];
  const set = new Set<string>();
  for (const md of fixed) {
    const d = new Date(`${year}-${md}T00:00:00Z`);
    set.add(key(d));
    if (d.getUTCDay() === 0) set.add(key(new Date(d.getTime() + 86400000)));
  }
  const easter = easterSunday(year);
  set.add(key(new Date(easter.getTime() - 2 * 86400000))); // Good Friday
  set.add(key(new Date(easter.getTime() + 86400000))); // Family Day
  return set;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export interface OpenStatus {
  open: boolean;
  label: string;
  detail: string;
}

export function showroomStatus(s: Showroom, date = new Date()): OpenStatus {
  const now = nowInSAST(date);
  const ymd = `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;
  const holiday = saPublicHolidays(now.year).has(ymd);
  const today = holiday ? null : s.hours[now.weekday as 0];
  if (today) {
    const [o, c] = today.map(toMin);
    if (now.minutes >= o && now.minutes < c) {
      const left = c - now.minutes;
      return { open: true, label: "Open now", detail: left <= 60 ? `Closes at ${today[1]}` : `Until ${today[1]}` };
    }
    if (now.minutes < o) return { open: false, label: "Closed", detail: `Opens today at ${today[0]}` };
  }
  // find next opening
  for (let i = 1; i <= 7; i++) {
    const d = new Date(Date.UTC(now.year, now.month - 1, now.day + i));
    const wd = d.getUTCDay() as 0;
    const h = saPublicHolidays(d.getUTCFullYear()).has(key(d)) ? null : s.hours[wd];
    if (h) {
      const dayName = i === 1 ? "tomorrow" : d.toLocaleDateString("en-ZA", { weekday: "long", timeZone: "UTC" });
      return { open: false, label: holiday ? "Closed today (public holiday)" : "Closed", detail: `Opens ${dayName} at ${h[0]}` };
    }
  }
  return { open: false, label: "Closed", detail: "" };
}

export function allStatuses(date = new Date()): Record<CityId, OpenStatus> {
  return Object.fromEntries(SHOWROOMS.map((s) => [s.id, showroomStatus(s, date)])) as Record<CityId, OpenStatus>;
}
