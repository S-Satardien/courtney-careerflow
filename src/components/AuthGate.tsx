'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpenCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import {
  restoreCandidateSession,
  signOutCandidateSession,
  unlockCandidateSession,
} from '@/lib/auth';

interface AuthGateProps {
  children: (props: { onSignOut: () => void }) => React.ReactNode;
}

/**
 * Cryptographic static-site authentication gate for CareerFlow WC.
 * Uses PBKDF2-SHA256 + AES-256-GCM to verify credentials and unlock
 * encrypted candidate contact details before mounting the dashboard.
 */
export function AuthGate({ children }: AuthGateProps) {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  useEffect(() => {
    const existing = restoreCandidateSession();
    if (existing) {
      setIsAuthenticated(true);
    }
    setIsCheckingSession(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await unlockCandidateSession(email, password, rememberDevice);

    setIsSubmitting(false);

    if (result.ok) {
      setPassword('');
      setIsAuthenticated(true);
    } else {
      setErrorMessage(result.error);
      setShakeCount((c) => c + 1);
    }
  };

  const handleSignOut = () => {
    signOutCandidateSession();
    setIsAuthenticated(false);
    setPassword('');
    setErrorMessage(null);
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children({ onSignOut: handleSignOut })}</>;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-slate-950">
      {/* Ambient Background Glows */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-emerald-500/12 blur-[120px]" />
        <div className="absolute -bottom-32 right-1/4 w-[26rem] h-[26rem] rounded-full bg-rose-500/10 blur-[120px]" />
      </div>

      <motion.div
        key={shakeCount}
        initial={shakeCount === 0 ? { opacity: 0, y: 18, scale: 0.98 } : { x: 0 }}
        animate={
          shakeCount === 0
            ? { opacity: 1, y: 0, scale: 1 }
            : { x: [0, -8, 8, -6, 6, -3, 3, 0] }
        }
        transition={
          shakeCount === 0
            ? { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
            : { duration: 0.4 }
        }
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl bg-slate-900/75 backdrop-blur-2xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)] p-7 sm:p-9">
          {/* Header Brand */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-rose-500 p-[1.5px] shadow-glow mb-4">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
                <BookOpenCheck className="w-7 h-7 text-emerald-400" />
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                CareerFlow<span className="text-emerald-400 font-extrabold">.WC</span>
              </h1>
              <span className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono">
                <MapPin className="w-3 h-3" />
                <span>Private Access</span>
              </span>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Sign in to unlock your Southern Suburbs career dashboard, tailored CV exports, and application tracker.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  name="username"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-white/10 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950/80 border border-white/10 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-slate-950 text-emerald-500 focus:ring-emerald-500/40"
                />
                <span className="text-xs text-slate-300">Keep me signed in on this device</span>
              </label>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-glow transition-all active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unlocking encrypted workspace...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Indicator */}
          <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>AES-256-GCM encrypted contact vault • PBKDF2-SHA256 verified</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
