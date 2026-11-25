'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  CheckCircle2,
  Download,
  ExternalLink,
  Edit3,
  RefreshCw,
  Sliders,
  Mail,
  Eye,
  Save,
  FileText,
  BookmarkCheck,
  AlertTriangle,
} from 'lucide-react';
import { CoverLetterTone, JobListing, JobStatus } from '@/types/job';
import { courtneyProfile } from '@/data/courtney-profile';
import { getDeadlineInfo } from '@/lib/closing-date';
import { generateTailoredDocuments } from '@/services/ai/tailor';
import { downloadCoverLetterDocx, downloadTailoredCvDocx } from '@/lib/browser-docx';
import { buildClientEmailDraft, saveJobOverrideLocally } from '@/lib/browser-store';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ReviewModalProps {
  job: JobListing | null;
  onClose: () => void;
  onJobUpdated: (updatedJob: JobListing) => void;
}

interface EmailDraftResult {
  message: string;
  previewUrl?: string;
  mailtoLink?: string;
}

const STATUS_OPTIONS: Array<{ value: JobStatus; label: string }> = [
  { value: 'discovered', label: 'Discovered' },
  { value: 'reviewing', label: 'Shortlisted' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'archived', label: 'Archived' },
];

/**
 * Inner modal content separated so React hooks never run conditionally.
 */
function ReviewModalInner({
  job,
  onClose,
  onJobUpdated,
}: {
  job: JobListing;
  onClose: () => void;
  onJobUpdated: (updatedJob: JobListing) => void;
}) {
  const defaultTone: CoverLetterTone =
    job.tailoredDocuments?.tone ||
    (job.category === 'teaching' ? 'educator' : job.category === 'npo' ? 'npo' : 'corporate');

  const [activeTab, setActiveTab] = useState<'letter' | 'cv'>('letter');
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [coverLetter, setCoverLetter] = useState(job.tailoredDocuments?.coverLetter || '');
  const [cvSummary, setCvSummary] = useState(
    job.tailoredDocuments?.tailoredCvSummary || courtneyProfile.trackSummaries[job.category]
  );
  const [highlights, setHighlights] = useState<string[]>(
    job.tailoredDocuments?.highlightedBullets || []
  );
  const [selectedTone, setSelectedTone] = useState<CoverLetterTone>(defaultTone);
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [notes, setNotes] = useState(job.applicationNotes || '');

  const [isRetuning, setIsRetuning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<EmailDraftResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  useEffect(() => {
    setCoverLetter(job.tailoredDocuments?.coverLetter || '');
    setCvSummary(
      job.tailoredDocuments?.tailoredCvSummary || courtneyProfile.trackSummaries[job.category]
    );
    setHighlights(job.tailoredDocuments?.highlightedBullets || []);
    setStatus(job.status);
    setNotes(job.applicationNotes || '');
    setSelectedTone(
      job.tailoredDocuments?.tone ||
        (job.category === 'teaching' ? 'educator' : job.category === 'npo' ? 'npo' : 'corporate')
    );
    setEmailResult(null);
    setAppliedBanner(null);
    setSaveBanner(null);
  }, [job]);

  const handleRetune = async (tone: CoverLetterTone) => {
    setSelectedTone(tone);
    setIsRetuning(true);
    try {
      const tailored = generateTailoredDocuments(job, tone);
      setCoverLetter(tailored.coverLetter);
      setCvSummary(tailored.tailoredCvSummary);
      setHighlights(tailored.highlightedBullets || []);
      const updated: JobListing = { ...job, tailoredDocuments: tailored };
      saveJobOverrideLocally(updated);
      onJobUpdated(updated);
    } finally {
      setIsRetuning(false);
    }
  };

  const handleSaveChanges = async (overrideStatus?: JobStatus) => {
    const nextStatus = overrideStatus || status;
    setIsSaving(true);
    setSaveBanner(null);
    try {
      const baseDocs = job.tailoredDocuments || generateTailoredDocuments(job, selectedTone);
      const updated: JobListing = {
        ...job,
        status: nextStatus,
        appliedAt: nextStatus === 'applied' ? job.appliedAt || new Date().toISOString() : job.appliedAt,
        applicationNotes: notes,
        tailoredDocuments: {
          ...baseDocs,
          coverLetter,
          tailoredCvSummary: cvSummary,
          tone: selectedTone,
          lastGeneratedAt: new Date().toISOString(),
        },
      };
      saveJobOverrideLocally(updated);
      setStatus(updated.status);
      onJobUpdated(updated);
      setSaveBanner('Saved edits, status & notes in your browser.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmailDraft = async () => {
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const draft = buildClientEmailDraft(job, coverLetter);
      setEmailResult({
        message: draft.message,
        previewUrl: draft.previewBlobUrl,
        mailtoLink: draft.mailtoLink,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleMarkApplied = async () => {
    setIsSubmitting(true);
    try {
      const appliedAt = new Date().toISOString();
      const updated: JobListing = {
        ...job,
        status: 'applied',
        appliedAt,
        applicationNotes:
          notes || `Applied via ${job.source} on ${new Date().toLocaleDateString('en-ZA')}`,
      };
      saveJobOverrideLocally(updated);
      setStatus('applied');
      setAppliedBanner(`Application recorded for ${job.title} at ${job.company}.`);
      onJobUpdated(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-md bg-slate-950/85">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60 backdrop-blur-md gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-lg">
                  {job.title}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-mono">
                  {job.matchAnalysis.score}% CV Match
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 font-mono">
                  {job.region}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/35 text-amber-200 font-mono">
                  {getDeadlineInfo(job.closingDate).label}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                <strong className="text-slate-200">{job.company}</strong> • {job.location}
                {job.contractType ? ` • ${job.contractType}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors shrink-0"
            aria-label="Close application modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Confirmation Banners */}
        {appliedBanner && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-6 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-xs font-semibold text-emerald-200">{appliedBanner}</p>
            </div>
            {job.sourceUrl && job.sourceUrl !== '#' && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <span>Open Official Application Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {saveBanner && (
          <div className="bg-sky-950/80 border-b border-sky-500/35 px-6 py-2.5 text-xs text-sky-200 flex items-center space-x-2">
            <BookmarkCheck className="w-4 h-4 text-sky-400" />
            <span>{saveBanner}</span>
          </div>
        )}

        {emailResult && (
          <div className="bg-rose-950/75 border-b border-rose-500/35 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-rose-300 shrink-0" />
              <p className="text-xs font-semibold text-rose-100">{emailResult.message}</p>
            </div>
            <div className="flex items-center space-x-2">
              {emailResult.previewUrl && (
                <a
                  href={emailResult.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Formatted Email Preview</span>
                </a>
              )}
              {emailResult.mailtoLink && (
                <a
                  href={emailResult.mailtoLink}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-slate-100 text-xs font-medium"
                >
                  <span>Open in Mail App</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Split-Screen Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-white/10">
          {/* LEFT COLUMN (5 cols): Match Breakdown, Pipeline Tracker & Role Spec */}
          <div className="lg:col-span-5 p-6 overflow-y-auto space-y-5 bg-slate-950/35">
            {/* Match Breakdown */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>CV Alignment Breakdown</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Qualifications (UCT PGCE / BA / SACE)</span>
                    <strong className="text-emerald-400">
                      {job.matchAnalysis.breakdown.qualificationsMatch}%
                    </strong>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${job.matchAnalysis.breakdown.qualificationsMatch}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Experience Fit (Teaching / NPO / L&amp;D)</span>
                    <strong className="text-rose-400">
                      {job.matchAnalysis.breakdown.experienceMatch}%
                    </strong>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-rose-400 rounded-full"
                      style={{ width: `${job.matchAnalysis.breakdown.experienceMatch}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Western Cape &amp; Sector Alignment</span>
                    <strong className="text-indigo-400">
                      {job.matchAnalysis.breakdown.sectorFit}%
                    </strong>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${job.matchAnalysis.breakdown.sectorFit}%` }}
                    />
                  </div>
                </div>
              </div>

              <p className="pt-2 text-xs text-slate-300 italic border-t border-white/5 leading-relaxed">
                &ldquo;{job.matchAnalysis.recommendation}&rdquo;
              </p>
            </div>

            {/* Matched & Gap Chips */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Verified Strengths in Courtney’s CV
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {job.matchAnalysis.matchedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono"
                  >
                    ✓ {kw}
                  </span>
                ))}
              </div>

              {job.matchAnalysis.missingKeywords.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-[11px] font-semibold text-amber-300/90 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Things to Check in the Advert:</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.matchAnalysis.missingKeywords.map((gap) => (
                      <span
                        key={gap}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-amber-950/50 border border-amber-500/30 text-amber-200 font-mono"
                      >
                        • {gap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status & Notes Tracker */}
            <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Application Tracker
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    const next = e.target.value as JobStatus;
                    setStatus(next);
                    handleSaveChanges(next);
                  }}
                  className="bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes (e.g., Principal's name, closing date, interview date, SACE attachment sent)..."
                className="w-full rounded-xl bg-slate-950 border border-white/10 p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Key Requirements & Overview */}
            {job.requirements.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Key Requirements
                </h4>
                <ul className="space-y-1 text-xs text-slate-300">
                  {job.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-emerald-400">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Role Description
              </h4>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-400 max-h-40 overflow-y-auto leading-relaxed">
                {job.description}
              </div>
            </div>

            {job.sourceUrl && job.sourceUrl !== '#' && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>Open live posting on {job.source}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* RIGHT COLUMN (7 cols): Tailored Cover Letter, CV Highlights & Exports */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between overflow-y-auto space-y-4">
            <div>
              {/* Tabs & Tone Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('letter')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      activeTab === 'letter'
                        ? 'bg-emerald-600 text-white shadow-glow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Bespoke Cover Letter
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cv')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      activeTab === 'cv'
                        ? 'bg-emerald-600 text-white shadow-glow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tailored CV Highlights
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeTab === 'letter' && (
                    <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setViewMode('preview')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 ${
                          viewMode === 'preview'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Formatted</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('edit')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1 ${
                          viewMode === 'edit'
                            ? 'bg-rose-600 text-white font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  )}

                  <select
                    value={selectedTone}
                    onChange={(e) => handleRetune(e.target.value as CoverLetterTone)}
                    disabled={isRetuning}
                    className="bg-slate-800 border border-white/10 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                    aria-label="Select cover letter angle"
                  >
                    <option value="educator">Educator (English &amp; LO)</option>
                    <option value="npo">NPO &amp; Social Impact</option>
                    <option value="corporate">Admin, L&amp;D &amp; Project Mgmt</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRetune(selectedTone)}
                    disabled={isRetuning}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300"
                    title="Regenerate tailored letter"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetuning ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Document Body */}
              {activeTab === 'letter' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Written in Courtney James’s voice • Tone:{' '}
                      <strong className="text-emerald-300 capitalize">{selectedTone}</strong>
                    </span>
                    <span>{coverLetter.length} chars</span>
                  </div>

                  {viewMode === 'preview' ? (
                    <div className="w-full rounded-2xl bg-slate-950 border border-white/10 p-5 max-h-[370px] overflow-y-auto shadow-inner">
                      <MarkdownRenderer content={coverLetter} />
                    </div>
                  ) : (
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      rows={15}
                      className="w-full rounded-2xl bg-slate-950 border border-white/10 p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      Tailored CV Profile Summary (prioritised for {job.company})
                    </label>
                    <div className="rounded-2xl bg-slate-950 border border-white/10 p-4 leading-relaxed">
                      <MarkdownRenderer content={cvSummary} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">
                      Top CV Highlights Placed First on Exported DOCX
                    </label>
                    <div className="space-y-2">
                      {highlights.map((bullet, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 leading-relaxed"
                        >
                          <span className="text-emerald-400 font-bold mr-1.5">#{idx + 1}</span>
                          <MarkdownRenderer content={bullet} className="inline" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Exports & Actions */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadTailoredCvDocx(job, cvSummary)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Tailored CV (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadCoverLetterDocx(job, coverLetter)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>Download Cover Letter (.docx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendEmailDraft}
                  disabled={isSendingEmail}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 transition-colors"
                >
                  <Mail className={`w-3.5 h-3.5 text-rose-300 ${isSendingEmail ? 'animate-spin' : ''}`} />
                  <span>{isSendingEmail ? 'Preparing...' : 'Email Preview / Draft'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleSaveChanges()}
                  disabled={isSaving}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all"
                >
                  <Save className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isSaving ? 'Saving...' : 'Save Edits & Notes'}</span>
                </button>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkApplied}
                    disabled={isSubmitting || status === 'applied'}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-glow transition-all active:scale-95 ${
                      status === 'applied'
                        ? 'bg-emerald-700 cursor-default'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Recording...'
                        : status === 'applied'
                        ? 'Marked as Applied'
                        : 'Mark as Applied'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Human-in-the-loop Application Review & Tailoring Cockpit for Courtney James.
 */
export function ReviewModal({ job, onClose, onJobUpdated }: ReviewModalProps) {
  return (
    <AnimatePresence>
      {job ? (
        <ReviewModalInner job={job} onClose={onClose} onJobUpdated={onJobUpdated} />
      ) : null}
    </AnimatePresence>
  );
}
