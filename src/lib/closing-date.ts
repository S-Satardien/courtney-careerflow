/**
 * South African Closing Date Parser & Deadline Expiry Engine.
 * Parses English and Afrikaans date formats from ISASA, Old School Ties,
 * Action Appointments, PNet, UCT, and Schema.org JobPosting metadata,
 * and filters out vacancies whose closing date has passed (Africa/Johannesburg).
 */

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  januarie: 1,
  feb: 2,
  february: 2,
  februarie: 2,
  mar: 3,
  march: 3,
  maart: 3,
  apr: 4,
  april: 4,
  may: 5,
  mei: 5,
  jun: 6,
  june: 6,
  junie: 6,
  jul: 7,
  july: 7,
  julie: 7,
  aug: 8,
  august: 8,
  augustus: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  okt: 10,
  oktober: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
  des: 12,
  desember: 12,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toYmd(year: number, month: number, day: number): string | undefined {
  if (year < 2020 || year > 2035 || month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Returns today's calendar date (YYYY-MM-DD) in South Africa Standard Time (UTC+2).
 */
export function getTodaySastYmd(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Parses a raw date string (ISO, DD Month YYYY, Month DD YYYY, DD/MM/YYYY, Afrikaans months)
 * into canonical YYYY-MM-DD format.
 *
 * @param raw - Raw date string extracted from a job advert or JSON-LD
 */
export function parseClosingDate(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrydag|saterdag|sondag)\b,?/gi, ' ')
    .replace(/(\d+)(st|nd|rd|th)\b/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. ISO YYYY-MM-DD (including timestamps like 2026-12-19T15:52:45Z)
  const isoMatch = cleaned.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return toYmd(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  // 2. DD Month YYYY (e.g. "25 November 2026", "1 DESEMBER 2026", "07 Dec 2026")
  const dmyWord = cleaned.match(/\b(\d{1,2})\s+([A-Za-z]+),?\s+(20\d{2})\b/);
  if (dmyWord) {
    const month = MONTH_MAP[dmyWord[2].toLowerCase()];
    if (month) {
      return toYmd(Number(dmyWord[3]), month, Number(dmyWord[1]));
    }
  }

  // 3. Month DD, YYYY (e.g. "November 30, 2026")
  const mdyWord = cleaned.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/);
  if (mdyWord) {
    const month = MONTH_MAP[mdyWord[1].toLowerCase()];
    if (month) {
      return toYmd(Number(mdyWord[3]), month, Number(mdyWord[2]));
    }
  }

  // 4. South African DD/MM/YYYY or DD-MM-YYYY
  const dmySlash = cleaned.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);
  if (dmySlash) {
    return toYmd(Number(dmySlash[3]), Number(dmySlash[2]), Number(dmySlash[1]));
  }

  return undefined;
}

export interface ExtractedDeadline {
  closingDate?: string;
  isExplicitlyClosed: boolean;
}

/**
 * Extracts a closing date and closed/interviewing status from a raw job page HTML string.
 * Supports JSON-LD validThrough, ISASA, Old School Ties (English & Afrikaans Sluitingsdatum),
 * Action Appointments (Closed/Interviewing markers), and PNet.
 *
 * @param html - Raw HTML of the job listing page
 */
export function extractClosingDateFromHtml(html: string): ExtractedDeadline {
  // 1. Check JSON-LD validThrough
  const validThroughMatch = html.match(/"validThrough"\s*:\s*"([^"]+)"/i);
  const jsonLdDate = validThroughMatch ? parseClosingDate(validThroughMatch[1]) : undefined;

  // Strip scripts & styles to scan visible text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  // 2. Detect explicit closed / interviewing status immediately after Closing Date
  const closedMarkerRegex =
    /(?:closing\s*date|sluitingsdatum|application\s*deadline)[\s:\-–—]*[^.]{0,55}\b(closed|interviewing|shortlisting|position\s*filled|expired)\b|\b(applications?\s*(?:are\s*)?now\s*closed|this\s*vacancy\s*(?:is|has)\s*(?:now\s*)?(?:closed|expired))\b/i;
  const isExplicitlyClosed = closedMarkerRegex.test(text);

  // 3. Extract candidate closing dates near deadline labels (English & Afrikaans)
  const labelRegex =
    /(?:closing\s*date(?:\s*for\s*applications)?|sluitingsdatum|application\s*deadline|deadline|closes?(?:\s*on)?|apply\s*(?:by|before)|submit[\s\w]{0,25}\bby)\s*(?:is|:|-|–|—)?\s*([^.!?\n]{4,60})/gi;

  const wordDates: string[] = [];
  const numericDates: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = labelRegex.exec(text)) !== null) {
    const snippet = m[1];
    const parsed = parseClosingDate(snippet);
    if (parsed) {
      if (/[A-Za-z]{3,}/.test(snippet.replace(/\b(is|on|by|at|am|pm)\b/gi, ''))) {
        wordDates.push(parsed);
      } else {
        numericDates.push(parsed);
      }
    }
  }

  // Prefer written-month dates over numeric DD/MM/YYYY (avoids sidebar month/day entry typos),
  // then JSON-LD validThrough, then numeric dates.
  const closingDate =
    (wordDates.length > 0 ? wordDates.sort().pop() : undefined) ||
    jsonLdDate ||
    (numericDates.length > 0 ? numericDates.sort().pop() : undefined);

  return { closingDate, isExplicitlyClosed };
}

/**
 * Returns true if the closing date is strictly before today (SAST).
 * Vacancies closing today remain visible until end of day SAST.
 *
 * @param closingDate - Canonical YYYY-MM-DD or parseable date string
 * @param now - Optional reference date (defaults to current time)
 */
export function isJobExpired(closingDate?: string, now: Date = new Date()): boolean {
  const normalized = parseClosingDate(closingDate);
  if (!normalized) return false;
  const today = getTodaySastYmd(now);
  return normalized < today;
}

export interface DeadlineBadgeInfo {
  label: string;
  formattedDate?: string;
  daysLeft: number | null;
  urgency: 'expired' | 'today' | 'urgent' | 'soon' | 'normal' | 'rolling';
}

/**
 * Computes human-readable countdown label & urgency level for UI display.
 *
 * @param closingDate - Canonical YYYY-MM-DD or raw date string
 */
export function getDeadlineInfo(closingDate?: string): DeadlineBadgeInfo {
  const normalized = parseClosingDate(closingDate);
  if (!normalized) {
    return {
      label: 'Rolling / Open',
      daysLeft: null,
      urgency: 'rolling',
    };
  }

  const todayStr = getTodaySastYmd();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [cy, cm, cd] = normalized.split('-').map(Number);

  const todayUtc = Date.UTC(ty, tm - 1, td);
  const closeUtc = Date.UTC(cy, cm - 1, cd);
  const daysLeft = Math.round((closeUtc - todayUtc) / 86400000);

  const formattedDate = new Date(closeUtc).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  if (daysLeft < 0) {
    return { label: `Closed ${formattedDate}`, formattedDate, daysLeft, urgency: 'expired' };
  }
  if (daysLeft === 0) {
    return { label: 'Closes Today!', formattedDate, daysLeft: 0, urgency: 'today' };
  }
  if (daysLeft === 1) {
    return { label: 'Closes Tomorrow', formattedDate, daysLeft: 1, urgency: 'urgent' };
  }
  if (daysLeft <= 5) {
    return { label: `Closes in ${daysLeft}d (${formattedDate})`, formattedDate, daysLeft, urgency: 'soon' };
  }
  return { label: `Closes ${formattedDate}`, formattedDate, daysLeft, urgency: 'normal' };
}
