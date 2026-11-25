import fs from 'fs';
import path from 'path';
import { JobCategory, JobListing } from '@/types/job';
import { createLogger } from '@/lib/logger';
import {
  fetchIsasaSouthernSuburbsJobs,
  fetchOldSchoolTiesSouthernSuburbsJobs,
  fetchSouthernSuburbsDirectSchoolJobs,
  fetchActionAppointmentsJobs,
  fetchDirectEducationNpoJobs,
  fetchAdzunaSouthernSuburbsJobs,
  fetchJobMailSouthernSuburbsJobs,
  fetchPnetSouthernSuburbsJobs,
  fetchHeJobsRondeboschJobs,
  fetch2uEdTechJobs,
  getVerifiedWesternCapeVacancies,
} from './western-cape-boards';
import {
  classifyWesternCapeRegion,
  extractWesternCapeSuburb,
  isSouthernSuburbsOrRemote,
} from './portal-crawler';
import {
  analyzeJobMatch,
  classifyJobCategory,
  generateTailoredDocuments,
  isStrictEnglishOrLoTeaching,
} from '../ai/tailor';
import { isJobExpired, parseClosingDate } from '@/lib/closing-date';

const logger = createLogger('SouthernSuburbsAggregator');
const CACHE_FILE = path.join(process.cwd(), 'src', 'data', 'jobs-cache.json');

/**
 * Reads cached Southern Suburbs job listings from local JSON persistence.
 */
export function getCachedJobs(): JobListing[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed as JobListing[];
      }
    }
  } catch (error) {
    logger.error('Failed to read jobs cache', error);
  }
  return [];
}

/**
 * Persists job listings to the local JSON cache file.
 *
 * @param jobs - Array of enriched JobListing objects
 */
export function saveJobsToCache(jobs: JobListing[]): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
    logger.info(`Persisted ${jobs.length} Southern Suburbs jobs to local cache`);
  } catch (error) {
    logger.error('Failed to write jobs cache', error);
  }
}

/**
 * Enriches a raw partial vacancy with track classification, Southern Suburbs area & suburb,
 * semantic CV match score, and auto-generated tailored documents for >=70% matches.
 *
 * @param raw - Partial job listing from a live scraper, verified feed, or manual entry
 */
export function enrichJobListing(raw: Partial<JobListing>): JobListing {
  const title = raw.title?.trim() || 'Southern Suburbs Role';
  const company = raw.company?.trim() || 'Southern Suburbs Organisation';
  const description = raw.description?.trim() || '';
  const requirements = raw.requirements || [];
  const location = raw.location?.trim() || 'Southern Suburbs, Cape Town';

  const category: JobCategory =
    raw.category || classifyJobCategory(title, description, company);
  const region = raw.region || classifyWesternCapeRegion(location);
  const suburb = raw.suburb || extractWesternCapeSuburb(location);
  const matchAnalysis = analyzeJobMatch(title, description, requirements, category, location);

  const job: JobListing = {
    id: raw.id || `ss-${Math.random().toString(36).substring(2, 10)}`,
    title,
    company,
    companyUrl: raw.companyUrl,
    category,
    region,
    suburb,
    location,
    isRemote: raw.isRemote ?? /remote|online|hybrid|work from home/i.test(`${location} ${title}`),
    isWesternCape: raw.isWesternCape ?? true,
    contractType: raw.contractType,
    salaryRange: raw.salaryRange,
    startDate: raw.startDate,
    closingDate: parseClosingDate(raw.closingDate) || raw.closingDate,
    referenceCode: raw.referenceCode,
    sourceUrl: raw.sourceUrl || '#',
    source: raw.source || 'Southern Suburbs Portal',
    portalType: raw.portalType || 'direct_portal',
    description,
    requirements,
    postedAt: raw.postedAt || new Date().toISOString(),
    status: raw.status || 'discovered',
    matchAnalysis,
    applicationNotes: raw.applicationNotes,
    appliedAt: raw.appliedAt,
  };

  if (matchAnalysis.score >= 70) {
    job.tailoredDocuments = generateTailoredDocuments(job);
  }

  return job;
}

/**
 * Executes a full Southern Suburbs discovery run across 10+ live South African sites:
 * - Teaching (Strict English & LO ONLY): ISASA, Old School Ties, Direct Southern Suburbs High Schools (WBHS, BHS, Herschel, Springfield, AISCT), Adzuna SA
 * - NGO / NPO: Action Appointments, YearBeyond, OLICO Education
 * - Admin / L&D / HR / PM: Adzuna Southern Suburbs, JobMail Southern Suburbs, PNet Southern Suburbs, HEJobs Rondebosch/UCT, 2U/GetSmarter Greenhouse
 *
 * Enforces three hard gates on every vacancy:
 * 1. Not expired / past closing date
 * 2. Strictly Southern Suburbs or Remote/Hybrid Cape Town
 * 3. Teaching roles strictly English and/or Life Orientation ONLY
 *
 * @param includeLiveFetch - Set false for fast initial seed load
 */
export async function runWesternCapeDiscovery(
  includeLiveFetch: boolean = true
): Promise<JobListing[]> {
  logger.info(`Running Southern Suburbs discovery cycle (liveFetch=${includeLiveFetch})...`);

  const rawListings: Partial<JobListing>[] = [...getVerifiedWesternCapeVacancies()];

  if (includeLiveFetch) {
    const liveResults = await Promise.allSettled([
      fetchIsasaSouthernSuburbsJobs(),
      fetchOldSchoolTiesSouthernSuburbsJobs(),
      fetchSouthernSuburbsDirectSchoolJobs(),
      fetchActionAppointmentsJobs(),
      fetchDirectEducationNpoJobs(),
      fetchAdzunaSouthernSuburbsJobs(),
      fetchJobMailSouthernSuburbsJobs(),
      fetchPnetSouthernSuburbsJobs(),
      fetchHeJobsRondeboschJobs(),
      fetch2uEdTechJobs(),
    ]);

    for (const res of liveResults) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        rawListings.push(...res.value);
      }
    }
  }

  const seenUrls = new Set<string>();
  const seenKeys = new Set<string>();
  const uniqueJobs: JobListing[] = [];
  let expiredSkipped = 0;
  let subjectSkipped = 0;
  let areaSkipped = 0;

  for (const raw of rawListings) {
    // Gate 1: Closing date not passed
    if (isJobExpired(raw.closingDate)) {
      expiredSkipped++;
      continue;
    }

    const enriched = enrichJobListing(raw);

    // Gate 2: Strictly Southern Suburbs or Remote/Hybrid Cape Town
    if (!isSouthernSuburbsOrRemote(enriched.location, `${enriched.title} ${enriched.description}`)) {
      areaSkipped++;
      continue;
    }

    // Gate 3: Teaching jobs must strictly be English and/or Life Orientation ONLY
    if (enriched.category === 'teaching' && !isStrictEnglishOrLoTeaching(enriched.title)) {
      subjectSkipped++;
      continue;
    }

    const normUrl = (enriched.sourceUrl || '').replace(/\/+$/, '').toLowerCase();
    const key = `${enriched.company.toLowerCase().trim()}::${enriched.title.toLowerCase().trim()}`;

    if ((normUrl && normUrl !== '#' && seenUrls.has(normUrl)) || seenKeys.has(key)) {
      continue;
    }
    if (normUrl && normUrl !== '#') seenUrls.add(normUrl);
    seenKeys.add(key);

    uniqueJobs.push(enriched);
  }

  // Preserve any existing user statuses, edits, notes, and manually-added vacancies
  const existingCache = getCachedJobs();
  const existingMap = new Map(existingCache.map((j) => [j.id, j]));

  const mergedJobs = uniqueJobs.map((newJob) => {
    const prev = existingMap.get(newJob.id);
    if (prev) {
      return {
        ...newJob,
        status: prev.status,
        tailoredDocuments: prev.tailoredDocuments || newJob.tailoredDocuments,
        applicationNotes: prev.applicationNotes,
        appliedAt: prev.appliedAt,
      };
    }
    return newJob;
  });

  // Retain user-added manual/custom jobs or applied/interviewing history
  const mergedIds = new Set(mergedJobs.map((j) => j.id));
  for (const existing of existingCache) {
    const keepForHistory = existing.status === 'applied' || existing.status === 'interviewing';
    if (
      !mergedIds.has(existing.id) &&
      (keepForHistory ||
        (!isJobExpired(existing.closingDate) &&
          (existing.portalType === 'manual' || existing.source.startsWith('Live Crawl:'))))
    ) {
      mergedJobs.push(existing);
    }
  }

  mergedJobs.sort((a, b) => b.matchAnalysis.score - a.matchAnalysis.score);

  saveJobsToCache(mergedJobs);
  logger.info(
    `Southern Suburbs discovery complete: ${mergedJobs.length} open roles saved (filtered: expired=${expiredSkipped}, non-SS=${areaSkipped}, non-Eng/LO=${subjectSkipped}).`
  );
  return mergedJobs;
}
