import { useEffect, useState } from 'react';

const KEY = 'mentee-theme';
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

function readStored() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/** 현재 적용된 테마: 직접 고른 값이 있으면 그것, 없으면 시스템 설정 */
function currentTheme() {
  return document.documentElement.dataset.theme || (mq().matches ? 'dark' : 'light');
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0d1611' : '#fafcfb');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* 저장이 막힌 환경에서도 이번 화면에는 적용됨 */
  }
}

/** 다크 모드 on/off 스위치 (화면에 하나만 노출) */
export default function ThemeToggle({ floating = false }) {
  const [dark, setDark] = useState(() => currentTheme() === 'dark');

  useEffect(() => {
    // 직접 고른 적이 없으면 시스템 설정 변경을 따라감
    const m = mq();
    const onChange = () => !readStored() && setDark(m.matches);
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    apply(next ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="다크 모드"
      title={dark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'}
      className={`theme-toggle ${dark ? 'on' : ''} ${floating ? 'floating' : ''}`}
      onClick={toggle}
    >
      <span className="tt-knob">
        {dark ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        )}
      </span>
    </button>
  );
}
