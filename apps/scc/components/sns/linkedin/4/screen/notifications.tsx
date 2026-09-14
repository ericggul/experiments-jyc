"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./notifications.module.css";

type Filter = "All" | "Jobs" | "My posts" | "Mentions";

type NotificationRecord = {
  id: string;
  author: string;
  avatar: string;
  category: Filter;
  detail?: string;
  text: string;
  time: string;
  unread: boolean;
};

const initialNotifications: NotificationRecord[] = [
  { id: "francisco-isaac-reaction", author: "Francisco Martínez Domene and CHIA-JUNG (Isaac) LIANG", avatar: "francisco", category: "All", detail: "23 reactions", text: "reacted to a post: Good morning from a cool, cloudy Tokyo! ☁️ 涼しい東京の下町からおはようございます。　週末は、ゆっくりと心を洗いましょう。 Wishing you a fun, relaxing weekend! 😊", time: "9m", unread: true },
  { id: "seunghoon-business", author: "Seunghoon Lee", avatar: "seunghoon", category: "All", text: "posted: 미국에 진짜 비즈니스하러 오시는 분들께 드리는 이야기. 요즘 AI 기술이 발전하고 동시 통역 기술도 발전하면서, 'AI 시대 이후 요즘 영어 교육을 받고자 하는 수요가 감소하지 않았는지?' 의 질문을 종종 받는다.", time: "20m", unread: true },
  { id: "seunghoon-message", author: "Seunghoon Lee", avatar: "seunghoon", category: "All", text: "posted: 제한된 시간에 메세지 전달하기. 요즘 연사로 설 때도 있고, 누군가의 Speech 를 듣는 경우도 생긴다. 한 사람의 이야기를 시간 제약 없이 들을 수 있는 자리에서 솔직히 가장 많이 배우고, 또 나 역시 내가 시간 제약이 크게 없이 이야기 할 수 있는 환경에서 가장 솔직히 충실히 전달하는 듯하다.", time: "50m", unread: true },
  { id: "yoonsu-reaction", author: "신윤수", avatar: "shin", category: "All", detail: "31 reactions • 1 comment", text: "reacted to kiwoong yeom's post: 1M 토큰을 읽을 수 있다는 LLM이 많지만, 실제로는 이를 사용하기 힘듭니다. 모델 크기 이상의 메모리를 KV 캐시로 저장해야 하고, 내용이 길수록 중간에 적힌 내용을 잊는 문제(Context Rot)도 발생하죠.", time: "2h", unread: true },
  { id: "gshs-followers", author: "Gyeonggi Science High School for the Gifted", avatar: "school", category: "All", text: "gained 2 followers in week ending September 11", time: "6h", unread: true },
];

function MoreIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>;
}

function TrashIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4.5 7h15M9 4.5h6M7.5 7l.8 12h7.4l.8-12M10 10.5v5M14 10.5v5" /></svg>;
}

function SettingsIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm0-4.1v1.6m0 12v1.5m7.5-7.5h-1.6M6.1 12H4.5m12.8-5.3-1.1 1.1M7.8 16.2l-1.1 1.1m10.6 0-1.1-1.1M7.8 7.8 6.7 6.7" /></svg>;
}

function ChevronIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>;
}

export function Notifications({
  images = {},
  onOpen,
  onUnreadChange,
}: {
  images?: Record<string, string>;
  onOpen: (text: string) => void;
  onUnreadChange?: (n: number) => void;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [preferencesFor, setPreferencesFor] = useState<string | null>(null);
  const [preferenceEnabled, setPreferenceEnabled] = useState<Record<string, boolean>>({});
  const [deleted, setDeleted] = useState<{ index: number; notification: NotificationRecord } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => filter === "All" || notification.category === filter),
    [filter, notifications],
  );
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  useEffect(() => { onUnreadChange?.(unreadCount); }, [onUnreadChange, unreadCount]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) { setMenuFor(null); setPreferencesFor(null); }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") { setMenuFor(null); setPreferencesFor(null); }
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeMenu); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  function openNotification(notification: NotificationRecord) {
    setMenuFor(null);
    setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, unread: false } : item));
    onOpen(`${notification.author} ${notification.text}`);
  }

  function removeNotification(notification: NotificationRecord) {
    setDeleted({ index: notifications.findIndex((item) => item.id === notification.id), notification });
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    setMenuFor(null);
  }

  function showLess(notification: NotificationRecord) {
    removeNotification(notification);
  }

  function undo() {
    if (!deleted) return;
    setNotifications((current) => [...current.slice(0, deleted.index), deleted.notification, ...current.slice(deleted.index)]);
    setDeleted(null);
  }

  return <main className={styles.panel} aria-label="Notifications">
    <nav aria-label="Notification filters" className={styles.filters}>
      {(["All", "Jobs", "My posts", "Mentions"] as const).map((item) => <button aria-pressed={filter === item} className={filter === item ? styles.activeFilter : ""} key={item} onClick={() => setFilter(item)} type="button">{item}</button>)}
    </nav>

    <section className={styles.list} aria-live="polite">
      {visibleNotifications.map((notification) => <article className={`${styles.notification} ${notification.unread ? styles.unread : ""}`} key={notification.id}>
        {notification.unread ? <i aria-label="Unread" className={styles.unreadDot} /> : null}
        <button aria-label={`${notification.author} notification`} className={styles.notificationButton} onClick={() => openNotification(notification)} type="button">
          {images[notification.avatar] ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className={styles.avatar} src={images[notification.avatar]} />
          </> : <span aria-hidden="true" className={`${styles.avatar} ${styles[`avatar${notification.avatar}`] ?? ""}`}>{notification.author.slice(0, 1)}</span>}
          <span className={styles.copy}><span><strong>{notification.author}</strong> {notification.text}</span>{notification.detail ? <small>{notification.detail}</small> : null}</span>
        </button>
        <div className={styles.actions}><time>{notification.time}</time><button aria-expanded={menuFor === notification.id} aria-haspopup="menu" aria-label={`More options for ${notification.author}`} className={styles.moreButton} onClick={() => setMenuFor((current) => current === notification.id ? null : notification.id)} type="button"><MoreIcon /></button></div>
        {menuFor === notification.id ? <div className={styles.menu} ref={menuRef} role="menu">
          <button onClick={() => { setMenuFor(null); setPreferencesFor(notification.id); }} role="menuitem" type="button"><SettingsIcon /><span>Change notification preferences</span><ChevronIcon /></button>
          <button onClick={() => removeNotification(notification)} role="menuitem" type="button"><TrashIcon /><span>Delete notification</span></button>
          <button onClick={() => showLess(notification)} role="menuitem" type="button"><span className={styles.lessIcon}>⊘</span><span>Show less like this</span></button>
        </div> : null}
        {preferencesFor === notification.id ? <div className={styles.preferences} ref={menuRef} role="dialog" aria-label="Notification preferences">
          <strong>Notification preferences</strong><span>Updates like this</span>
          <button aria-pressed={preferenceEnabled[notification.id] !== false} className={preferenceEnabled[notification.id] !== false ? styles.toggleOn : ""} onClick={() => setPreferenceEnabled((current) => ({ ...current, [notification.id]: current[notification.id] === false }))} type="button"><i /><span>{preferenceEnabled[notification.id] !== false ? "On" : "Off"}</span></button>
        </div> : null}
      </article>)}
      {!visibleNotifications.length ? <div className={styles.empty}>No notifications in this filter.</div> : null}
    </section>
    {deleted ? <div aria-live="polite" className={styles.toast}><span>Notification deleted.</span><button onClick={undo} type="button">Undo</button></div> : null}
  </main>;
}
