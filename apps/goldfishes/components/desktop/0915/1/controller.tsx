'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apps, appNames, defaults, ranges, createPlan, type Settings, type App } from './settings';
import styles from './controller.module.css';

type Status = { enabled: boolean; running: boolean; message: string; settings?: Settings; progress: number; errors: { id: number; text: string }[]; lastAction?: App; elapsedMs?: number; targetMs?: number };
const controls = [['interval', '전환 간격', '초'], ['steps', '전환 횟수', '회'], ['countdown', '시작 전 대기', '초'], ['jitter', '간격 불규칙성', '%'], ['movement', '창 이동 범위', '%'], ['size', '창 크기', '%']] as const;
export default function DesktopController() {
  const [draft, setDraft] = useState<Settings>({ ...defaults, apps: [...defaults.apps] });
  const [status, setStatus] = useState<Status>({ enabled: false, running: false, message: '연결 중…', progress: 0, errors: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestActive = useRef(false);
  const plan = useMemo(() => draft.apps.length ? createPlan(draft) : [], [draft]);
  const duration = plan.slice(0, -1).reduce((total, step) => total + step.intervalMs, 0) / 1000;
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (requestActive.current) return;
        const response = await fetch('/api/desktop/0915/1', { cache: 'no-store', signal: abort.signal });
        const next = await response.json();
        if (!response.ok) throw new Error(next.message);
        if (!requestActive.current) setStatus(next);
      } catch (reason) {
        if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : '연결할 수 없습니다.');
      } finally { if (!abort.signal.aborted) timer = setTimeout(poll, 500); }
    }
    void poll();
    return () => { abort.abort(); clearTimeout(timer); };
  }, []);
  async function act(action: 'start' | 'stop') {
    if (requestActive.current) return;
    requestActive.current = true; setBusy(true); setError('');
    const snapshot = { ...draft, apps: [...draft.apps] };
    try {
      const response = await fetch('/api/desktop/0915/1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, settings: snapshot }) });
      const next = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(next.message || '실행할 수 없습니다.');
      setStatus(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '실행할 수 없습니다.'); }
    finally { requestActive.current = false; setBusy(false); }
  }
  const update = (key: keyof typeof ranges, value: string) => {
    const n = Number(value); const [min, max] = ranges[key];
    if (Number.isFinite(n)) setDraft(current => ({ ...current, [key]: Math.min(max, Math.max(min, key === 'interval' ? n : Math.round(n))) }));
  };
  return <main className={styles.page}>
    <header className={styles.header}><a href="/">← Goldfishes</a><span>Desktop</span></header>
    <div className={styles.layout}>
      <section className={styles.settings} aria-label="다음 실행 설정">
        <h1>Behaviour</h1><p className={styles.intro}>조절하고 실행하세요. 실행 중 수정한 값은 다음 실행에 적용됩니다.</p>
        <fieldset className={styles.apps}><legend>열어둘 앱</legend>{apps.map(app => <label key={app}><input type="checkbox" checked={draft.apps.includes(app)} onChange={() => setDraft(current => ({ ...current, apps: apps.filter(item => item === app ? !current.apps.includes(item) : current.apps.includes(item)) }))} />{appNames[app]}</label>)}</fieldset>
        <div className={styles.fields}>{controls.map(([key, label, unit]) => <div className={styles.field} key={key}>
          <label htmlFor={`number-${key}`}>{label}</label><div className={styles.value}><input id={`number-${key}`} type="number" min={ranges[key][0]} max={ranges[key][1]} step={ranges[key][2]} value={draft[key]} onChange={e => update(key, e.target.value)} /><span>{unit}</span></div>
          <input aria-label={`${label} 슬라이더`} type="range" min={ranges[key][0]} max={ranges[key][1]} step={ranges[key][2]} value={draft[key]} onChange={e => update(key, e.target.value)} />
        </div>)}</div>
        <p className={styles.hint}>창 크기·이동은 Chrome과 Terminal에 적용됩니다.</p>
        <div className={styles.order}><label>전환 순서<select value={draft.order} onChange={e => setDraft(current => ({ ...current, order: e.target.value as Settings['order'] }))}><option value="cycle">차례대로</option><option value="random">무작위 · 연속 중복 없음</option></select></label><label>패턴 번호<input type="number" min="1" max="999999" value={draft.seed} onChange={e => update('seed', e.target.value)} /></label></div>
        <p className={styles.hint}>같은 설정과 패턴 번호는 같은 순서를 만듭니다.</p>
      </section>
      <section className={styles.run} aria-label="실행">
        <h2>다음 실행</h2><div className={styles.summary}><strong>{draft.interval.toFixed(1)}<small>초</small></strong><span>{draft.steps}회 전환<br />약 {duration.toFixed(1)}초 + 준비 시간</span></div>
        <ol className={styles.sequence} aria-label="첫 8회 전환 미리보기">{plan.slice(0, 8).map(step => <li key={step.id}><span>{appNames[step.app]}</span><span>{(step.intervalMs / 1000).toFixed(2)}초</span></li>)}</ol>
        <button className={styles.start} disabled={busy || !status.enabled || (!status.running && !draft.apps.length)} onClick={() => void act(status.running ? 'stop' : 'start')}>{status.running ? '중단 ■' : '이 설정으로 실행 ↗'}</button>
        <button className={styles.reset} disabled={busy} onClick={() => setDraft({ ...defaults, apps: [...defaults.apps] })}>설정 초기화</button>
        <p role="status" aria-live="polite" className={styles.status}>{error || status.message}</p>
        {status.settings && <div className={styles.applied}><h2>{status.running ? '현재 실행에 적용된 값' : '마지막 실행'}</h2><p>{status.settings.interval}초 · {status.settings.steps}회 · {status.settings.order === 'cycle' ? '차례대로' : '무작위'} · 패턴 {status.settings.seed}</p><p>대기 {status.settings.countdown}초 · 불규칙성 {status.settings.jitter}%<br />이동 {status.settings.movement}% · 크기 {status.settings.size}%</p><p>{status.settings.apps.map(app => appNames[app]).join(' · ')}</p><p>{status.progress} / {status.settings.steps}{status.lastAction ? ` · ${appNames[status.lastAction]}` : ''}</p>{status.elapsedMs !== undefined && <p>마지막 명령 처리 {status.elapsedMs}ms / 목표 간격 {status.targetMs}ms</p>}</div>}
        {!!status.errors?.length && <div className={styles.errors} role="alert">{status.errors.map(item => <p key={item.id}>{item.text}</p>)}</div>}
      </section>
    </div>
  </main>;
}
