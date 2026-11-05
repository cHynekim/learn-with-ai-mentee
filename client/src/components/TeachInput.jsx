import { useEffect, useRef, useState } from 'react';
import { toast } from './Toast.jsx';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const BLOCKED_INPUT = new Set(['insertFromPaste', 'insertFromPasteAsQuotation', 'insertFromDrop', 'insertFromYank']);
const NO_PASTE_MSG = '붙여넣기는 할 수 없어요. 직접 입력하거나 말로 설명해 주세요';

/**
 * 붙여넣기 금지 입력창. 직접 타이핑 또는 음성 인식으로만 입력 가능.
 */
export default function TeachInput({ onSubmit, disabled, placeholder, autoFocus, footer, leading }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const ref = useRef(null);
  const recRef = useRef(null);
  const composing = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  }, [text, interim]);

  useEffect(() => () => recRef.current?.abort(), []);

  const block = (e) => {
    e.preventDefault();
    toast(NO_PASTE_MSG);
  };

  const onBeforeInput = (e) => {
    if (BLOCKED_INPUT.has(e.nativeEvent?.inputType)) block(e);
  };

  const onKeyDown = (e) => {
    const k = e.key.toLowerCase();
    if (((e.metaKey || e.ctrlKey) && k === 'v') || (e.shiftKey && k === 'insert')) return block(e);
    if (e.key === 'Enter' && !e.shiftKey && !composing.current && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const onChange = (e) => {
    const next = e.target.value;
    // 한 번에 많은 글자가 들어오면(클립보드 키보드, 자동완성 등) 붙여넣기로 간주
    if (!composing.current && next.length - text.length > 24) {
      toast(NO_PASTE_MSG);
      return;
    }
    setText(next);
  };

  const toggleVoice = () => {
    if (!SR) return toast('이 브라우저는 음성 인식을 지원하지 않아요 (Chrome 권장)');
    if (listening) return recRef.current?.stop();
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (ev) => {
      let fin = '';
      let mid = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else mid += r[0].transcript;
      }
      if (fin) setText((t) => (t ? t.replace(/\s*$/, ' ') : '') + fin.trim());
      setInterim(mid);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed') toast('마이크 권한을 허용해 주세요');
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const submit = () => {
    const v = text.trim();
    if (!v || disabled) return;
    recRef.current?.stop();
    onSubmit(v);
    setText('');
  };

  return (
    <div className={`teach-input ${listening ? 'is-listening' : ''}`}>
      <textarea
        ref={ref}
        rows={1}
        value={listening && interim ? `${text}${text ? ' ' : ''}${interim}` : text}
        onChange={onChange}
        onPaste={block}
        onDrop={block}
        onDragOver={(e) => e.preventDefault()}
        onBeforeInput={onBeforeInput}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={() => (composing.current = false)}
        placeholder={listening ? '듣고 있어요… 천천히 말해 주세요' : placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        readOnly={listening}
        aria-label="후배에게 설명하기 (붙여넣기 불가)"
      />
      <div className="ti-row">
        <div className="ti-left">
          {leading}
        </div>
        <div className="ti-right">
          <button type="button" className={`icon-btn mic ${listening ? 'on' : ''}`} onClick={toggleVoice} aria-label="음성으로 설명하기">
            {listening ? <span className="wave"><i /><i /><i /><i /></span> : <MicIcon />}
          </button>
          <button type="button" className="send" onClick={submit} disabled={disabled || !text.trim()} aria-label="보내기">
            <SendIcon />
          </button>
        </div>
      </div>
      {footer}
    </div>
  );
}

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
