export async function api(path, { method = 'GET', body, form } = {}) {
  const opts = { method, credentials: 'include', headers: {} };
  if (form) opts.body = form;
  else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || '문제가 생겼어요'), { status: res.status });
  return data;
}

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

export const isGuardian = (u) => u && u.role === 'guardian';

/**
 * 클립보드 복사. 성공하면 true.
 * navigator.clipboard 는 HTTPS(또는 localhost)에서만 있으므로, 없거나 실패하면 예전 방식(execCommand)으로 한 번 더 시도
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 권한 거부 등 → 아래 방식으로 재시도 */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS Safari
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
