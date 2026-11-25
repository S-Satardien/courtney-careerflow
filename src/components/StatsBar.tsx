'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, HeartHandshake, BriefcaseBusiness, MapPin } from 'lucide-react';
import { JobCategory, JobListing } from '@/types/job';

interface StatsBarProps {
  jobs: JobListing[];
  activeCategory: 'all' | JobCategory;
  onSelectCategory: (cat: 'all' | JobCategory) => void;
}

/**
 * Interactive 4-card KPI bar allowing Courtney to monitor and 1-click filter
 * across all Western Cape roles, High School Teaching, NPOs, and Admin/L&D tracks.
 */
export function StatsBar({ jobs, activeCategory, onSelectCategory }: StatsBarProps) {
  const total = jobs.length;
  const teachingCount = jobs.filter((j) => j.category === 'teaching').length;
  const npoCount = jobs.filter((j) => j.category === 'npo').length;
  const adminCount = jobs.filter((j) => j.category === 'admin').length;

  const stats: Array<{
    key: 'all' | JobCategory;
    label: string;
    value: number;
    subtext: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    activeRing: string;
  }> = [
    {
      key: 'all',
      label: 'Southern Suburbs Roles',
      value: total,
      subtext: 'Bergvliet to Pinelands & Remote',
      icon: MapPin,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40 border-cyan-500/25',
      activeRing: 'border-cyan-400/60 bg-slate-900/80',
    },
    {
      key: 'teaching',
      label: 'English & LO Teaching Only',
      value: teachingCount,
      subtext: 'ISASA, WCED, OST & Local Schools',
      icon: GraduationCap,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-950/40 border-emerald-500/25',
      activeRing: 'border-emerald-400/60 bg-emerald-950/25',
    },
    {
      key: 'npo',
      label: 'NPO / NGO & Youth Impact',
      value: npoCount,
      subtext: '13 Direct NPOs & Action App',
      icon: HeartHandshake,
      color: 'text-rose-400',
      bgColor: 'bg-rose-950/40 border-rose-500/25',
      activeRing: 'border-rose-400/60 bg-rose-950/25',
    },
    {
      key: 'admin',
      label: 'Admin, L&D & HR / PM',
      value: adminCount,
      subtext: 'Adzuna, JobMail, PNet & UCT',
      icon: BriefcaseBusiness,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-950/40 border-indigo-500/25',
      activeRing: 'border-indigo-400/60 bg-indigo-950/25',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const isActive = activeCategory === stat.key;
        return (
          <motion.button
            type="button"
            key={stat.key}
            onClick={() => onSelectCategory(stat.key)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
            className={`text-left relative overflow-hidden rounded-2xl backdrop-blur-xl border p-5 transition-all shadow-card group cursor-pointer ${
              isActive
                ? stat.activeRing
                : 'bg-slate-900/60 border-white/10 hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
                  {stat.label}
                </p>
                <p className="text-3xl font-extrabold text-white mt-1.5 tracking-tight group-hover:scale-105 transition-transform origin-left">
                  {stat.value}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">{stat.subtext}</p>
              </div>
              <div className={`p-3 rounded-xl border ${stat.bgColor}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all pointer-events-none" />
          </motion.button>
        );
      })}
    </div>
  );
}
