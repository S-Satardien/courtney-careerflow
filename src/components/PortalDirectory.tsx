'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Compass,
  GraduationCap,
  HeartHandshake,
  BriefcaseBusiness,
  Radar,
} from 'lucide-react';
import { WESTERN_CAPE_PORTALS } from '@/data/courtney-profile';
import { JobCategory } from '@/types/job';

interface PortalDirectoryProps {
  onQuickCrawl: (url: string, name: string) => void;
}

/**
 * Collapsible directory of verified Western Cape Teaching, NPO, and Admin/L&D job portals.
 * Gives Courtney 1-click access to live boards (WCED, ISASA, Action Appointments, UCT, PNet, etc.)
 * as well as direct portal crawling.
 */
export function PortalDirectory({ onQuickCrawl }: PortalDirectoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalTab, setPortalTab] = useState<'all' | JobCategory>('all');

  const visiblePortals =
    portalTab === 'all'
      ? WESTERN_CAPE_PORTALS
      : WESTERN_CAPE_PORTALS.filter((p) => p.category === portalTab);

  const categoryMeta: Record<
    JobCategory,
    { label: string; icon: React.ComponentType<{ className?: string }>; pill: string }
  > = {
    teaching: {
      label: 'Teaching',
      icon: GraduationCap,
      pill: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/30',
    },
    npo: {
      label: 'NPO / NGO',
      icon: HeartHandshake,
      pill: 'bg-rose-950/70 text-rose-300 border-rose-500/30',
    },
    admin: {
      label: 'Admin & L&D',
      icon: BriefcaseBusiness,
      pill: 'bg-indigo-950/70 text-indigo-300 border-indigo-500/30',
    },
  };

  return (
    <section className="rounded-2xl backdrop-blur-xl bg-slate-900/50 border border-white/10 overflow-hidden shadow-card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-emerald-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Southern Suburbs Live Job Portal Hub ({WESTERN_CAPE_PORTALS.length} Monitored Sites)
            </h2>
            <p className="text-xs text-slate-400">
              14 Southern Suburbs Schools + 13 Direct NPOs (DGMT, IkamvaYouth, Equal Education, Common Good, DTHF, WWF, Allan Gray Orbis, SAEP, YearBeyond, Axium, OLICO, Action Appointments) + ISASA, Old School Ties, WCED, Adzuna, JobMail, PNet, UCT &amp; HEJobs
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold">
          <span className="hidden sm:inline">{isOpen ? 'Hide Portals' : 'Explore Portals'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 px-5 py-4 space-y-4 bg-slate-950/40"
          >
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'teaching', 'npo', 'admin'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPortalTab(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    portalTab === tab
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {tab === 'all'
                    ? 'All Portals'
                    : tab === 'teaching'
                    ? 'Schools & WCED'
                    : tab === 'npo'
                    ? 'NPO & NGO Boards'
                    : 'Universities & Corporate'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visiblePortals.map((portal) => {
                const meta = categoryMeta[portal.category];
                const Icon = meta.icon;
                return (
                  <div
                    key={portal.id}
                    className="rounded-xl bg-slate-900/80 border border-white/10 hover:border-white/20 p-3.5 flex flex-col justify-between gap-2.5 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${meta.pill}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{meta.label}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-white/5">
                          {portal.badge}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-white">{portal.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {portal.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                      <a
                        href={portal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <span>Open Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      {portal.canCrawl && (
                        <button
                          type="button"
                          onClick={() => onQuickCrawl(portal.url, portal.name)}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-medium text-slate-200 transition-colors"
                        >
                          <Radar className="w-3 h-3 text-rose-400" />
                          <span>Scour Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
