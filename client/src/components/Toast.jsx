import { useEffect, useState } from 'react';

let push;
let close;
/** toast(msg) 또는 toast(msg, { actions: [{ label, onClick, danger }] }) — actions가 있으면 누를 때까지 유지 */
export const toast = (msg, opts) => push?.(msg, opts);
export const confirmToast = (msg, { confirmLabel = '확인', danger = false } = {}) =>
  new Promise((resolve) =>
    toast(msg, {
      actions: [
        { label: '취소', onClick: () => resolve(false) },
        { label: confirmLabel, danger, onClick: () => resolve(true) },
      ],
      onDismiss: () => resolve(false),
    })
  );

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const remove = (id) => setItems((x) => x.filter((i) => i.id !== id));
    push = (msg, opts = {}) => {
      const id = Math.random();
      setItems((x) => {
        if (x.some((i) => i.msg === msg)) return x;
        // 확인 토스트가 뜨면 다른 토스트는 모두 정리하고 그 질문만 보여준다
        if (opts.actions) {
          x.forEach((i) => i.actions && i.onDismiss?.());
          return [{ id, msg, ...opts }];
        }
        return [...x.slice(-2), { id, msg, ...opts }];
      });
      if (!opts.actions) setTimeout(() => remove(id), 2600);
    };
    close = remove;
    return () => (push = close = null);
  }, []);
  const confirm = items.find((t) => t.actions);
  return (
    <>
      <div className="toasts" aria-live="polite">
        {items
          .filter((t) => !t.actions)
          .map((t) => (
            <div key={t.id} className="toast">
              <span>{t.msg}</span>
            </div>
          ))}
      </div>
      {/* 확인 토스트는 화면 가운데 — 상단 노트북 바로 아래에서 바로 보이도록 */}
      {confirm && (
        <div className="toasts toasts-center">
          <div className="toast has-actions" role="alertdialog" aria-label={confirm.msg}>
            <span>{confirm.msg}</span>
            <div className="toast-actions">
              {confirm.actions.map((a) => (
                <button
                  key={a.label}
                  className={`toast-btn ${a.danger ? 'danger' : ''}`}
                  onClick={() => {
                    close(confirm.id);
                    a.onClick?.();
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
