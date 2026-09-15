'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apps, appNames, defaults, ranges, createPlan, type Settings, type App } from './settings';
import styles from './controller.module.css';
import { categories } from './catalog';

type Status = { enabled: boolean; running: boolean; message: string; settings?: Settings; progress: number; errors: { id: number; text: string }[]; lastAction?: App; elapsedMs?: number; targetMs?: number; pageCount?: number; windowCount?: number; title?: string; kind?: string };
const categoryNames = { companies: '기업·플랫폼', startups: '서비스', 'multilingual-wiki': '다국어 위키', news: '뉴스', 'google-search': 'Google 검색' };
const controls = [['interval', '동작 간격', '초'], ['steps', '동작 횟수', '회'], ['revisit', '기존 탭 재방문 비율', '%'], ['countdown', '시작 전 대기', '초'], ['pageLimit', '남겨둘 페이지 상한', '개'], ['windowCount', '창 상한', '개'], ['birth', '새 창 비율 · 나머지는 새 탭', '%'], ['scroll', '스크롤 확률', '%'], ['slack', 'Slack 끼어들기 확률', '%'], ['jitter', '몰아침·불규칙성', '%'], ['movingWindows', '최근 이동할 창', '개'], ['movement', '이동 진폭', '%'], ['period', '이동 주기', '초'], ['size', '기준 창 크기', '%'], ['spread', '크기·비율 차이', '%'], ['breath', '크기 맥동', '%']] as const;
export default function DesktopController() {
  const [draft, setDraft] = useState<Settings>({ ...defaults, apps: [...defaults.apps] });
  const [status, setStatus] = useState<Status>({ enabled: false, running: false, message: '연결 중…', progress: 0, errors: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestActive = useRef(false);
  const plan = useMemo(() => draft.categories.length ? createPlan(draft) : [], [draft]);
  const duration = plan.slice(0, -1).reduce((total, step) => total + step.intervalMs, 0) / 1000;
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (requestActive.current) return;
        const response = await fetch('/api/desktop/0915/3', { cache: 'no-store', signal: abort.signal });
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
    const snapshot = { ...draft, apps: [...draft.apps], categories: [...draft.categories], displayWidth: Math.max(640, Math.min(7680, window.screen.availWidth)), displayHeight: Math.max(480, Math.min(4320, window.screen.availHeight)) };
    try {
      const response = await fetch('/api/desktop/0915/3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, settings: snapshot }) });
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
    <header className={styles.header}><a href="/desktop/0915">← Desktop / 0915</a><span>3 · return and interrupt</span></header>
    <div className={styles.layout}>
      <section className={styles.settings} aria-label="다음 실행 설정">
        <h1>Return and interrupt</h1><p className={styles.intro}>새 창·새 탭을 열다가, 이전에 열린 탭을 무작위로 다시 봅니다. 오래된 것은 닫히고 최근의 창들이 흘러갑니다. 터미널도 매 동작 10% 확률로 열거나 전면에 가져옵니다. 수정한 값은 실행을 누를 때 적용됩니다.</p>
        <fieldset className={styles.apps}><legend>브라우저 + 끼어들기</legend>{apps.map(app => <label key={app}><input type="checkbox" disabled={app === 'chrome'} checked={draft.apps.includes(app)} onChange={() => setDraft(current => ({ ...current, apps: apps.filter(item => item === app ? !current.apps.includes(item) : current.apps.includes(item)) }))} />{appNames[app]}</label>)}</fieldset>
        <fieldset className={styles.apps}><legend>새 페이지의 종류</legend>{categories.map(category => <label key={category}><input type="checkbox" checked={draft.categories.includes(category)} onChange={() => setDraft(current => ({ ...current, categories: categories.filter(item => item === category ? !current.categories.includes(item) : current.categories.includes(item)) }))} />{categoryNames[category]}</label>)}</fieldset>
        <div className={styles.fields}>{controls.map(([key, label, unit]) => <div className={styles.field} key={key}>
          <label htmlFor={`number-${key}`}>{label}</label><div className={styles.value}><input id={`number-${key}`} type="number" min={ranges[key][0]} max={ranges[key][1]} step={ranges[key][2]} value={draft[key]} onChange={e => update(key, e.target.value)} /><span>{unit}</span></div>
          <input aria-label={`${label} 슬라이더`} type="range" min={ranges[key][0]} max={ranges[key][1]} step={ranges[key][2]} value={draft[key]} onChange={e => update(key, e.target.value)} />
        </div>)}</div>
        <p className={styles.hint}>탭+창의 페이지 수를 합산합니다. 이 서버 세션의 3버전이 만든 탭만 오래된 순서로 닫습니다. 50개는 안전 보장이 아닌 최대 설정값입니다. 부하가 커지면 간격을 늘리고 이동을 생략합니다.</p>
        <div className={styles.order}><label>패턴 번호<input type="number" min="1" max="999999" value={draft.seed} onChange={e => update('seed', e.target.value)} /></label></div>
        <p className={styles.hint}>같은 설정은 같은 동작 계획을 만듭니다. 첫 3회는 생성하고, 재방문은 직전 탭을 제외합니다. 대상이 없으면 새 페이지를 엽니다.</p>
      </section>
      <section className={styles.run} aria-label="실행">
        <h2>다음 실행</h2><div className={styles.summary}><strong>{draft.pageLimit}<small>페이지까지</small></strong><span>{draft.interval.toFixed(1)}초 기준 · {draft.steps}회<br />기본 순서 {duration.toFixed(1)}초 · 실제 부하에 따라 연장</span></div>
        <ol className={styles.sequence} aria-label="첫 8회 동작 계획">{plan.slice(0, 8).map(step => <li key={step.id}><span>{step.revisit ? '이전에 열린 탭' : step.page.title}</span><span>{step.revisit ? '재방문' : step.birth ? '새 창' : '새 탭'} · {(step.intervalMs / 1000).toFixed(2)}초</span></li>)}</ol>
        <button className={styles.start} disabled={busy || !status.enabled || (!status.running && !draft.categories.length)} onClick={() => void act(status.running ? 'stop' : 'start')}>{status.running ? '중단 ■' : '이 설정으로 실행 ↗'}</button>
        <button className={styles.reset} disabled={busy} onClick={() => setDraft({ ...defaults, apps: [...defaults.apps] })}>설정 초기화</button>
        <p role="status" aria-live="polite" className={styles.status}>{error || status.message}</p>
        {status.pageCount !== undefined && <p>{status.pageCount}페이지 · {status.windowCount}창<br />{status.title} {status.kind === 'revisit' ? '· 재방문' : status.kind === 'tab' ? '· 새 탭' : status.kind === 'window' ? '· 새 창' : ''}</p>}
        <p className={styles.hint}>스크롤은 선택한 실험 탭이 전면일 때만 Page Up/Down으로 시도합니다. 로딩·접근성 권한에 따라 생략될 수 있습니다. 댓글 입력·공개 전송은 아직 포함하지 않았습니다.</p>
        {status.settings && <div className={styles.applied}><h2>{status.running ? '현재 실행에 적용된 값' : '마지막 실행'}</h2><p>{status.settings.interval}초 · {status.settings.steps}회 · {status.settings.order === 'cycle' ? '차례대로' : '무작위'} · 패턴 {status.settings.seed}</p><p>대기 {status.settings.countdown}초 · 불규칙성 {status.settings.jitter}%<br />이동 {status.settings.movement}% · 크기 {status.settings.size}%</p><p>{status.settings.apps.map(app => appNames[app]).join(' · ')}</p><p>{status.progress} / {status.settings.steps}{status.lastAction ? ` · ${appNames[status.lastAction]}` : ''}</p>{status.elapsedMs !== undefined && <p>마지막 명령 처리 {status.elapsedMs}ms / 목표 간격 {status.targetMs}ms</p>}</div>}
        {!!status.errors?.length && <div className={styles.errors} role="alert">{status.errors.map(item => <p key={item.id}>{item.text}</p>)}</div>}
      </section>
    </div>
  </main>;
}
