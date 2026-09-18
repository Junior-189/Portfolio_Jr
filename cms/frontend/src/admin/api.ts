/* Thin fetch wrapper for the admin dashboard. Always sends
 * credentials:"include" so the httpOnly session cookie set by
 * /api/auth/login is attached to every request. */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export interface AdminSkill      { id?: number; name: string; years: number; level: number; desc: string; order?: number; }
export interface AdminProject    { id?: number; num: string; title: string; desc: string; stack: string[]; githubUrl?: string; liveUrl?: string; order?: number; }
export interface AdminExperience { id?: number; year: string; role: string; company: string; desc: string; order?: number; }
export interface AdminStat       { value: string; label: string; }
export interface AdminBio        { id?: number; heading: string; paragraph1: string; paragraph2: string; stats: AdminStat[]; }
export interface AdminProfile    { id?: number; name: string; email: string; githubUrl: string; linkedinUrl: string; footerNote: string; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const login  = (username: string, password: string) => request<{ username: string }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
export const logout = () => request<void>("/auth/logout", { method: "POST" });
export const whoAmI  = () => request<{ username: string }>("/auth/me");

export const listSkills  = () => request<AdminSkill[]>("/skills");
export const createSkill = (data: AdminSkill) => request<AdminSkill>("/skills", { method: "POST", body: JSON.stringify(data) });
export const updateSkill = (id: number, data: AdminSkill) => request<AdminSkill>(`/skills/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteSkill = (id: number) => request<void>(`/skills/${id}`, { method: "DELETE" });

export const listProjects  = () => request<AdminProject[]>("/projects");
export const createProject = (data: AdminProject) => request<AdminProject>("/projects", { method: "POST", body: JSON.stringify(data) });
export const updateProject = (id: number, data: AdminProject) => request<AdminProject>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProject = (id: number) => request<void>(`/projects/${id}`, { method: "DELETE" });

export const listExperience   = () => request<AdminExperience[]>("/experience");
export const createExperience = (data: AdminExperience) => request<AdminExperience>("/experience", { method: "POST", body: JSON.stringify(data) });
export const updateExperience = (id: number, data: AdminExperience) => request<AdminExperience>(`/experience/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteExperience = (id: number) => request<void>(`/experience/${id}`, { method: "DELETE" });

export const getBio    = () => request<AdminBio>("/bio");
export const updateBio = (data: AdminBio) => request<AdminBio>("/bio", { method: "PUT", body: JSON.stringify(data) });

export const getProfile    = () => request<AdminProfile>("/profile");
export const updateProfile = (data: AdminProfile) => request<AdminProfile>("/profile", { method: "PUT", body: JSON.stringify(data) });
