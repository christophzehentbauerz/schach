import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
export const localMode = () => !process.env.VERCEL && process.env.NODE_ENV !== 'production';
const secret = () => process.env.SESSION_SECRET || (localMode() ? 'local-development-only-secret-not-for-production' : '');
const sign = value => createHmac('sha256', secret()).update(value).digest('base64url');
export const configured = () => localMode() || (process.env.SESSION_SECRET?.length >= 32 && !!process.env.DATABASE_URL);
function same(a,b) { return typeof a==='string' && Buffer.byteLength(a)===Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b)); }
export function identity(req) {
  if (!configured()) return null;
  const token = String(req.headers.cookie || '').split(';').map(v=>v.trim()).find(v=>v.startsWith('coach_session='))?.slice(14);
  if (!token) return null;
  const parts=token.split('.');
  // Keep Christoph's old signed session valid during the passwordless migration.
  if(parts.length===2){const [expiry,signature]=parts;return /^\d+$/.test(expiry)&&Number(expiry)>Date.now()&&same(signature,sign(expiry))?'personal':null;}
  if(parts.length!==3)return null;
  const [id,expiry,signature]=parts;
  if(!/^(personal|[a-f0-9-]{36})$/.test(id)||!/^\d+$/.test(expiry)||Number(expiry)<Date.now())return null;
  return same(signature,sign(id+'.'+expiry))?id:null;
}
export const authorized = req => !!identity(req);
export function sessionCookie(id = null) {
  const expiry=String(Date.now()+365*86400000);
  const value=id?`${id}.${expiry}.${sign(id+'.'+expiry)}`:'';
  return `coach_session=${value}; HttpOnly; ${localMode()?'':'Secure; '}SameSite=Lax; Path=/; Max-Age=${id?365*86400:0}`;
}
export function sameOrigin(req) {try{return !!req.headers.origin&&new URL(req.headers.origin).host===req.headers.host;}catch{return false;}}
export function clientRateKey(req, purpose) {
  const address=process.env.VERCEL ? String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() : req.socket?.remoteAddress || 'local';
  return purpose+':'+createHash('sha256').update(secret()+address).digest('hex').slice(0,32);
}
