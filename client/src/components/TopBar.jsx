import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, copyText } from '../api.js';
import { useAuth } from '../App.jsx';
import { toast, confirmToast } from './Toast.jsx';
import NewNotebookSheet from './NewNotebookSheet.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export const ShelfIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="4" width="4" height="15" rx="1" />
    <rect x="8" y="6" width="4" height="13" rx="1" />
    <path d="m13.5 6.8 3.7-1 3.3 12.4-3.7 1z" />
    <path d="M2 21h20" />
  </svg>
);
const PenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M16.9 3.6a2 2 0 0 1 2.9 2.9L8 18.3 4 19.5l1.2-4z" />
    <path d="m14.5 6 3.5 3.5" />
  </svg>
);
const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12 5 5 9-10" />
  </svg>
);

/** 단색 노트북 표지 리스트 (가로 스크롤) — 표지에는 "학년-학기 과목"만 */
export function NotebookStrip({ notebooks, onOpen, activeId, onCreate, editing, selected, onToggle }) {
  return (
    <div className="nb-strip" role="list">
      {notebooks.map((n) => {
        const isSel = editing && selected?.has(n.subject);
        return (
          <button
            key={n.subject}
            role="listitem"
            className={`nb-card ${activeId && activeId !== n.subject ? 'dim' : ''} ${editing ? 'editing' : ''}`}
            style={{ '--nb': n.color }}
            onClick={() => (editing ? onToggle(n.subject) : onOpen(n))}
            aria-current={activeId === n.subject}
            aria-pressed={editing ? isSel : undefined}
          >
            {editing && <span className={`nb-select ${isSel ? 'on' : ''}`}>{isSel && <CheckIcon />}</span>}
            <span className="nb-label">{n.school?.split(' ')[0] || 'NOTEBOOK'}</span>
            <span className="nb-title">{n.term}</span>
          </button>
        );
      })}
      {onCreate && !editing && (
        <button className="nb-card nb-new" onClick={onCreate} aria-label="새 노트북 만들기">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="nb-new-label">새 노트북</span>
        </button>
      )}
    </div>
  );
}

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

/** backTo: 지정하면 좌측 상단(학생 화면의 노트북 아이콘 자리)에 뒤로 가기 버튼 */
export default function TopBar({ showShelf = true, backTo }) {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false); // 사진 주소가 만료·차단되면 이니셜로
  const [notebooks, setNotebooks] = useState(null);
  const [sheet, setSheet] = useState(null); // { mode: 'create' } | { mode: 'edit', notebook }
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const loadNotebooks = () => api('/student/notebooks').then((d) => setNotebooks(d.notebooks));

  useEffect(() => {
    if (open && user?.role === 'student') loadNotebooks();
    if (!open) exitEdit();
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const exitEdit = () => {
    setEditing(false);
    setSelected(new Set());
  };
  const toggleSel = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const changed = () => window.dispatchEvent(new Event('notebooks-changed'));

  // 펜: 삭제 모드로 전환 → 같은 자리의 버튼이 휴지통으로 바뀜
  const onTrash = async () => {
    if (selected.size === 0) return exitEdit(); // 아무것도 고르지 않고 누르면 삭제 모드 종료
    const names = notebooks.filter((n) => selected.has(n.subject)).map((n) => n.term);
    const ok = await confirmToast(`${names.length > 1 ? `노트북 ${names.length}개를` : `'${names[0]}' 노트북을`} 정말 삭제할까요? 대화 기록도 함께 삭제돼요`, { confirmLabel: '삭제', danger: true });
    if (!ok) return;
    try {
      const ids = [...selected];
      await api('/student/notebooks/delete', { method: 'POST', body: { ids } });
      toast('삭제했어요');
      exitEdit();
      loadNotebooks();
      changed();
      if (ids.some((id) => loc.pathname === `/notebook/${id}`)) nav('/');
    } catch (e) {
      toast(e.message);
    }
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    nav('/login');
  };

  return (
    <>
      <header className="topbar">
        <div className="tb-left">
          {backTo ? (
            <button className="icon-btn" onClick={() => nav(backTo)} aria-label="목록으로 돌아가기">
              <BackIcon />
            </button>
          ) : showShelf && user?.role === 'student' ? (
            <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="과목별 노트북 열기" aria-expanded={open}>
              <ShelfIcon />
            </button>
          ) : (
            <span />
          )}
        </div>
        <Link to="/" className="logo" onClick={() => setOpen(false)}>
          BaeBae
        </Link>
        <div className="tb-right">
          <ThemeToggle />
          <button className="avatar" onClick={() => setMenu((m) => !m)} aria-label="내 정보">
            {user?.avatarUrl && !avatarFailed ? (
              <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} />
            ) : (
              user?.name?.[0] || '?'
            )}
          </button>
          {menu && (
            <div className="menu">
              <div className="menu-name">
                {user.name}
                <small>{{ student: '학생', guardian: '부모님/선생님' }[user.role]}</small>
              </div>
              {user.role === 'student' && (
                <button
                  className="menu-code"
                  onClick={async () => {
                    const ok = await copyText(user.inviteCode);
                    toast(ok ? `연결 코드 ${user.inviteCode}를 복사했어요` : `복사하지 못했어요. 코드 ${user.inviteCode}를 직접 입력해 주세요`);
                  }}
                >
                  부모님·선생님 연결 코드
                  <b>{user.inviteCode}</b>
                </button>
              )}
              <button className="menu-item" onClick={logout}>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>
      {menu && <div className="menu-scrim" onClick={() => setMenu(false)} />}
      <div className={`shelf ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="shelf-inner">
          <div className="shelf-head">
            <div className="shelf-title">{editing ? `${selected.size}개 선택됨` : '나의 노트북'}</div>
            <div className="shelf-tools">
              {editing ? (
                <button className="icon-btn danger" onClick={onTrash} aria-label={selected.size ? '선택한 노트북 삭제' : '삭제 모드 끝내기'}>
                  <TrashIcon />
                </button>
              ) : (
                <button className="icon-btn" onClick={() => setEditing(true)} aria-label="노트북 삭제 모드">
                  <PenIcon />
                </button>
              )}
            </div>
          </div>
          {notebooks ? (
            <NotebookStrip
              notebooks={notebooks}
              onOpen={(n) => {
                setOpen(false);
                nav(`/notebook/${n.subject}`);
              }}
              onCreate={() => setSheet({ mode: 'create' })}
              editing={editing}
              selected={selected}
              onToggle={toggleSel}
            />
          ) : (
            <div className="shelf-loading">불러오는 중…</div>
          )}
        </div>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      {sheet && (
        <NewNotebookSheet
          onClose={() => setSheet(null)}
          onCreated={(nb) => {
            setSheet(null);
            setOpen(false);
            setNotebooks(null);
            changed();
            nav(`/notebook/${nb.id}`);
          }}
        />
      )}
    </>
  );
}
