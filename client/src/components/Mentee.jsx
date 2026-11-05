// AI 후배 "배배"(배우는 후배) — 정수리에 물음표 모양 털이 삐죽 난 하얀 솜뭉치
const PUFFS = [
  [52, 62, 33],
  [25, 56, 15],
  [79, 56, 15],
  [30, 80, 15],
  [74, 80, 15],
  [52, 89, 13],
  [35, 37, 14],
  [69, 37, 14],
  [52, 32, 15],
];
// 물음표 모양: 왼쪽 끝은 머리에서 떨어진 채 열려 있고, 아래 줄기만 머리 속으로 들어감
const TUFT = 'M39 3 q0 -12 13 -12 q12.5 0 12.5 10.5 q0 7 -8 10 q-4.5 1.6 -4.5 9';
const INK = '#1F3A2E';
const LINE = '#C9DED2';

export default function Mentee({ size = 72, mood = 'curious', className = '' }) {
  const eyes =
    mood === 'happy' ? (
      <>
        <path d="M37 60 q5 -6 10 0" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M57 60 q5 -6 10 0" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </>
    ) : mood === 'confused' ? (
      <>
        <ellipse cx="42" cy="59" rx="3.6" ry="4.4" fill={INK} />
        <path d="M57 56 q5 -3 10 1" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        <ellipse cx="62" cy="61" rx="3" ry="3.4" fill={INK} />
      </>
    ) : (
      <>
        <ellipse cx="42" cy="59" rx="4" ry="5" fill={INK} />
        <ellipse cx="62" cy="59" rx="4" ry="5" fill={INK} />
        <circle cx="43.4" cy="57" r="1.5" fill="#fff" />
        <circle cx="63.4" cy="57" r="1.5" fill="#fff" />
      </>
    );
  const mouth =
    mood === 'happy' ? (
      <path d="M46 68 q6 7 12 0 z" fill="#FF8A8A" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
    ) : mood === 'confused' ? (
      <path d="M47 70 q2.5 -2.5 5 0 q2.5 2.5 5 0" stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    ) : (
      <ellipse cx="52" cy="69" rx="2.6" ry="2.2" fill={INK} />
    );

  return (
    <svg className={`mentee ${className}`} width={size} height={size} viewBox="0 -14 104 118" aria-label="AI 후배 배배" role="img">
      {/* 물음표 모양 털 (외곽선 → 흰 털 순서로 겹쳐 그림) */}
      <path d={TUFT} stroke={LINE} strokeWidth="9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* 솜뭉치 외곽선: 조금 더 큰 원들을 먼저 깔고 */}
      {PUFFS.map(([x, y, r], i) => (
        <circle key={`o${i}`} cx={x} cy={y} r={r + 2.4} fill={LINE} />
      ))}
      {/* 흰 솜 */}
      {PUFFS.map(([x, y, r], i) => (
        <circle key={`f${i}`} cx={x} cy={y} r={r} fill="#FBFDFC" />
      ))}
      <path d={TUFT} stroke="#FBFDFC" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {eyes}
      <ellipse cx="33" cy="68" rx="5.5" ry="3.4" fill="#FFD54F" opacity=".75" />
      <ellipse cx="71" cy="68" rx="5.5" ry="3.4" fill="#FFD54F" opacity=".75" />
      {mouth}
    </svg>
  );
}
