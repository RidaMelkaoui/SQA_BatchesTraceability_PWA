/**
 * Runtime-aware API adapter.
 * - In Electron: routes calls to the embedded Express server at localhost:8765
 * - In browser/PWA dev: routes calls to Next.js API routes at /api/...
 */

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const BASE_URL = isElectron ? 'http://localhost:8765' : '';

export async function apiPost(path: string, body: FormData | object) {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    ...(isFormData ? { body } : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
  });
  return res;
}

export async function apiGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
  });
  return res;
}

export { isElectron, BASE_URL };
