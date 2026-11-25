'use client';

import React from 'react';
import { RefreshCw, PlusCircle, BookOpenCheck, MapPin, LogOut } from 'lucide-react';
import { courtneyProfile } from '@/data/courtney-profile';

interface NavbarProps {
  onOpenCrawler: () => void;
  onSyncAll: () => void;
  onSignOut: () => void;
  isSyncing: boolean;
  jobCount: number;
  appliedCount: number;
}

/**
 * Sticky glassmorphic top navigation bar for CareerFlow WC.
 */
export function Navbar({
  onOpenCrawler,
  onSyncAll,
  onSignOut,
  isSyncing,
  jobCount,
  appliedCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/75 border-b border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-rose-500 shadow-glow p-[1px]">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <BookOpenCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">
                CareerFlow<span className="text-emerald-400 font-extrabold">.WC</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono font-medium">
                <MapPin className="w-3 h-3" />
                <span>Southern Suburbs</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              High School Teaching (English &amp; LO) • NPOs • Admin &amp; L&amp;D Suite
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="hidden xl:flex items-center space-x-2.5 text-xs shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2 text-slate-300 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>
              WC Roles: <strong className="text-white">{jobCount}</strong>
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2 text-slate-300 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
            <span>
              Applied: <strong className="text-white">{appliedCount}</strong>
            </span>
          </div>
        </div>

        {/* Actions & Candidate Pill */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={onOpenCrawler}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-400/40 text-slate-200 transition-all active:scale-95 whitespace-nowrap"
            aria-label="Scour portal or add job manually"
          >
            <PlusCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="hidden sm:inline">Scour / Add Job</span>
          </button>

          <button
            onClick={onSyncAll}
            disabled={isSyncing}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-glow transition-all active:scale-95 whitespace-nowrap ${
              isSyncing ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            aria-label="Sync Western Cape job boards"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync WC Boards'}</span>
          </button>

          {/* Courtney James Avatar Pill */}
          <div className="hidden lg:flex items-center space-x-2.5 pl-3 border-l border-white/10 shrink-0 whitespace-nowrap">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
              {courtneyProfile.initials}
            </div>
            <div className="text-left text-xs">
              <p className="font-semibold text-slate-100 leading-tight">{courtneyProfile.name}</p>
              <p className="text-[10px] text-emerald-400 font-mono">PGCE • SACE • L&amp;D</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            title="Lock dashboard & sign out"
            aria-label="Sign out"
            className="flex items-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-400/40 text-slate-300 hover:text-rose-200 transition-all active:scale-95 shrink-0"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
