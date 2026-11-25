'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Sparkles,
  Flame,
  CheckCircle2,
  RefreshCw,
  Globe,
  GraduationCap,
  HeartHandshake,
  BriefcaseBusiness,
  ShieldCheck,
  MapPin,
  Wifi,
} from 'lucide-react';
import { JobCategory, JobListing, WesternCapeRegion } from '@/types/job';
import { Navbar } from '@/components/Navbar';
import { StatsBar } from '@/components/StatsBar';
import { PortalDirectory } from '@/components/PortalDirectory';
import { JobCard } from '@/components/JobCard';
import { ReviewModal } from '@/components/ReviewModal';
import { PortalCrawlerModal } from '@/components/PortalCrawlerModal';
import { AuthGate } from '@/components/AuthGate';
import { courtneyProfile } from '@/data/courtney-profile';
import { loadStaticJobsWithUserState } from '@/lib/browser-store';

const WESTERN_CAPE_AREAS: Array<{ value: 'all' | WesternCapeRegion; label: string; suburbsHint: string }> = [
  { value: 'all', label: 'All Southern Suburbs', suburbsHint: 'All Southern Suburbs + Remote Cape Town' },
  { value: 'Bergvliet, Tokai & Constantia', label: 'Bergvliet, Tokai & Constantia', suburbsHint: 'Bergvliet, Tokai, Constantia, Meadowridge, Diep River' },
  { value: 'Wynberg, Plumstead & Ottery', label: 'Wynberg, Plumstead & Ottery', suburbsHint: 'Wynberg, Plumstead, Ottery, Southfield' },
  { value: 'Claremont, Newlands & Kenilworth', label: 'Claremont, Newlands & Kenilworth', suburbsHint: 'Claremont, Newlands, Kenilworth, Harfield' },
  { value: 'Rondebosch, Observatory & Pinelands', label: 'Rondebosch, Observatory & Pinelands', suburbsHint: 'Rondebosch (UCT), Mowbray, Observatory, Pinelands' },
  { value: 'Remote / Hybrid (Cape Town)', label: 'Remote / Hybrid', suburbsHint: 'Work from home (Cape Town / SA)' },
];

/**
 * Root entry point wrapped in the PBKDF2 + AES-256-GCM authentication gate.
 * The dashboard and job feed only mount after credentials unlock the session.
 */
export default function HomePage() {
  return <AuthGate>{({ onSignOut }) => <DashboardContent onSignOut={onSignOut} />}</AuthGate>;
}

/**
 * Authenticated Dashboard for CareerFlow WC (Courtney James).
 * Aggregates Southern Suburbs High School English/Life Orientation teaching jobs,
 * NPO/NGO education & youth coordination jobs, and Admin/L&D/Project Management roles.
 */
function DashboardContent({ onSignOut }: { onSignOut: () => void }) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | JobCategory>('all');
  const [regionFilter, setRegionFilter] = useState<'all' | WesternCapeRegion>('all');
  const [suburbFilter, setSuburbFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<number>(0);
  const [remoteOnly, setRemoteOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'score' | 'closing' | 'recent'>('score');

  // Modals
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [isCrawlerOpen, setIsCrawlerOpen] = useState(false);
  const [crawlerPreset, setCrawlerPreset] = useState<{ url: string; name: string }>({
    url: '',
    name: '',
  });

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const { jobs: loaded, generatedAt } = await loadStaticJobsWithUserState();
      setJobs(loaded);
      setLastSyncedAt(generatedAt);
    } catch {
      // Handled gracefully by empty state
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      const { jobs: loaded, generatedAt } = await loadStaticJobsWithUserState();
      setJobs(loaded);
      setLastSyncedAt(generatedAt);
      const syncedLabel = generatedAt
        ? new Date(generatedAt).toLocaleString('en-ZA', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'today';
      setSyncMessage(
        `Refreshed ${loaded.length} open Southern Suburbs roles (last auto-scrub across 36 sites: ${syncedLabel}; expired deadlines hidden).`
      );
    } catch {
      setSyncMessage('Unable to refresh feed — showing current roles.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNewJobsDiscovered = (newJobs: JobListing[]) => {
    setJobs((prev) => {
      const existingIds = new Set(prev.map((j) => j.id));
      const uniqueNew = newJobs.filter((j) => !existingIds.has(j.id));
      return [...uniqueNew, ...prev];
    });
  };

  const handleJobUpdated = (updatedJob: JobListing) => {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
    setSelectedJob((curr) => (curr && curr.id === updatedJob.id ? updatedJob : curr));
  };

  const handleQuickPortalCrawl = (url: string, name: string) => {
    setCrawlerPreset({ url, name });
    setIsCrawlerOpen(true);
  };

  // Dynamic list of specific Western Cape suburbs available under current area filter
  const availableSuburbs = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (regionFilter !== 'all' && j.region !== regionFilter) continue;
      if (j.suburb) set.add(j.suburb);
    }
    return Array.from(set).sort();
  }, [jobs, regionFilter]);

  // Area counts (respecting active category filter so counts stay accurate)
  const areaCounts = useMemo(() => {
    const base =
      categoryFilter === 'all' ? jobs : jobs.filter((j) => j.category === categoryFilter);
    const counts: Record<string, number> = { all: base.length };
    for (const j of base) {
      counts[j.region] = (counts[j.region] || 0) + 1;
    }
    return counts;
  }, [jobs, categoryFilter]);

  const filteredJobs = useMemo(() => {
    const list = jobs.filter((job) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit =
          job.title.toLowerCase().includes(q) ||
          job.company.toLowerCase().includes(q) ||
          job.location.toLowerCase().includes(q) ||
          (job.suburb && job.suburb.toLowerCase().includes(q)) ||
          job.description.toLowerCase().includes(q) ||
          job.matchAnalysis.matchedKeywords.some((k) => k.toLowerCase().includes(q));
        if (!hit) return false;
      }

      if (categoryFilter !== 'all' && job.category !== categoryFilter) {
        return false;
      }

      if (regionFilter !== 'all' && job.region !== regionFilter) {
        return false;
      }

      if (suburbFilter !== 'all' && job.suburb !== suburbFilter) {
        return false;
      }

      if (statusFilter !== 'all' && job.status !== statusFilter) {
        return false;
      }

      if (scoreFilter > 0 && job.matchAnalysis.score < scoreFilter) {
        return false;
      }

      if (remoteOnly && !job.isRemote) {
        return false;
      }

      return true;
    });

    if (sortBy === 'closing') {
      return [...list].sort((a, b) => {
        const aTime = a.closingDate ? new Date(a.closingDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.closingDate ? new Date(b.closingDate).getTime() : Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) return aTime - bTime;
        return b.matchAnalysis.score - a.matchAnalysis.score;
      });
    }
    if (sortBy === 'recent') {
      return [...list].sort(
        (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      );
    }
    return [...list].sort((a, b) => b.matchAnalysis.score - a.matchAnalysis.score);
  }, [
    jobs,
    search,
    categoryFilter,
    regionFilter,
    suburbFilter,
    statusFilter,
    scoreFilter,
    remoteOnly,
    sortBy,
  ]);

  const appliedCount = jobs.filter((j) => j.status === 'applied').length;
  const teachingCount = jobs.filter((j) => j.category === 'teaching').length;
  const npoCount = jobs.filter((j) => j.category === 'npo').length;
  const adminCount = jobs.filter((j) => j.category === 'admin').length;

  const clearAllFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setRegionFilter('all');
    setSuburbFilter('all');
    setStatusFilter('all');
    setScoreFilter(0);
    setRemoteOnly(false);
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100">
      {/* Top Navigation */}
      <Navbar
        onOpenCrawler={() => {
          setCrawlerPreset({ url: '', name: '' });
          setIsCrawlerOpen(true);
        }}
        onSyncAll={handleSyncAll}
        onSignOut={onSignOut}
        isSyncing={isSyncing}
        jobCount={jobs.length}
        appliedCount={appliedCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* Candidate Profile Command Header */}
        <section className="relative rounded-3xl backdrop-blur-xl bg-slate-900/50 border border-white/10 p-6 sm:p-8 overflow-hidden shadow-card">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  Southern Suburbs Focus • 14 Schools • 13 Direct NPOs &amp; NGOs • Auto-Synced Daily
                  {lastSyncedAt
                    ? ` (${new Date(lastSyncedAt).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                      })})`
                    : ''}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {courtneyProfile.name}
              </h1>

              <p className="text-sm sm:text-base text-emerald-300/95 font-medium">
                {courtneyProfile.headline}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>UCT PGCE &amp; BA (English Literature &amp; Linguistics)</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Valid SACE • Clear Police Clearance • TEFL</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center space-x-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
                  <span>SHAWCO • African Scholars Fund • Neurodiversity &amp; Coaching</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center space-x-1.5">
                  <BriefcaseBusiness className="w-3.5 h-3.5 text-indigo-400" />
                  <span>PSG L&amp;D &amp; EA/HR • Novque Project Manager</span>
                </span>
              </div>
            </div>

            {/* Quick Action Stack */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCrawlerPreset({ url: '', name: '' });
                  setIsCrawlerOpen(true);
                }}
                className="flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-glow transition-all active:scale-95"
              >
                <Globe className="w-4 h-4" />
                <span>Scour Portal or Paste Job</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAll}
                disabled={isSyncing}
                className="flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Scouring WC Boards...' : 'Sync Live WC Boards'}</span>
              </button>
            </div>
          </div>

          {syncMessage && (
            <div className="relative z-10 mt-4 px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-200 inline-flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Subtle ambient accents */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Interactive KPI Stats Bar (Click any card to filter track) */}
        <StatsBar
          jobs={jobs}
          activeCategory={categoryFilter}
          onSelectCategory={(cat) => setCategoryFilter(cat)}
        />

        {/* Collapsible Western Cape Live Job Portal Hub */}
        <PortalDirectory onQuickCrawl={handleQuickPortalCrawl} />

        {/* Search & Multi-Facet Filter Bar */}
        <section className="space-y-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search school, NPO, suburb, English, Life Orientation, L&D..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-slate-900/85 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Specific Suburb & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-900/85 border border-white/10 rounded-xl px-3 py-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <select
                  value={suburbFilter}
                  onChange={(e) => setSuburbFilter(e.target.value)}
                  className="bg-transparent text-slate-200 focus:outline-none text-xs"
                  aria-label="Filter by specific suburb or town"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    All Suburbs / Towns ({availableSuburbs.length})
                  </option>
                  {availableSuburbs.map((sub) => (
                    <option key={sub} value={sub} className="bg-slate-900 text-slate-200">
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'score' | 'closing' | 'recent')}
                className="bg-slate-900/85 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                aria-label="Sort vacancies"
              >
                <option value="score">Sort: Highest CV Fit</option>
                <option value="closing">Sort: Closing Soonest</option>
                <option value="recent">Sort: Most Recent</option>
              </select>
            </div>
          </div>

          {/* Dedicated Western Cape Area Filter Bar */}
          <div className="rounded-2xl bg-slate-900/50 border border-white/10 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Filter by Southern Suburbs Area</span>
              </div>
              {(regionFilter !== 'all' || suburbFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setRegionFilter('all');
                    setSuburbFilter('all');
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Clear area filter
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {WESTERN_CAPE_AREAS.map((area) => {
                const count = areaCounts[area.value] || 0;
                const isSelected = regionFilter === area.value;
                return (
                  <button
                    key={area.value}
                    type="button"
                    title={area.suburbsHint}
                    onClick={() => {
                      const next = isSelected && area.value !== 'all' ? 'all' : area.value;
                      setRegionFilter(next);
                      setSuburbFilter('all');
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-glow border border-emerald-400/40'
                        : count === 0 && area.value !== 'all'
                        ? 'bg-white/[0.02] border border-white/5 text-slate-500 hover:text-slate-300'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200'
                    }`}
                  >
                    <span>{area.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                        isSelected ? 'bg-black/20 text-white' : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Career Track & Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={clearAllFilters}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                categoryFilter === 'all' &&
                statusFilter === 'all' &&
                scoreFilter === 0 &&
                !remoteOnly &&
                regionFilter === 'all' &&
                suburbFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-glow'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
            >
              All Southern Suburbs ({jobs.length})
            </button>

            <button
              type="button"
              onClick={() =>
                setCategoryFilter(categoryFilter === 'teaching' ? 'all' : 'teaching')
              }
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                categoryFilter === 'teaching'
                  ? 'bg-emerald-600 text-white shadow-glow'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>English &amp; LO Only ({teachingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === 'npo' ? 'all' : 'npo')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                categoryFilter === 'npo'
                  ? 'bg-rose-600 text-white shadow-roseGlow'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 text-rose-400" />
              <span>NPO / NGO &amp; Youth ({npoCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === 'admin' ? 'all' : 'admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                categoryFilter === 'admin'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
            >
              <BriefcaseBusiness className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin, L&amp;D &amp; PM ({adminCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setScoreFilter(scoreFilter === 85 ? 0 : 85)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                scoreFilter === 85
                  ? 'bg-amber-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Prime Fit (≥85%)</span>
            </button>

            <button
              type="button"
              onClick={() => setRemoteOnly(!remoteOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                remoteOnly
                  ? 'bg-cyan-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hybrid / Online</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'applied' ? 'all' : 'applied')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                statusFilter === 'applied'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Applied ({appliedCount})</span>
            </button>
          </div>
        </section>

        {/* Vacancies Grid */}
        <section>
          {isLoading ? (
            <div className="py-24 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">
                Loading Western Cape teaching, NPO, and admin vacancies...
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-16 text-center rounded-3xl backdrop-blur-xl bg-slate-900/40 border border-white/10 p-8 space-y-4">
              <Filter className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Vacancies Match Current Filters</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clear one of your active filters or click &ldquo;Scour Portal or Paste Job&rdquo; to import a new school, NPO, or Cape Town corporate advert.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-100"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} onReview={(j) => setSelectedJob(j)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>

      {/* Tailoring & Review Modal */}
      <ReviewModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onJobUpdated={handleJobUpdated}
      />

      {/* Portal Crawler & Manual Vacancy Modal */}
      <PortalCrawlerModal
        isOpen={isCrawlerOpen}
        initialUrl={crawlerPreset.url}
        initialName={crawlerPreset.name}
        onClose={() => setIsCrawlerOpen(false)}
        onJobsDiscovered={handleNewJobsDiscovered}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 font-mono">
        CareerFlow WC • Tailored for {courtneyProfile.name} • Western Cape High School Teaching, NPO &amp; Admin Suite
      </footer>
    </div>
  );
}
