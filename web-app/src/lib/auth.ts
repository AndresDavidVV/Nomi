import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'CCC_nextauth_super_secure_key_2026!Generated';
const JWT_EXPIRY = '7d'; // 7 días

export interface SessionUser {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  role?: string;
}

export function createSessionToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ccc-session')?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('ccc-session', token, {
    httpOnly: true,
    secure: false, // ALB serves HTTP, not HTTPS
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('ccc-session');
}

export function normalizePhone(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Si empieza con 57 (Colombia), asegurar que sea válido
  if (cleaned.startsWith('57') && cleaned.length >= 10) {
    return cleaned;
  }
  
  // Si no tiene código de país, asumir Colombia
  if (cleaned.length === 10) {
    return '57' + cleaned;
  }
  
  return cleaned;
}

export function formatPhoneForWhatsApp(phone: string): string {
  const normalized = normalizePhone(phone);
  return `+${normalized}`;
}
