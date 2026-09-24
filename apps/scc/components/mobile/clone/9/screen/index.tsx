'use client';

/* eslint-disable @next/next/no-img-element -- Standalone visual study uses remote illustrative photographs without Next image configuration. */

import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { accountReducer, activities, bookingProblem, dateLabel, dates, initialAccount, sessions, studioFor, studios, timeLabel, type Activity, type Session } from '../model/data';
import s from './rep.module.css';

type IconName = 'search' | 'heart' | 'calendar' | 'close' | 'left' | 'right' | 'filter' | 'check';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    heart: <path d="M20.8 5.7a5.3 5.3 0 0 0-7.5 0L12 7l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 22l8.8-8.8a5.3 5.3 0 0 0 0-7.5Z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h3m3 0h3" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    left: <path d="m15 5-7 7 7 7" />,
    right: <path d="m9 5 7 7-7 7" />,
    filter: <><path d="M4 7h16M4 17h16" /><circle cx="8" cy="7" r="2" fill="white" /><circle cx="16" cy="17" r="2" fill="white" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog className={s.sheet} ref={ref} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <header className={s.sheetHeader}><h2>{title}</h2><button onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
    {children}
  </dialog>;
}

export default function Rep() {
  const [tab, setTab] = useState<'search' | 'saved' | 'bookings'>('search');
  const [date, setDate] = useState(dates[0]);
  const [query, setQuery] = useState('');
  const [activity, setActivity] = useState<Activity>('All workouts');
  const [period, setPeriod] = useState('Any time');
  const [area, setArea] = useState('All neighborhoods');
  const [saved, setSaved] = useState<string[]>([]);
  const [account, dispatch] = useReducer(accountReducer, initialAccount);
  const [selected, setSelected] = useState<Session | null>(null);
  const [step, setStep] = useState<'detail' | 'confirm' | 'cancel'>('detail');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const dateIndex = dates.indexOf(date);
  const week = Math.floor(dateIndex / 7);
  const activeStudio = selected ? studioFor(selected) : null;
  const booked = selected ? account.booked.includes(selected.id) : false;
  const problem = selected ? bookingProblem(account, selected) : null;
  const filtersCount = Number(activity !== 'All workouts') + Number(period !== 'Any time') + Number(area !== 'All neighborhoods');
  const matches = sessions.filter(session => {
    const studio = studioFor(session);
    return session.date === date && (activity === 'All workouts' || studio.activity === activity)
      && (area === 'All neighborhoods' || studio.area === area)
      && (period === 'Any time' || (period === 'Morning' ? session.start < 720 : period === 'Afternoon' ? session.start >= 720 && session.start < 1020 : session.start >= 1020))
      && `${studio.name} ${studio.area} ${session.name} ${session.instructor}`.toLowerCase().includes(query.toLowerCase());
  });
  const open = (session: Session) => { setSelected(session); setStep('detail'); };
  const toggleSave = (id: string) => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const resetFilters = () => { setQuery(''); setActivity('All workouts'); setPeriod('Any time'); setArea('All neighborhoods'); };

  function classRow(session: Session, showDate = false) {
    const studio = studioFor(session);
    const reserved = account.booked.includes(session.id);
    return <button key={session.id} className={s.classRow} onClick={() => open(session)}>
      <span className={s.time}><strong>{timeLabel(session.start).split(' ')[0]}<small>{timeLabel(session.start).split(' ')[1]}</small></strong><span>{session.duration} min</span></span>
      <span className={s.classInfo}>{showDate && <span className={s.bookingDate}>{dateLabel(session.date)}</span>}<strong>{session.name}</strong><span>{studio.name}</span><span className={s.neighborhood}>{studio.area} · {session.instructor}</span><span className={s.rating}>★ {studio.rating} <span>({studio.reviews})</span>{reserved && <em>Booked</em>}</span></span>
      <span className={s.cost}><b>{session.credits}</b><small>credits</small></span>
    </button>;
  }

  return <div className={s.stage} lang="en-US"><div className={s.app}>
    <header className={s.header}><span className={s.wordmark}>rep<span>.</span></span><button className={s.creditBalance} onClick={() => setCreditsOpen(true)}><b>{account.credits}</b> credits <Icon name="right" /></button></header>
    <main>
      {tab === 'search' && <>
        <div className={s.location}><h1>Find your next class</h1><button onClick={() => setFiltersOpen(true)}>New York, NY <span>⌄</span></button></div>
        <div className={s.searchBar}><label><Icon name="search" /><input aria-label="Search classes, studios, neighborhoods, or instructors" placeholder="Search studios or workouts" value={query} onChange={event => setQuery(event.target.value)} /></label><button className={s.filterButton} aria-label={`Filters${filtersCount ? `, ${filtersCount} active` : ''}`} onClick={() => setFiltersOpen(true)}><Icon name="filter" />{filtersCount > 0 && <span>{filtersCount}</span>}</button></div>
        <div className={s.activities} aria-label="Workout type">{activities.map(item => <button key={item} aria-pressed={activity === item} onClick={() => setActivity(item)}>{item}</button>)}</div>
        <section className={s.dates} aria-label="Class date">
          <div className={s.monthRow}><strong>{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><span><button aria-label="Previous week" disabled={week === 0} onClick={() => setDate(dates[dateIndex - 7])}><Icon name="left" /></button><button aria-label="Next week" disabled={week === 1} onClick={() => setDate(dates[dateIndex + 7])}><Icon name="right" /></button><label className={s.datePicker}><Icon name="calendar" /><input type="date" aria-label="Choose date" min={dates[0]} max={dates.at(-1)} value={date} onChange={event => { if (dates.includes(event.target.value)) setDate(event.target.value); }} /></label></span></div>
          <div className={s.week}>{dates.slice(week * 7, week * 7 + 7).map(day => <button key={day} aria-pressed={date === day} aria-label={dateLabel(day, true)} onClick={() => setDate(day)}><span>{new Date(`${day}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}</span><b>{Number(day.slice(-2))}</b></button>)}</div>
        </section>
        <div className={s.resultsHeading}><h2>{dateLabel(date, true)}</h2><span>{matches.length} classes</span></div>
        {matches.length ? <div className={s.classList}>{matches.map(session => classRow(session))}</div> : <div className={s.empty}><h2>No classes match</h2><p>Try another workout or clear your filters.</p><button className={s.primary} onClick={resetFilters}>Clear filters</button></div>}
        <p className={s.sampleRange}>Sample schedule · Sep 23–Oct 6, 2026</p>
      </>}

      {tab === 'saved' && <section className={s.secondary}><h1>Saved studios</h1><p className={s.subtitle}>Studios you’ve saved</p>{saved.length ? studios.filter(studio => saved.includes(studio.id)).map(studio => <article key={studio.id} className={s.savedStudio}>{studio.activity !== 'Cycling' && <img src={`https://images.unsplash.com/${studio.photo}?auto=format&fit=crop&w=640&q=80`} alt={studio.alt} />}<div><h2>{studio.name}</h2><p>{studio.area} · {studio.activity}</p><button className={s.textButton} onClick={() => { resetFilters(); setQuery(studio.name); setTab('search'); }}>See classes <Icon name="right" /></button></div><button className={s.saveButton} aria-label={`Unsave ${studio.name}`} aria-pressed="true" onClick={() => toggleSave(studio.id)}><Icon name="heart" /></button></article>) : <div className={s.empty}><Icon name="heart" /><h2>Find a new favorite</h2><p>Tap the heart on a class to save its studio.</p><button className={s.primary} onClick={() => setTab('search')}>Explore classes</button></div>}</section>}

      {tab === 'bookings' && <section className={s.secondary}><h1>Your classes</h1><p className={s.subtitle}>Upcoming · {account.booked.length} {account.booked.length === 1 ? 'reservation' : 'reservations'}</p>{account.booked.length ? sessions.filter(session => account.booked.includes(session.id)).map(session => classRow(session, true)) : <div className={s.empty}><Icon name="calendar" /><h2>No upcoming classes</h2><p>Your reservations will appear here.</p><button className={s.primary} onClick={() => setTab('search')}>Find a class</button></div>}</section>}
    </main>
    <nav className={s.nav} aria-label="Main navigation">{([{ id: 'search', label: 'Explore', icon: 'search' }, { id: 'saved', label: 'Saved', icon: 'heart' }, { id: 'bookings', label: 'Bookings', icon: 'calendar' }] as const).map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} onClick={() => setTab(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
    <span className={s.srOnly} role="status">{account.message}</span>

    {filtersOpen && <Sheet title="Narrow it down" onClose={() => setFiltersOpen(false)}><div className={s.sheetBody}><label className={s.field}>Neighborhood<select value={area} onChange={event => setArea(event.target.value)}>{['All neighborhoods', ...studios.map(studio => studio.area)].map(item => <option key={item}>{item}</option>)}</select></label><label className={s.field}>Workout<select value={activity} onChange={event => setActivity(event.target.value as Activity)}>{activities.map(item => <option key={item}>{item}</option>)}</select></label><label className={s.field}>Time of day<select value={period} onChange={event => setPeriod(event.target.value)}>{['Any time', 'Morning', 'Afternoon', 'Evening'].map(item => <option key={item}>{item}</option>)}</select></label><p className={s.finePrint}>Morning before noon · Afternoon noon–5 PM · Evening after 5 PM. All times Eastern.</p><button className={s.primary} onClick={() => setFiltersOpen(false)}>Show {matches.length} classes</button><button className={s.textButton} onClick={resetFilters}>Reset filters</button></div></Sheet>}

    {creditsOpen && <Sheet title="Your credits" onClose={() => setCreditsOpen(false)}><div className={s.sheetBody}><p className={s.balance}>{account.credits}<span>credits available</span></p><p>You started with 30 credits. Use them to try a class, or save them for your next one.</p><dl className={s.facts}><div><dt>Credits in reservations</dt><dd>{30 - account.credits}</dd></div><div><dt>Reservations</dt><dd>{account.booked.length}</dd></div></dl><p className={s.finePrint}>This is a local demo. Credits have no cash value. Your balance and reservations reset when you reload. No payment is taken.</p><button className={s.primary} onClick={() => { setCreditsOpen(false); setTab('bookings'); }}>View bookings</button></div></Sheet>}

    {selected && activeStudio && <Sheet title={step === 'cancel' ? 'Cancel this class?' : booked ? 'Your reservation' : step === 'confirm' ? 'Review your reservation' : activeStudio.name} onClose={() => setSelected(null)}>
      {step === 'detail' && activeStudio.activity !== 'Cycling' && <div className={s.detailImage}><img src={`https://images.unsplash.com/${activeStudio.photo}?auto=format&fit=crop&w=900&q=85`} alt={activeStudio.alt} /><button className={s.saveButton} aria-label={`${saved.includes(activeStudio.id) ? 'Unsave' : 'Save'} ${activeStudio.name}`} aria-pressed={saved.includes(activeStudio.id)} onClick={() => toggleSave(activeStudio.id)}><Icon name="heart" /></button></div>}
      <div className={s.sheetBody}>
        {booked && step !== 'cancel' && <p className={s.confirmed}><Icon name="check" /> You’re on the list</p>}
        <div>{activeStudio.activity === 'Cycling' && step === 'detail' && <button className={s.textButton} aria-pressed={saved.includes(activeStudio.id)} onClick={() => toggleSave(activeStudio.id)}><Icon name="heart" />{saved.includes(activeStudio.id) ? 'Saved studio' : 'Save studio'}</button>}<p className={s.detailCategory}>{activeStudio.activity} · {activeStudio.area}</p><h2 className={s.classTitle}>{selected.name}</h2><p>{activeStudio.name}</p></div>
        <dl className={s.facts}><div><dt>When</dt><dd>{dateLabel(selected.date)}<br />{timeLabel(selected.start)}–{timeLabel(selected.start + selected.duration)} ET</dd></div><div><dt>Instructor</dt><dd>{selected.instructor}</dd></div><div><dt>Where</dt><dd>{activeStudio.address}</dd></div></dl>
        {step === 'detail' && <><p>{activeStudio.description}</p><div><h3>Before you go</h3><p>{activeStudio.bring}</p></div>{!booked && <p className={s.spots}>{selected.spots} spots in this sample class</p>}</>}
        {step === 'confirm' && !booked && <dl className={s.facts}><div><dt>This class</dt><dd>{selected.credits} credits</dd></div><div><dt>Balance after booking</dt><dd>{account.credits - selected.credits} credits</dd></div></dl>}
        {step === 'cancel' && <p>Your spot will be released and {selected.credits} credits returned to your demo balance.</p>}
        {!booked && problem && <p role="alert" className={s.error}>{problem}</p>}
        <p className={s.finePrint}>Fictional studios and sample classes. This reservation stays in this page session. No studio is contacted. Demo cancellations return all credits.</p>
        {step === 'cancel' ? <><button className={s.primary} onClick={() => { dispatch({ type: 'cancel', id: selected.id }); setSelected(null); }}>Cancel class · return {selected.credits} credits</button><button className={s.textButton} onClick={() => setStep('detail')}>Keep my spot</button></> : booked ? <><button className={s.primary} onClick={() => { setSelected(null); setTab('bookings'); }}>View my bookings</button><button className={s.textButton} onClick={() => setStep('cancel')}>Cancel reservation</button></> : <button className={s.primary} disabled={Boolean(problem)} onClick={() => { if (step === 'confirm') dispatch({ type: 'book', id: selected.id }); else setStep('confirm'); }}>{step === 'confirm' ? 'Confirm reservation' : `Reserve · ${selected.credits} credits`}</button>}
      </div>
    </Sheet>}
  </div></div>;
}
