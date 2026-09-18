/* ──────────────────────── LOCAL CMS API LAYER ────────────────────────
 * Talks to the Express + PostgreSQL backend in /backend. Every function
 * fails soft (returns null) so Portfolio.tsx can keep showing its
 * built-in fallback content if the backend isn't running yet, or a
 * request fails for any reason. Nothing here ever throws to the caller.
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export interface ApiSkill      { id: number; name: string; years: number; level: number; desc: string; }
export interface ApiProject    { id: number; num: string; title: string; desc: string; stack: string[]; githubUrl?: string | null; liveUrl?: string | null; }
export interface ApiExperience { id: number; year: string; role: string; company: string; desc: string; }
export interface ApiStat       { value: string; label: string; }
export interface ApiBio        { heading: string; paragraph1: string; paragraph2: string; stats: ApiStat[]; }
export interface ApiProfile    { id: number; name: string; email: string; githubUrl: string; linkedinUrl: string; footerNote: string; }

async function getJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { credentials: "omit" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[CMS] GET ${path} failed — using built-in defaults:`, err);
    return null;
  }
}

export const fetchSkills     = () => getJSON<ApiSkill[]>("/skills");
export const fetchProjects   = () => getJSON<ApiProject[]>("/projects");
export const fetchExperience = () => getJSON<ApiExperience[]>("/experience");
export const fetchBio        = () => getJSON<ApiBio>("/bio");
export const fetchProfile    = () => getJSON<ApiProfile>("/profile");
