'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  GraduationCap,
  HeartHandshake,
  BriefcaseBusiness,
  Calendar,
  Wifi,
  Timer,
} from 'lucide-react';
import { JobCategory, JobListing } from '@/types/job';
import { getDeadlineInfo } from '@/lib/closing-date';

interface JobCardProps {
  job: JobListing;
  onReview: (job: JobListing) => void;
}

const TRACK_STYLES: Record<
  JobCategory,
  {
    label: string;
    pill: string;
    icon: React.ComponentType<{ className?: string }>;
    accentHover: string;
  }
> = {
  teaching: {
    label: 'High School Teaching',
    pill: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/35',
    icon: GraduationCap,
    accentHover: 'hover:border-emerald-500/40',
  },
  npo: {
    label: 'NPO / NGO & Youth',
    pill: 'bg-rose-950/80 text-rose-300 border-rose-500/35',
    icon: HeartHandshake,
    accentHover: 'hover:border-rose-500/40',
  },
  admin: {
    label: 'Admin, L&D & PM',
    pill: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/35',
    icon: BriefcaseBusiness,
    accentHover: 'hover:border-indigo-500/40',
  },
};

/**
 * Glassmorphic Western Cape Vacancy Card tailored for Courtney James.
 * Displays career track badge, Western Cape sub-region, semantic match fit,
 * start/contract details, verified CV matches, and application review trigger.
 */
export function JobCard({ job, onReview }: JobCardProps) {
  const { score } = job.matchAnalysis;
  const track = TRACK_STYLES[job.category];
  const TrackIcon = track.icon;

  let badgeGradient = 'from-indigo-500/20 to-purple-500/20 text-indigo-200 border-indigo-400/30';
  let scoreColor = 'text-indigo-400';
  if (score >= 90) {
    badgeGradient =
      'from-emerald-500/20 to-teal-500/20 text-emerald-200 border-emerald-500/40 shadow-glow';
    scoreColor = 'text-emerald-400';
  } else if (score >= 80) {
    badgeGradient = 'from-cyan-500/20 to-emerald-500/20 text-cyan-200 border-cyan-500/40';
    scoreColor = 'text-cyan-400';
  }

  const isApplied = job.status === 'applied';
  const isInterviewing = job.status === 'interviewing';
  const isReviewing = job.status === 'reviewing';
  const deadline = getDeadlineInfo(job.closingDate);

  const deadlineBadgeClass =
    deadline.urgency === 'today'
      ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 font-bold'
      : deadline.urgency === 'urgent' || deadline.urgency === 'soon'
      ? 'bg-amber-950/85 border-amber-500/40 text-amber-200 font-semibold'
      : deadline.urgency === 'normal'
      ? 'bg-emerald-950/60 border-emerald-500/25 text-emerald-300'
      : 'bg-slate-800/80 border-slate-700 text-slate-300';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`group relative rounded-2xl backdrop-blur-xl bg-slate-900/65 border border-white/10 p-6 ${track.accentHover} transition-all duration-300 shadow-card flex flex-col justify-between`}
    >
      <div>
        {/* Top Meta Bar */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-semibold ${track.pill}`}
            >
              <TrackIcon className="w-3 h-3" />
              <span>{track.label}</span>
            </span>

            <span className="px-2 py-0.5 rounded-md bg-slate-800/90 text-[10px] font-mono text-slate-300 border border-slate-700">
              {job.suburb && job.suburb !== job.region ? `${job.suburb} • ${job.region}` : job.region}
            </span>

            {job.isRemote && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-cyan-950/70 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                <Wifi className="w-2.5 h-2.5" />
                <span>Hybrid/Online</span>
              </span>
            )}

            {isApplied && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Applied</span>
              </span>
            )}
            {isInterviewing && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500/40 text-[10px] font-semibold text-amber-300">
                <span>Interviewing</span>
              </span>
            )}
            {isReviewing && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-sky-950/90 border border-sky-500/40 text-[10px] font-semibold text-sky-300">
                <span>Shortlisted</span>
              </span>
            )}
          </div>

          {/* Match Score Badge */}
          <div
            className={`shrink-0 flex flex-col items-end px-2.5 py-1.5 rounded-xl border bg-gradient-to-br ${badgeGradient} backdrop-blur-md`}
          >
            <div className="flex items-center space-x-1">
              <Sparkles className={`w-3.5 h-3.5 ${scoreColor}`} />
              <span className="text-base font-extrabold tracking-tight text-white">{score}%</span>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-mono font-medium opacity-80">
              CV Fit
            </span>
          </div>
        </div>

        {/* Employer Name */}
        <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 mb-1">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{job.company}</span>
          <span className="text-slate-600">•</span>
          <span className="text-[11px] font-mono text-slate-400 truncate">{job.source}</span>
        </div>

        {/* Job Title */}
        <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
          {job.title}
        </h3>

        {/* Location, Closing Deadline & Start Date */}
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 mt-2.5 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[200px]">{job.location}</span>
          </div>

          <span
            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${deadlineBadgeClass}`}
          >
            <Timer className="w-3 h-3 shrink-0" />
            <span>{deadline.label}</span>
          </span>

          {job.startDate && (
            <div className="flex items-center space-x-1 text-slate-300 font-mono">
              <Calendar className="w-3 h-3 shrink-0 text-slate-400" />
              <span>Start: {job.startDate}</span>
            </div>
          )}

          {job.salaryRange && (
            <div className="text-emerald-300 font-mono">{job.salaryRange}</div>
          )}

          <div className="flex items-center space-x-1 text-slate-500">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{new Date(job.postedAt).toLocaleDateString('en-ZA')}</span>
          </div>
        </div>

        {/* Description Snippet */}
        <p className="text-xs text-slate-400 mt-3 line-clamp-3 leading-relaxed">
          {job.description}
        </p>

        {/* Matched CV Competencies */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.matchAnalysis.matchedKeywords.slice(0, 5).map((kw) => (
            <span
              key={kw}
              className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-200 font-mono"
            >
              ✓ {kw}
            </span>
          ))}
          {job.matchAnalysis.matchedKeywords.length > 5 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 font-mono">
              +{job.matchAnalysis.matchedKeywords.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-2.5">
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 px-2.5 py-2 rounded-xl text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          title="Open original Western Cape portal listing"
        >
          <span>Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button
          type="button"
          onClick={() => onReview(job)}
          className={`flex-1 flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${
            isApplied
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-glow'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isApplied ? 'View Application Pack' : 'Review & Tailor Pack'}</span>
        </button>
      </div>
    </motion.div>
  );
}
