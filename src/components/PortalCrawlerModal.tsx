'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Globe,
  CheckCircle2,
  AlertCircle,
  PlusSquare,
  Sparkles,
} from 'lucide-react';
import { JobCategory, JobListing } from '@/types/job';
import { createManualJobLocally } from '@/lib/browser-store';

interface PortalCrawlerModalProps {
  isOpen: boolean;
  initialUrl?: string;
  initialName?: string;
  onClose: () => void;
  onJobsDiscovered: (newJobs: JobListing[]) => void;
}

/**
 * Dual-mode modal enabling Courtney to:
 * 1. Scour any Western Cape school, NPO, university, or corporate careers URL live.
 * 2. Paste any vacancy manually (e.g., from a WCED PDF circular, school email, or LinkedIn)
 *    to immediately compute her CV match score and generate a bespoke cover letter & DOCX CV.
 */
export function PortalCrawlerModal({
  isOpen,
  initialUrl = '',
  initialName = '',
  onClose,
  onJobsDiscovered,
}: PortalCrawlerModalProps) {
  const [mode, setMode] = useState<'crawl' | 'manual'>('manual');

  // Crawl state
  const [url, setUrl] = useState(initialUrl);
  const [companyName, setCompanyName] = useState(initialName);

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualLocation, setManualLocation] = useState('Cape Town, Western Cape');
  const [manualCategory, setManualCategory] = useState<JobCategory>('teaching');
  const [manualUrl, setManualUrl] = useState('');
  const [manualClosingDate, setManualClosingDate] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [discoveredCount, setDiscoveredCount] = useState<number | null>(null);

  useEffect(() => {
    if (initialUrl) {
      setMode('crawl');
      setUrl(initialUrl);
      setCompanyName(initialName);
      setResultMessage(null);
      setDiscoveredCount(null);
    }
  }, [initialUrl, initialName]);

  if (!isOpen) return null;

  const sampleTargets = [
    { name: 'ISASA English', url: 'https://www.isasa.org/vacancies/vacancy-categories/english/' },
    { name: 'ISASA Life Orientation', url: 'https://www.isasa.org/vacancies/vacancy-categories/life-orientation/' },
    { name: 'Action Appointments (NPO)', url: 'https://www.actionappointments.co.za/vacancies' },
    { name: 'DGMT (Claremont)', url: 'https://dgmt.co.za/work-with-us/' },
    { name: 'IkamvaYouth (Observatory)', url: 'https://ikamvayouth.org/join-us/careers/' },
    { name: 'Equal Education (Obs)', url: 'https://equaleducation.org.za/join-us/careers/' },
    { name: 'Common Good (Observatory)', url: 'https://www.commongood.org.za/careers/' },
    { name: 'Allan Gray Orbis (eRecruit)', url: 'https://agof.erecruit.co/candidateapp/Jobs/Browse' },
    { name: 'WWF SA (Newlands)', url: 'https://wwf.erecruit.co/candidateapp/Jobs/Browse' },
    { name: 'Adzuna Claremont Admin', url: 'https://www.adzuna.co.za/search?q=administrator&w=Claremont' },
  ];

  const handleCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setResultMessage(null);
    setDiscoveredCount(null);

    try {
      // Static GitHub Pages cannot bypass browser CORS for arbitrary portals;
      // open the portal directly so Courtney can browse & paste any advert into "Paste / Add Vacancy"
      window.open(url.trim(), '_blank', 'noopener,noreferrer');
      setResultMessage(
        `Opened ${companyName || url.trim()} in a new tab. Copy any open advert into the "Paste / Add Vacancy" tab to score it against Courtney's CV and generate a tailored .docx pack instantly. (All 36 monitored sites are also auto-scrubbed daily at 06:00 SAST via GitHub Actions.)`
      );
      setDiscoveredCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualCompany.trim()) return;

    setIsLoading(true);
    setResultMessage(null);
    setDiscoveredCount(null);

    try {
      const result = createManualJobLocally({
        title: manualTitle.trim(),
        company: manualCompany.trim(),
        location: manualLocation.trim(),
        category: manualCategory,
        sourceUrl: manualUrl.trim() || '#',
        closingDate: manualClosingDate || undefined,
        description: manualDesc.trim(),
      });

      if (result.success && result.job) {
        setResultMessage(result.message);
        setDiscoveredCount(1);
        onJobsDiscovered([result.job]);
        setManualTitle('');
        setManualCompany('');
        setManualUrl('');
        setManualClosingDate('');
        setManualDesc('');
      } else {
        setResultMessage(result.message);
        setDiscoveredCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl rounded-3xl bg-slate-900 border border-white/10 p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Import Western Cape Vacancies
                </h3>
                <p className="text-xs text-slate-400">
                  Scour a live school/NPO portal or paste a vacancy to score &amp; tailor instantly
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('crawl');
                setResultMessage(null);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg font-semibold transition-all ${
                mode === 'crawl'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Scour Portal URL</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('manual');
                setResultMessage(null);
              }}
              className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg font-semibold transition-all ${
                mode === 'manual'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusSquare className="w-3.5 h-3.5" />
              <span>Paste / Add Vacancy</span>
            </button>
          </div>

          {mode === 'crawl' ? (
            <form onSubmit={handleCrawl} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  School, NPO, University or Company Careers URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.isasa.org/vacancies/ or https://actionappointments.co.za/vacancies/"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Organisation / Portal Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wynberg Girls’ High School or IkamvaYouth"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <p className="text-[11px] text-slate-400 mb-2 font-mono">
                  Western Cape Quick Scour Targets:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {sampleTargets.map((sample) => (
                    <button
                      key={sample.name}
                      type="button"
                      onClick={() => {
                        setUrl(sample.url);
                        setCompanyName(sample.name);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>

              {resultMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start space-x-2 ${
                    discoveredCount && discoveredCount > 0
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/50 border-amber-500/35 text-amber-200'
                  }`}
                >
                  {discoveredCount && discoveredCount > 0 ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  )}
                  <span>{resultMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !url.trim()}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-glow transition-all active:scale-95 disabled:opacity-60"
                >
                  <Search className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? 'Scouring...' : 'Scour Vacancies'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleManualAdd} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FET English & LO Educator"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    School / NPO / Organisation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Westerford High School"
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Western Cape Location / Suburb
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rondebosch, Cape Town"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Career Track
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as JobCategory)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
                  >
                    <option value="teaching">High School Teaching (English &amp; LO)</option>
                    <option value="npo">NPO / NGO &amp; Youth Education</option>
                    <option value="admin">Admin, L&amp;D &amp; Project Coordination</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Posting Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Closing Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={manualClosingDate}
                    onChange={(e) => setManualClosingDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Paste Job Description / Requirements
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste the advert text from a WCED circular, WhatsApp message, ISASA post, or LinkedIn..."
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-400 resize-none"
                />
              </div>

              {resultMessage && (
                <div className="p-3 rounded-xl border bg-emerald-950/60 border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resultMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !manualTitle.trim() || !manualCompany.trim()}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-roseGlow transition-all active:scale-95 disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Scoring & Tailoring...' : 'Add, Score & Tailor Cover Letter'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
