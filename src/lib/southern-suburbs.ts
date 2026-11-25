import { WesternCapeRegion } from '@/types/job';

/**
 * Pure browser- & server-safe Southern Suburbs geographic helpers.
 */
export const SOUTHERN_SUBURBS_REGEX =
  /(southern suburbs|bergvliet|tokai|constantia|meadowridge|kirstenhof|diep river|retreat|steenberg|lakeside|wynberg|plumstead|ottery|southfield|wetton|kenwyn|lansdowne|claremont|newlands|kenilworth|bishopscourt|harfield|rondebosch|rosebank|mowbray|observatory|pinelands|thornton|\buct\b|university of cape town)/i;

export const REMOTE_WFH_REGEX = /(remote|work from home|\bwfh\b|hybrid)/i;

export const NON_SOUTHERN_SUBURBS_REGEX =
  /(paarl|stellenbosch|citrusdal|mcgregor|somerset west|strand|gordon'?s bay|bellville|durbanville|brackenfell|parow|goodwood|tygervalley|sonstraal|uitzicht|pinehurst|kuils river|kraaifontein|table view|blouberg|milnerton|century city|foreshore|atlantic seaboard|sea point|green point|waterfront|sun valley|fish hoek|noordhoek|simons town|langa|crossroads|khayelitsha|mitchells plain|johannesburg|\bjhb\b|pretoria|sandton|durban|gauteng|nigeria|kenya)/i;

/**
 * Checks whether a location string falls within Cape Town's Southern Suburbs
 * or is Remote/Hybrid accessible from Southern Suburbs.
 */
export function isSouthernSuburbsOrRemote(
  location: string = '',
  extraContext: string = ''
): boolean {
  const loc = location.toLowerCase();
  const full = `${location} ${extraContext}`.toLowerCase();

  // Reject if title/extraContext explicitly tags an out-of-province city like (JHB) or Johannesburg
  if (/\(\s*(?:jhb|johannesburg|pretoria|durban|sandton|gauteng)\s*\)/i.test(extraContext)) {
    return false;
  }

  if (SOUTHERN_SUBURBS_REGEX.test(loc)) return true;

  if (
    REMOTE_WFH_REGEX.test(loc) &&
    !/(johannesburg|gauteng|pretoria|durban|nigeria|kenya|usa|uk|europe)/i.test(loc)
  ) {
    return true;
  }

  if (NON_SOUTHERN_SUBURBS_REGEX.test(loc)) return false;

  if (SOUTHERN_SUBURBS_REGEX.test(full) && !NON_SOUTHERN_SUBURBS_REGEX.test(loc)) {
    return true;
  }

  return false;
}

/**
 * Extracts a clean Southern Suburbs suburb name from a location string.
 */
export function extractWesternCapeSuburb(location: string = ''): string {
  const knownSuburbs: Array<[RegExp, string]> = [
    [/bergvliet/i, 'Bergvliet'],
    [/tokai/i, 'Tokai'],
    [/constantia/i, 'Constantia'],
    [/meadowridge/i, 'Meadowridge'],
    [/kirstenhof/i, 'Kirstenhof'],
    [/diep river/i, 'Diep River'],
    [/retreat|steenberg|lakeside/i, 'Retreat / Lakeside'],
    [/wynberg/i, 'Wynberg'],
    [/plumstead/i, 'Plumstead'],
    [/ottery/i, 'Ottery'],
    [/southfield|wetton|lansdowne/i, 'Ottery / Southfield'],
    [/claremont/i, 'Claremont'],
    [/newlands/i, 'Newlands'],
    [/kenilworth/i, 'Kenilworth'],
    [/rondebosch|\buct\b|university of cape town/i, 'Rondebosch'],
    [/rosebank|mowbray/i, 'Mowbray / Rosebank'],
    [/observatory/i, 'Observatory'],
    [/pinelands/i, 'Pinelands'],
    [/remote|online|wfh|work from home|hybrid/i, 'Remote / Hybrid'],
    [/southern suburbs/i, 'Southern Suburbs'],
  ];

  for (const [pattern, label] of knownSuburbs) {
    if (pattern.test(location)) return label;
  }
  return 'Southern Suburbs';
}

/**
 * Classifies a location string into one of Courtney's 5 Southern Suburbs zones.
 */
export function classifyWesternCapeRegion(location: string = ''): WesternCapeRegion {
  const loc = location.toLowerCase();

  if (/(bergvliet|tokai|constantia|meadowridge|kirstenhof|diep river|retreat|steenberg|lakeside)/i.test(loc)) {
    return 'Bergvliet, Tokai & Constantia';
  }
  if (/(wynberg|plumstead|ottery|southfield|wetton|kenwyn|lansdowne)/i.test(loc)) {
    return 'Wynberg, Plumstead & Ottery';
  }
  if (/(claremont|newlands|kenilworth|bishopscourt|harfield)/i.test(loc)) {
    return 'Claremont, Newlands & Kenilworth';
  }
  if (/(rondebosch|rosebank|mowbray|observatory|pinelands|thornton|\buct\b|university of cape town)/i.test(loc)) {
    return 'Rondebosch, Observatory & Pinelands';
  }
  if (/(remote|online|work from home|virtual|wfh|hybrid)/i.test(loc)) {
    return 'Remote / Hybrid (Cape Town)';
  }

  return 'Claremont, Newlands & Kenilworth';
}
