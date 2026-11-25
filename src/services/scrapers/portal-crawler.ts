import * as cheerio from 'cheerio';
import { createLogger } from '@/lib/logger';
import { JobListing } from '@/types/job';
import {
  extractClosingDateFromHtml,
  isJobExpired,
  parseClosingDate,
} from '@/lib/closing-date';
import {
  classifyWesternCapeRegion,
  extractWesternCapeSuburb,
  isSouthernSuburbsOrRemote,
  SOUTHERN_SUBURBS_REGEX,
  REMOTE_WFH_REGEX,
  NON_SOUTHERN_SUBURBS_REGEX,
} from '@/lib/southern-suburbs';

export {
  classifyWesternCapeRegion,
  extractWesternCapeSuburb,
  isSouthernSuburbsOrRemote,
  SOUTHERN_SUBURBS_REGEX,
  REMOTE_WFH_REGEX,
  NON_SOUTHERN_SUBURBS_REGEX,
};

const logger = createLogger('PortalCrawler');

interface SchemaJobPosting {
  '@type'?: string | string[];
  title?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string | string[];
  jobLocation?: {
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
  jobLocationType?: string;
  hiringOrganization?: {
    name?: string;
    sameAs?: string;
  };
}

/**
 * Normalizes a potentially relative href against a base URL.
 */
function makeAbsolute(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

/**
 * Fetches jobs from a Greenhouse public board API if the URL matches Greenhouse.
 */
async function fetchGreenhouseBoard(
  companyName: string,
  boardToken: string
): Promise<Partial<JobListing>[]> {
  try {
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'CareerFlowWC/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      jobs?: Array<{
        id: number;
        title: string;
        absolute_url: string;
        updated_at?: string;
        location?: { name?: string };
        content?: string;
      }>;
    };

    return (data.jobs || []).map((job) => {
      const cleanDesc = (job.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&amp;|&lt;|&gt;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const loc = job.location?.name || 'Cape Town, Western Cape';
      return {
        id: `gh-${boardToken}-${job.id}`,
        title: job.title,
        company: companyName,
        companyUrl: `https://boards.greenhouse.io/${boardToken}`,
        location: loc,
        region: classifyWesternCapeRegion(loc),
        isRemote: /remote|hybrid/i.test(loc),
        isWesternCape: /cape town|western cape|stellenbosch|south africa|remote/i.test(loc),
        sourceUrl: job.absolute_url,
        source: `${companyName} Careers`,
        portalType: 'greenhouse',
        description: cleanDesc.slice(0, 2400) || `Open vacancy at ${companyName}.`,
        requirements: [],
        postedAt: job.updated_at || new Date().toISOString(),
        status: 'discovered',
      };
    });
  } catch (error) {
    logger.warn(`Greenhouse fetch skipped for ${boardToken}`, error);
    return [];
  }
}

/**
 * Crawls any school, NPO, university, or company career page in the Western Cape
 * using Schema.org JobPosting LD+JSON, Greenhouse detection, and education/NPO/admin link heuristics.
 *
 * @param targetUrl - The portal or school/NPO career page URL
 * @param fallbackCompanyName - Organisation name fallback if undetectable from metadata
 */
export async function crawlPortalPage(
  targetUrl: string,
  fallbackCompanyName: string = 'Western Cape Organisation'
): Promise<Partial<JobListing>[]> {
  try {
    logger.info(`Starting targeted portal crawl for: ${targetUrl}`);

    // Direct Greenhouse board shortcut
    const ghMatch = targetUrl.match(/boards\.greenhouse\.io\/(?:embed\/job_board\?for=)?([^/?#]+)/i);
    if (ghMatch) {
      return fetchGreenhouseBoard(fallbackCompanyName, ghMatch[1]);
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn(`Portal ${targetUrl} returned HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const pageDeadline = extractClosingDateFromHtml(html);
    const discoveredJobs: Partial<JobListing>[] = [];

    // 1. Parse Schema.org JobPosting JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text());
        const items = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed['@graph'])
          ? parsed['@graph']
          : [parsed];

        for (const item of items) {
          const typeField = item?.['@type'];
          const isJob =
            typeField === 'JobPosting' ||
            (Array.isArray(typeField) && typeField.includes('JobPosting'));

          if (isJob) {
            const jp = item as SchemaJobPosting;
            const closingDate = parseClosingDate(jp.validThrough) || pageDeadline.closingDate;
            if (isJobExpired(closingDate)) {
              logger.info(`Skipped expired Schema.org job "${jp.title}" (closed ${closingDate})`);
              continue;
            }
            const company = jp.hiringOrganization?.name || fallbackCompanyName;
            const locParts = [
              jp.jobLocation?.address?.addressLocality,
              jp.jobLocation?.address?.addressRegion,
            ].filter(Boolean);
            const location = locParts.join(', ') || 'Cape Town, Western Cape';
            const cleanDesc = (jp.description || '')
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            discoveredJobs.push({
              id: `portal-${company.toLowerCase().replace(/\W+/g, '-')}-${Math.random()
                .toString(36)
                .substring(2, 8)}`,
              title: jp.title || 'Education / Coordination Role',
              company,
              companyUrl: jp.hiringOrganization?.sameAs || targetUrl,
              location,
              suburb: extractWesternCapeSuburb(location),
              region: classifyWesternCapeRegion(location),
              isRemote:
                jp.jobLocationType === 'TELECOMMUTE' || /remote|online|hybrid/i.test(location),
              isWesternCape: true,
              closingDate,
              contractType: Array.isArray(jp.employmentType)
                ? jp.employmentType.join(', ')
                : jp.employmentType,
              sourceUrl: targetUrl,
              source: fallbackCompanyName,
              portalType: 'direct_portal',
              description: cleanDesc.slice(0, 2400),
              requirements: [],
              postedAt: jp.datePosted || new Date().toISOString(),
              status: 'discovered',
            });
          }
        }
      } catch {
        // Ignore malformed JSON-LD blocks
      }
    });

    if (discoveredJobs.length > 0) {
      logger.info(`Extracted ${discoveredJobs.length} Schema.org vacancies from ${targetUrl}`);
      return discoveredJobs;
    }

    // 2. Heuristic extraction tailored to Teaching, NPO, L&D, and Admin roles
    const relevanceRegex =
      /(english|life orientation|teacher|educator|senior phase|fet|intermediate|coordinator|programme|program|administrator|admin|executive assistant|personal assistant|learning\s*(?:&|and)\s*development|l&d|training|hr|project manager|youth|volunteer|curriculum|facilitator|tutor|pastoral|npo|ngo|officer)/i;

    const seenUrls = new Set<string>();

    $('a').each((_, el) => {
      const $a = $(el);
      const text = $a.text().replace(/\s+/g, ' ').trim();
      const href = $a.attr('href');
      if (!href || text.length < 8 || text.length > 130) return;

      const absUrl = makeAbsolute(href, targetUrl);
      if (seenUrls.has(absUrl)) return;

      const looksLikeJobLink =
        /(vacanc|job|career|position|opportunit|post|recruit)/i.test(absUrl) ||
        relevanceRegex.test(text);

      if (looksLikeJobLink && relevanceRegex.test(text)) {
        // Skip generic navigation links
        if (/^(view all|search|browse|apply now|read more|jobs|vacancies|careers)$/i.test(text)) {
          return;
        }
        seenUrls.add(absUrl);

        // Attempt to read surrounding card text for location clues
        const parentText = $a.closest('article, li, div, tr').text().replace(/\s+/g, ' ').trim();
        const locationMatch = parentText.match(
          /(Cape Town|Western Cape|Bergvliet|Rondebosch|Claremont|Constantia|Bellville|Durbanville|Brackenfell|Century City|Foreshore|Paarl|Stellenbosch|Somerset West|Ottery|Sun Valley|Crossroads|Pinelands|District Six)/i
        );
        const location = locationMatch ? `${locationMatch[1]}, Western Cape` : 'Western Cape, South Africa';

        const cardDeadline = extractClosingDateFromHtml(parentText);
        if (cardDeadline.isExplicitlyClosed || isJobExpired(cardDeadline.closingDate)) {
          return;
        }

        discoveredJobs.push({
          id: `crawl-${Math.random().toString(36).substring(2, 10)}`,
          title: text,
          company: fallbackCompanyName,
          companyUrl: targetUrl,
          location,
          suburb: extractWesternCapeSuburb(location),
          region: classifyWesternCapeRegion(location),
          isRemote: /remote|online|hybrid|work from home/i.test(`${text} ${parentText}`),
          isWesternCape: true,
          closingDate: cardDeadline.closingDate,
          sourceUrl: absUrl,
          source: `Live Crawl: ${fallbackCompanyName}`,
          portalType: 'direct_portal',
          description:
            parentText.length > text.length + 20
              ? parentText.slice(0, 900)
              : `Discovered live on ${fallbackCompanyName}. Open the official posting link to view full application instructions and closing dates.`,
          requirements: [],
          postedAt: new Date().toISOString(),
          status: 'discovered',
        });
      }
    });

    logger.info(`Extracted ${discoveredJobs.length} relevant roles via heuristics from ${targetUrl}`);
    return discoveredJobs.slice(0, 25);
  } catch (error) {
    logger.error(`Error crawling ${targetUrl}`, error);
    return [];
  }
}
