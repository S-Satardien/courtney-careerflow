/**
 * Core Domain Models for CareerFlow WC (Courtney James).
 * Defines data contracts for Western Cape teaching, NPO, and admin/L&D vacancies,
 * semantic CV matching, and tailored application packages.
 */

export type JobStatus = 'discovered' | 'reviewing' | 'applied' | 'interviewing' | 'rejected' | 'archived';

export type JobCategory = 'teaching' | 'npo' | 'admin';

export type WesternCapeRegion =
  | 'Bergvliet, Tokai & Constantia'
  | 'Wynberg, Plumstead & Ottery'
  | 'Claremont, Newlands & Kenilworth'
  | 'Rondebosch, Observatory & Pinelands'
  | 'Remote / Hybrid (Cape Town)';

export type PortalSourceType =
  | 'isasa'
  | 'wced'
  | 'old_school_ties'
  | 'school_direct'
  | 'action_appointments'
  | 'adzuna'
  | 'jobmail'
  | 'pnet'
  | 'hejobs'
  | 'university'
  | 'greenhouse'
  | 'direct_portal'
  | 'manual';

export type CoverLetterTone = 'educator' | 'npo' | 'corporate';

export interface MatchAnalysis {
  score: number; // 0 - 100
  breakdown: {
    qualificationsMatch: number; // UCT PGCE, BA English & Linguistics, SACE, TEFL, Coaching
    experienceMatch: number; // Teaching English/LO, SHAWCO/ASF NPO, PSG L&D/EA, Novque PM
    sectorFit: number; // Western Cape school, NPO/inclusive ed, L&D/Admin alignment
  };
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendation: string;
}

export interface TailoredDocuments {
  coverLetter: string;
  tailoredCvSummary: string;
  highlightedBullets: string[];
  tone: CoverLetterTone;
  lastGeneratedAt: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  companyUrl?: string;
  category: JobCategory;
  region: WesternCapeRegion;
  suburb?: string;
  location: string;
  isRemote: boolean;
  isWesternCape: boolean;
  contractType?: string; // e.g., 'Permanent / Full-Time', 'Fixed-Term (2027)', 'Hybrid / Contract'
  salaryRange?: string;
  startDate?: string;
  closingDate?: string;
  referenceCode?: string;
  sourceUrl: string;
  source: string;
  portalType: PortalSourceType;
  description: string;
  requirements: string[];
  postedAt: string;
  status: JobStatus;
  matchAnalysis: MatchAnalysis;
  tailoredDocuments?: TailoredDocuments;
  applicationNotes?: string;
  appliedAt?: string;
}

export interface CandidateExperience {
  role: string;
  organization: string;
  location: string;
  period: string;
  track: JobCategory;
  highlights: string[];
}

export interface CandidateEducation {
  degree: string;
  institution: string;
  year: string;
  focus: string;
}

export interface CandidateReference {
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
}

export interface CandidateProfile {
  name: string;
  initials: string;
  headline: string;
  subheadline: string;
  location: string;
  phone: string;
  email: string;
  saceRegistered: boolean;
  clearCriminalRecord: boolean;
  executiveSummary: string;
  trackSummaries: Record<JobCategory, string>;
  coreCompetencies: Record<string, string[]>;
  experiences: CandidateExperience[];
  communityEngagement: CandidateExperience[];
  education: CandidateEducation[];
  continuousDevelopment: Array<{
    title: string;
    provider: string;
    year: string;
  }>;
  strengths: string[];
  references: CandidateReference[];
}

export interface WesternCapePortalLink {
  id: string;
  name: string;
  category: JobCategory;
  url: string;
  description: string;
  badge: string;
  canCrawl: boolean;
}
