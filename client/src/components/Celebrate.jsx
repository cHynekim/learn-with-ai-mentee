import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import Mentee from './Mentee.jsx';

const NEON = ['#34C38F', '#FFD54F', '#7DDBB5', '#FFE79A', '#1F9E6E'];

function burst(big) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const star = confetti.shapeFromText ? confetti.shapeFromText({ text: '✦', scalar: 2 }) : undefined;
  const base = { colors: NEON, disableForReducedMotion: true, zIndex: 9999 };
  confetti({ ...base, particleCount: big ? 160 : 90, spread: 100, startVelocity: 45, origin: { y: 0.6 } });
  setTimeout(() => {
    confetti({ ...base, particleCount: 40, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    confetti({ ...base, particleCount: 40, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
  }, 180);
  if (star) setTimeout(() => confetti({ ...base, shapes: [star], scalar: 2, particleCount: big ? 40 : 18, spread: 140, origin: { y: 0.45 } }), 320);
  navigator.vibrate?.(big ? [30, 40, 30, 40, 60] : [30, 30, 40]);
}

/** 개념을 정확히 설명했을 때의 보상 이펙트 */
export default function Celebrate({ items, onDone }) {
  const item = items?.[0];
  useEffect(() => {
    if (!item) return;
    burst(item.fixed);
    const t = setTimeout(onDone, item.fixed ? 3200 : 2600);
    return () => clearTimeout(t);
  }, [item]);

  if (!item) return null;
  return (
    <div className="celebrate" onClick={onDone} role="status" aria-live="assertive">
      <div className={`cele-card ${item.fixed ? 'fixed' : ''}`}>
        <div className="cele-rays" />
        <div className="cele-badge">{item.fixed ? 'COMEBACK!' : item.retry ? 'NICE RETRY!' : 'CONCEPT CLEAR!'}</div>
        <Mentee size={92} mood="happy" className="cele-momo" />
        <div className="cele-title">
          {item.fixed ? '헷갈렸던 걸 고쳐냈어!' : item.retry ? '다시 설명해 줘서 이해했어!' : '배배가 이해했어!'}
        </div>
        <div className="cele-concept">{item.title}</div>
        {item.note && <div className="cele-note">{item.note}</div>}
        {item.retry ? (
          <div className="cele-plus">한 번 더 복습하면 완전히 선배 거야 · 노트북 '헷갈리는 부분'에 남겨 둘게</div>
        ) : (
          <div className="cele-plus">+{item.fixed ? 2 : 1} 개념 별</div>
        )}
        {items.length > 1 && <div className="cele-more">+{items.length - 1}개 더!</div>}
      </div>
    </div>
  );
}
