import type { RoomSummary, User } from './types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function ensureOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpError(text || res.statusText, res.status);
  }
  return res;
}

export async function register(
  username: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  await ensureOk(res);
  return res.json();
}

export async function login(
  username: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  await ensureOk(res);
  return res.json();
}

export async function me(): Promise<User> {
  const res = await fetch(`${API_BASE}/me`, { headers: { ...authHeaders() } });
  await ensureOk(res);
  return res.json();
}

export async function listRooms(): Promise<RoomSummary[]> {
  const res = await fetch(`${API_BASE}/rooms`);
  await ensureOk(res);
  return res.json();
}

export async function createRoom(
  name: string,
  password?: string
): Promise<RoomSummary> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, password }),
  });
  await ensureOk(res);
  return res.json();
}

export async function deleteRoom(roomId: string): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  await ensureOk(res);
  return res.json();
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export async function verifyRoomPassword(
  roomId: string,
  password?: string
): Promise<{ ok: true }> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ password }),
  });
  await ensureOk(res);
  return res.json();
}
