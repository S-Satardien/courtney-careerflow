'use client';

import { courtneyProfile } from '@/data/courtney-profile';
import { CandidateReference } from '@/types/job';

export const PHONE_PLACEHOLDER = '{{CANDIDATE_PHONE}}';
export const EMAIL_PLACEHOLDER = '{{CANDIDATE_EMAIL}}';

const SESSION_KEY = 'careerflow_wc_auth_session_v1';

export interface CandidateContactSecrets {
  phone: string;
  email: string;
  references: CandidateReference[];
}

interface EncryptedVault {
  version: number;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

/**
 * AES-256-GCM encrypted contact vault derived via PBKDF2-SHA256 (250,000 iterations).
 * Neither the password nor Courtney's phone, email, or reference details are stored
 * in plaintext anywhere in the repository or compiled client bundle.
 */
const AUTH_VAULT: EncryptedVault = {
  version: 1,
  iterations: 250000,
  salt: 'CIREFZsp8rTVIPSO0rzzqg==',
  iv: 'P5ac9aSYRtdn2d+X',
  ciphertext:
    '5zw6T1BVNLk7SLCVASSv4bWB3sOdyvUJfAjB3R6jdqutMF078RVRZVeUC+IkiX93GvsCpd/QvjuTV15PcYIJ0WHiSsUfAD2ngRFSbpdzxV6LXIJxYLpPd11WebivDryzknATuQyiLAA66WhLEctnSPsuCkZ/l5IKls7cLUV+drXFmCpdJATP4tHws8Td4mXII9RO4hZXgVQ+oDqJVwnKC+Gorri2w4uGjfZj1pE4uheFB+wc3Ttb4bvjFjlA06IMhfd6eKz0BD5UN60kdk8mSZeku0G/PF71XfvbagJhFzI80f18moBhQxrWHF+gmfkMTGHcVbGRyXFk12n66dcFy2w1P7LZxJ2tA47dvqB49KaTL6XJpdLeTwoqVsXlroJQweuAFGiu5Fd/TBVJ3REeP3ySBkRjAQNe6+pV48XLndfZxFR0FzgXAaKFSGM/zGQ382PHUOdOtblM8iw4qRy+iKQL//mMzCcNyWHvehviCCiE1A0m5k/zKL9qCX5VMi5ZQL8KJA4oHpd+W4wP1veRGF9SVjDKtp+jrd2yaHcUjOd+pHj8rovDdXCRxzAtz7c89F0YyVfVCZNohdFe9cHib/jCnZMWnIz59HorHxjSJXc+O/CNsHuG33kIhNMvsfUqYR6F3I2HjiEC9cxnxZHIfnkuzXouAA5cKK2yHmDlhIFPE23onMoWRIO9QAawK8PG',
};

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function isValidSecrets(value: unknown): value is CandidateContactSecrets {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CandidateContactSecrets>;
  return (
    typeof candidate.phone === 'string' &&
    candidate.phone.length > 0 &&
    typeof candidate.email === 'string' &&
    candidate.email.includes('@') &&
    Array.isArray(candidate.references)
  );
}

/**
 * Hydrates Courtney's decrypted phone, email, and reference details into the
 * in-memory candidate profile used by cover letters, email drafts, and DOCX exports.
 */
export function hydrateProfileSecrets(secrets: CandidateContactSecrets): void {
  courtneyProfile.phone = secrets.phone;
  courtneyProfile.email = secrets.email;
  courtneyProfile.references = secrets.references;
}

/**
 * Replaces build-time contact placeholders in static cover letters with the
 * unlocked contact details once authenticated.
 */
export function hydrateCoverLetterPlaceholders(text: string): string {
  if (!text) return text;
  const phone = courtneyProfile.phone && courtneyProfile.phone !== PHONE_PLACEHOLDER
    ? courtneyProfile.phone
    : '';
  const email = courtneyProfile.email && courtneyProfile.email !== EMAIL_PLACEHOLDER
    ? courtneyProfile.email
    : '';

  return text
    .replaceAll(PHONE_PLACEHOLDER, phone)
    .replaceAll(EMAIL_PLACEHOLDER, email);
}

/**
 * Verifies user credentials by deriving an AES-256-GCM key via PBKDF2-SHA256
 * and decrypting the candidate contact vault. Invalid credentials cryptographically
 * fail AEAD verification.
 */
export async function unlockCandidateSession(
  username: string,
  password: string,
  rememberDevice: boolean
): Promise<{ ok: true; secrets: CandidateContactSecrets } | { ok: false; error: string }> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return {
      ok: false,
      error: 'Secure browser cryptography (HTTPS or localhost) is required to unlock this workspace.',
    };
  }

  const normalizedUser = username.trim().toLowerCase();
  if (!normalizedUser || !password) {
    return { ok: false, error: 'Please enter both your email address and password.' };
  }

  try {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(`${normalizedUser}::${password}`);

    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      keyMaterial,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const aesKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: base64ToBytes(AUTH_VAULT.salt),
        iterations: AUTH_VAULT.iterations,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(AUTH_VAULT.iv),
      },
      aesKey,
      base64ToBytes(AUTH_VAULT.ciphertext)
    );

    const parsed: unknown = JSON.parse(new TextDecoder().decode(decryptedBuffer));
    if (!isValidSecrets(parsed)) {
      return { ok: false, error: 'Invalid email or password.' };
    }

    hydrateProfileSecrets(parsed);

    const serialized = JSON.stringify({
      unlockedAt: new Date().toISOString(),
      secrets: parsed,
    });

    try {
      if (rememberDevice) {
        window.localStorage.setItem(SESSION_KEY, serialized);
        window.sessionStorage.removeItem(SESSION_KEY);
      } else {
        window.sessionStorage.setItem(SESSION_KEY, serialized);
        window.localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Storage blocked in private mode — keep session unlocked in memory for this tab
    }

    return { ok: true, secrets: parsed };
  } catch {
    return { ok: false, error: 'Invalid email or password. Please check your credentials and try again.' };
  }
}

/**
 * Restores a previously unlocked session from sessionStorage or localStorage.
 */
export function restoreCandidateSession(): CandidateContactSecrets | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw =
      window.sessionStorage.getItem(SESSION_KEY) ?? window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { secrets?: unknown };
    if (!isValidSecrets(parsed.secrets)) {
      signOutCandidateSession();
      return null;
    }

    hydrateProfileSecrets(parsed.secrets);
    return parsed.secrets;
  } catch {
    return null;
  }
}

/**
 * Locks the dashboard immediately, removing stored session tokens and scrubbing
 * contact details from the in-memory profile.
 */
export function signOutCandidateSession(): void {
  courtneyProfile.phone = PHONE_PLACEHOLDER;
  courtneyProfile.email = EMAIL_PLACEHOLDER;
  courtneyProfile.references = [];

  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage access errors
  }
}
