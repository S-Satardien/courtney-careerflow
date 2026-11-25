'use client';

import { JobCategory, JobListing, JobStatus, TailoredDocuments } from '@/types/job';
import { courtneyProfile } from '@/data/courtney-profile';
import { hydrateCoverLetterPlaceholders } from '@/lib/auth';
import { isJobExpired, parseClosingDate } from '@/lib/closing-date';
import {
  classifyWesternCapeRegion,
  extractWesternCapeSuburb,
} from '@/lib/southern-suburbs';
import {
  analyzeJobMatch,
  classifyJobCategory,
  generateTailoredDocuments,
} from '@/services/ai/tailor';

const STORAGE_KEY = 'careerflow_wc_user_state_v1';

interface UserJobOverride {
  status?: JobStatus;
  applicationNotes?: string;
  appliedAt?: string;
  tailoredDocuments?: TailoredDocuments;
}

interface StoredUserState {
  overrides: Record<string, UserJobOverride>;
  manualJobs: JobListing[];
}

export interface StaticJobsPayload {
  generatedAt: string;
  totalActive: number;
  jobs: JobListing[];
}

function readUserState(): StoredUserState {
  if (typeof window === 'undefined') return { overrides: {}, manualJobs: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { overrides: {}, manualJobs: [] };
    const parsed = JSON.parse(raw) as Partial<StoredUserState>;
    return {
      overrides: parsed.overrides || {},
      manualJobs: Array.isArray(parsed.manualJobs) ? parsed.manualJobs : [],
    };
  } catch {
    return { overrides: {}, manualJobs: [] };
  }
}

function writeUserState(state: StoredUserState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota exceeded — ignore gracefully
  }
}

/**
 * Fetches the daily-synced static jobs snapshot (`./data/jobs.json`), merges
 * Courtney's browser-persisted statuses, notes, cover letter edits & manual jobs,
 * and filters out any vacancy whose closing date has passed (preserving applied/interviewing history).
 */
export async function loadStaticJobsWithUserState(): Promise<{
  jobs: JobListing[];
  generatedAt: string | null;
}> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const url = `${basePath}/data/jobs.json?t=${Date.now()}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch static job feed (HTTP ${res.status})`);
  }

  const payload = (await res.json()) as StaticJobsPayload;
  const userState = readUserState();

  const mergedBase = (payload.jobs || []).map((job) => {
    const ov = userState.overrides[job.id];
    const baseDocs = ov?.tailoredDocuments ?? job.tailoredDocuments;
    const hydratedDocs = baseDocs
      ? {
          ...baseDocs,
          coverLetter: hydrateCoverLetterPlaceholders(baseDocs.coverLetter),
        }
      : undefined;

    if (!ov) {
      return hydratedDocs ? { ...job, tailoredDocuments: hydratedDocs } : job;
    }

    return {
      ...job,
      status: ov.status ?? job.status,
      applicationNotes: ov.applicationNotes ?? job.applicationNotes,
      appliedAt: ov.appliedAt ?? job.appliedAt,
      tailoredDocuments: hydratedDocs,
    };
  });

  const existingIds = new Set(mergedBase.map((j) => j.id));
  const combined = [
    ...userState.manualJobs.filter((m) => !existingIds.has(m.id)),
    ...mergedBase,
  ];

  // Auto-hide any vacancy past its closing date (always preserving Applied / Interviewing history)
  const active = combined.filter(
    (j) =>
      j.status === 'applied' ||
      j.status === 'interviewing' ||
      !isJobExpired(j.closingDate)
  );

  return {
    jobs: active,
    generatedAt: payload.generatedAt || null,
  };
}

/**
 * Persists status, application notes, and cover letter edits to localStorage.
 */
export function saveJobOverrideLocally(updatedJob: JobListing): void {
  const state = readUserState();

  const manualIdx = state.manualJobs.findIndex((m) => m.id === updatedJob.id);
  if (manualIdx !== -1) {
    state.manualJobs[manualIdx] = updatedJob;
  } else {
    state.overrides[updatedJob.id] = {
      status: updatedJob.status,
      applicationNotes: updatedJob.applicationNotes,
      appliedAt: updatedJob.appliedAt,
      tailoredDocuments: updatedJob.tailoredDocuments,
    };
  }

  writeUserState(state);
}

/**
 * Creates, scores, tailors, and saves a manually pasted vacancy 100% client-side.
 */
export function createManualJobLocally(input: {
  title: string;
  company: string;
  location: string;
  category?: JobCategory;
  sourceUrl?: string;
  closingDate?: string;
  description?: string;
}): { success: boolean; message: string; job?: JobListing } {
  const parsedClosing = parseClosingDate(input.closingDate);
  if (parsedClosing && isJobExpired(parsedClosing)) {
    return {
      success: false,
      message: `That vacancy's closing date (${parsedClosing}) has already passed.`,
    };
  }

  const location = input.location.trim() || 'Southern Suburbs, Cape Town';
  const description =
    input.description?.trim() || `${input.title.trim()} at ${input.company.trim()} (${location}).`;
  const category =
    input.category || classifyJobCategory(input.title, description, input.company);

  const matchAnalysis = analyzeJobMatch(input.title, description, [], category, location);

  const newJob: JobListing = {
    id: `manual-${Date.now().toString(36)}`,
    title: input.title.trim(),
    company: input.company.trim(),
    category,
    region: classifyWesternCapeRegion(location),
    suburb: extractWesternCapeSuburb(location),
    location,
    isRemote: /remote|online|hybrid|work from home/i.test(`${location} ${input.title}`),
    isWesternCape: true,
    contractType: 'Full-Time / Contract',
    closingDate: parsedClosing,
    sourceUrl: input.sourceUrl?.trim() || '#',
    source: 'Manual Entry',
    portalType: 'manual',
    description,
    requirements: [],
    postedAt: new Date().toISOString(),
    status: 'discovered',
    matchAnalysis,
  };

  newJob.tailoredDocuments = generateTailoredDocuments(newJob);

  const state = readUserState();
  state.manualJobs = [newJob, ...state.manualJobs];
  writeUserState(state);

  return {
    success: true,
    message: `Added "${newJob.title}" (${newJob.matchAnalysis.score}% CV match) with tailored cover letter & DOCX CV ready.`,
    job: newJob,
  };
}

/**
 * Builds a formatted HTML email preview Blob URL and mailto: draft 100% client-side.
 */
export function buildClientEmailDraft(
  job: JobListing,
  coverLetterMarkdown: string
): { previewBlobUrl: string; mailtoLink: string; message: string } {
  const lines = coverLetterMarkdown.split('\n');
  const htmlBlocks: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '**COURTNEY JAMES**') continue;

    let parsedLine = trimmed.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong style="color: #2D3748; font-weight: 700;">$1</strong>'
    );
    parsedLine = parsedLine.replace(/\*([^*]+)\*/g, '<em style="color: #475569;">$1</em>');

    if (/^[•\-*]\s+/.test(trimmed)) {
      htmlBlocks.push(
        `<li style="margin-bottom:8px;line-height:1.65;color:#1E293B;font-size:15px;">${parsedLine.replace(
          /^[•\-*]\s+/,
          ''
        )}</li>`
      );
    } else {
      htmlBlocks.push(
        `<p style="margin-bottom:14px;line-height:1.7;color:#1E293B;font-size:15px;">${parsedLine}</p>`
      );
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Application - ${courtneyProfile.name}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;padding:24px 12px;margin:0;">
  <div style="max-width:680px;margin:0 auto;background:#FFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#2D3748 0%,#7C4D56 100%);padding:28px 32px;color:#FFF;">
      <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:0.08em;">COURTNEY JAMES</h1>
      <p style="margin:6px 0 0 0;font-size:13px;color:#F5ECEC;">UCT PGCE &amp; BA (English Language, Literature &amp; Linguistics) • SACE Registered</p>
      <div style="margin-top:10px;font-size:12px;color:#E2E8F0;">${courtneyProfile.location} • ${courtneyProfile.phone} • ${courtneyProfile.email}</div>
    </div>
    <div style="padding:32px;">${htmlBlocks.join('\n')}</div>
    <div style="margin:0 32px 28px 32px;padding:16px;background:#FDF2F4;border:1px solid #F3D1D8;border-radius:10px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#7C2D3E;">Ready to attach: Courtney_James_CV_${job.company.replace(/[^a-zA-Z0-9]+/g, '_')}.docx</p>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const previewBlobUrl = URL.createObjectURL(blob);
  const subject = `Application: ${job.title} - ${courtneyProfile.name}`;
  const mailtoLink = `mailto:${encodeURIComponent(courtneyProfile.email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(coverLetterMarkdown.replace(/\*\*/g, ''))}`;

  return {
    previewBlobUrl,
    mailtoLink,
    message: `Formatted email preview & mailto draft ready for ${courtneyProfile.email}.`,
  };
}
