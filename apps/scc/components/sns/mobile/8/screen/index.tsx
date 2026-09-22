'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  afterArrival, clock, dateLabel, duration, gbp, initialSearch, journeyOptions,
  selectionPrice, station, stations, ticketTotal,
  type Journey, type Search, type Selection, type StationId, type Ticket,
} from '../model/data';
import s from './platform.module.css';

type IconName = 'rail' | 'search' | 'ticket' | 'back' | 'close' | 'swap' | 'arrow' | 'person';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    rail: <><rect x="5" y="3" width="14" height="15" rx="4" /><path d="M5 11h14M9 3v8M15 3v8M8 21l2-3m6 3-2-3M8 15h1m6 0h1" /></>,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></>,
    ticket: <><path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Z" /><path d="M15 7v2m0 2v2m0 2v2" /></>,
    back: <path d="m14 5-7 7 7 7" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    swap: <><path d="M8 3v17m-4-4 4 4 4-4M16 21V4m-4 4 4-4 4 4" /></>,
    arrow: <path d="M4 12h16m-5-5 5 5-5 5" />,
    person: <><circle cx="12" cy="7" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={s.dialog} aria-label={title} onCancel={onClose}>
    <header><h2>{title}</h2><button aria-label="Close" onClick={onClose}><Icon name="close" /></button></header>{children}
  </dialog>;
}
function Route({ journey }: { journey: Journey }) {
  return <div className={s.route}>
    <div><strong>{clock(journey.departure)}</strong><span>{station(journey.from).name}</span></div>
    <p>{journey.operator}<br />{duration(journey.minutes)} · {journey.changes ? '1 change' : 'Direct'}</p>
    <div><strong>{clock(journey.arrival)}{journey.arrival >= 1440 && <small> +1 day</small>}</strong><span>{station(journey.to).name}</span></div>
  </div>;
}

export default function Platform() {
  const [search, setSearch] = useState<Search>(initialSearch);
  const [view, setView] = useState<'search' | 'results' | 'checkout' | 'tickets'>('search');
  const [returning, setReturning] = useState(false);
  const [outbound, setOutbound] = useState<Selection | null>(null);
  const [inbound, setInbound] = useState<Selection | null>(null);
  const [selected, setSelected] = useState<Journey | null>(null);
  const [flexible, setFlexible] = useState(false);
  const [stationField, setStationField] = useState<'from' | 'to' | null>(null);
  const [query, setQuery] = useState('');
  const [passengersOpen, setPassengersOpen] = useState(false);
  const [sort, setSort] = useState('departure');
  const [directOnly, setDirectOnly] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const activeTicket = tickets.find(ticket => ticket.id === ticketId);
  const total = outbound ? ticketTotal(outbound, inbound, search.adults, search.railcard) : 0;
  const options = journeyOptions(search, returning)
    .filter(journey => (!directOnly || !journey.changes) && (!returning || !outbound || afterArrival(outbound.journey, journey)))
    .sort((a, b) => sort === 'price' ? a.price - b.price : sort === 'duration' ? a.minutes - b.minutes : a.departure - b.departure);
  const updateSearch = (patch: Partial<Search>) => { setSearch(current => ({ ...current, ...patch })); setError(''); };
  function chooseJourney() {
    if (!selected) return;
    const choice = { journey: selected, flexible };
    if (returning) { setInbound(choice); setView('checkout'); }
    else { setOutbound(choice); setInbound(null); if (search.returnTrip) setReturning(true); else setView('checkout'); }
    setSelected(null); setAccepted(false);
  }
  function resetSearch() { setView('search'); setTicketId(null); setNotice(''); }
  function buy() {
    if (!outbound || !accepted || (search.returnTrip && !inbound)) return;
    const ticket: Ticket = { id: crypto.randomUUID(), outbound, inbound, adults: search.adults, railcard: search.railcard, total, cancelled: false };
    setTickets(current => [ticket, ...current]); setTicketId(ticket.id); setView('tickets');
    setNotice('Your sample booking is in My tickets. No payment has been taken.');
  }

  return <main className={s.outer} lang="en-GB"><div className={s.app}>
    <header className={s.header}>
      <div className={s.brand}><Icon name="rail" /><span>PLATFORM</span></div>
      <span className={s.headerNote}>Trains & tickets</span>
    </header>
    {view === 'search' && <>
      <div className={s.searchHead}><h1>Where are you heading?</h1><div className={s.stationBox}>
        <button onClick={() => { setStationField('from'); setQuery(''); }}><small>From</small><strong>{station(search.from).name}</strong></button>
        <button onClick={() => { setStationField('to'); setQuery(''); }}><small>To</small><strong>{station(search.to).name}</strong></button>
        <button className={s.swap} aria-label="Swap departure and destination" onClick={() => updateSearch({ from: search.to, to: search.from })}><Icon name="swap" /></button>
      </div></div>
      <form className={s.searchForm} onSubmit={event => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const next = { ...search, date: String(fields.get('date')), time: String(fields.get('time')), returnDate: String(fields.get('returnDate') || search.returnDate), returnTime: String(fields.get('returnTime') || search.returnTime) };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date) || !/^\d{2}:\d{2}$/.test(next.time) || (next.returnTrip && (!/^\d{4}-\d{2}-\d{2}$/.test(next.returnDate) || !/^\d{2}:\d{2}$/.test(next.returnTime)))) { setError('Choose a date and time for each journey.'); return; }
        if (next.from === next.to) { setError('Choose two different stations.'); return; }
        if (next.returnTrip && `${next.returnDate}T${next.returnTime}` <= `${next.date}T${next.time}`) { setError('Your return must be after your outward journey.'); return; }
        setSearch(next); setReturning(false); setOutbound(null); setInbound(null); setView('results'); setError(''); setNotice('');
      }}>
        <div className={s.tripType} role="group" aria-label="Journey type">
          <button type="button" aria-pressed={!search.returnTrip} onClick={() => updateSearch({ returnTrip: false })}>Single</button>
          <button type="button" aria-pressed={search.returnTrip} onClick={() => updateSearch({ returnTrip: true })}>Return</button>
        </div>
        <div className={s.dateRow}><div><b>Out</b><span>Depart after</span></div><label><span className={s.srOnly}>Outward date</span><input type="date" name="date" required value={search.date} onChange={event => updateSearch({ date: event.target.value })} /></label><label><span className={s.srOnly}>Outward time</span><input type="time" name="time" required value={search.time} onChange={event => updateSearch({ time: event.target.value })} /></label></div>
        {search.returnTrip && <div className={s.dateRow}><div><b>Back</b><span>Depart after</span></div><label><span className={s.srOnly}>Return date</span><input type="date" name="returnDate" required min={search.date} value={search.returnDate} onChange={event => updateSearch({ returnDate: event.target.value })} /></label><label><span className={s.srOnly}>Return time</span><input type="time" name="returnTime" required value={search.returnTime} onChange={event => updateSearch({ returnTime: event.target.value })} /></label></div>}
        <button type="button" className={s.passengers} onClick={() => setPassengersOpen(true)}><Icon name="person" /><span><strong>{search.adults} adult{search.adults > 1 ? 's' : ''}</strong><small>{search.railcard ? '1 × 26–30 Railcard' : 'Add a Railcard'}</small></span><span aria-hidden="true">›</span></button>
        {error && <p className={s.error} role="alert">{error}</p>}
        <button className={s.primary} type="submit">Find times & prices <Icon name="arrow" /></button>
        <p className={s.searchFoot}>All times shown in UK local time</p>
      </form>
      <section className={s.recent}><h2>Popular on the East Coast</h2>{stations.filter(item => item.id !== 'KGX').map(item => <button key={item.id} onClick={() => updateSearch({ from: 'KGX', to: item.id })}><Icon name="rail" /><span>London <span aria-hidden="true">→</span> {item.name}<small>Set this route</small></span><span aria-hidden="true">↗</span></button>)}</section>
    </>}
    {view === 'results' && <>
      <div className={s.pageHeading}><button aria-label={returning ? 'Back to outward trains' : 'Edit search'} onClick={() => returning ? setReturning(false) : resetSearch()}><Icon name="back" /></button><div><h1>Choose {returning ? 'your return' : 'your outward train'}</h1><p>{station(returning ? search.to : search.from).name} <span aria-hidden="true">→</span> {station(returning ? search.from : search.to).name}</p></div></div>
      <button className={s.summaryDate} onClick={resetSearch}><span>{dateLabel(returning ? search.returnDate : search.date)} · {search.adults} adult{search.adults > 1 ? 's' : ''}</span><b>Edit</b></button>
      {returning && outbound && <div className={s.chosen}>Outward selected <strong>{clock(outbound.journey.departure)} · {gbp(selectionPrice(outbound))}</strong></div>}
      <div className={s.filters}><label>Sort by<select aria-label="Sort trains" value={sort} onChange={event => setSort(event.target.value)}><option value="departure">Departure time</option><option value="price">Lowest price</option><option value="duration">Fastest journey</option></select></label><label className={s.checkbox}><input type="checkbox" checked={directOnly} onChange={event => setDirectOnly(event.target.checked)} />Direct only</label></div>
      <p className={s.fareHint}>Advance singles · per adult, before Railcard</p>
      <div className={s.results}>{options.map(journey => <button className={s.result} key={journey.id} onClick={() => { setSelected(journey); setFlexible(false); }}>
        <div className={s.resultTimes}><strong>{clock(journey.departure)}</strong><span className={s.timeLine}><i />{duration(journey.minutes)}<i /></span><strong>{clock(journey.arrival)}{journey.arrival >= 1440 && <small> +1</small>}</strong></div>
        <div className={s.resultMeta}><span>{journey.changes ? '1 change' : 'Direct'} · {journey.operator}</span><strong>{gbp(journey.price)}<span aria-hidden="true"> ›</span></strong></div>
        <div className={s.resultFoot}><span>Standard · Advance Single</span><span>eTicket</span></div>
      </button>)}</div>
      {!options.length && <div className={s.empty}><h2>No trains at this time</h2><p>{returning ? 'Try a later return date, after your outward train arrives.' : 'Sample departures run from 06:00 to 20:30. Try an earlier time.'}</p><button className={s.primary} onClick={resetSearch}>Change search</button></div>}
    </>}
    {view === 'checkout' && outbound && <>
      <div className={s.pageHeading}><button aria-label="Back to trains" onClick={() => setView('results')}><Icon name="back" /></button><div><h1>Check your journey</h1><p>{search.returnTrip ? 'Two singles for your return trip' : 'Your single journey'}</p></div></div>
      <section className={s.checkout}>{[{ id: 'out', title: 'Outward', choice: outbound }, { id: 'back', title: 'Return', choice: inbound }].map(item => item.choice && <section className={s.leg} key={item.id}><div className={s.sectionTitle}><h2>{item.title}</h2><span>{dateLabel(item.choice.journey.date)}</span></div><Route journey={item.choice.journey} /><p>{item.choice.flexible ? 'Flexible Single' : 'Advance Single'} · Standard</p><button className={s.textButton} onClick={() => { setReturning(item.id === 'back'); setView('results'); }}>Change train</button></section>)}
        <div className={s.delivery}><Icon name="ticket" /><div><strong>Tickets on your phone</strong><p>Your sample tickets will appear in My tickets.</p></div></div>
        <dl className={s.totals}><div><dt>{search.adults} adult{search.adults > 1 ? 's' : ''}{search.railcard && ' · 1 Railcard'}</dt><dd>{gbp(total)}</dd></div><div><dt>Booking fee</dt><dd>£0.00</dd></div><div><dt>Total</dt><dd>{gbp(total)}</dd></div></dl>
        <div className={s.localNotice}><strong>This is a sample booking</strong><p>Timetables, fares and operator are fictional. No payment will be taken and no valid travel ticket will be issued. Bookings last until you reload this page.</p></div>
        <label className={s.accept}><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>I understand this is a local demonstration.</span></label>
        <button className={s.primary} disabled={!accepted} onClick={buy}>Create sample booking <Icon name="arrow" /></button>
      </section>
    </>}
    {view === 'tickets' && <>
      <div className={s.walletTitle}><h1>My tickets</h1><p>Your bookings for this visit.</p></div>
      {notice && <p role="status" className={s.notice}>{notice}</p>}
      {tickets.length === 0 ? <section className={s.empty}><Icon name="ticket" /><h2>No journeys booked yet</h2><p>Find your next train and your sample booking will appear here.</p><button className={s.primary} onClick={resetSearch}>Plan a journey</button></section> : <div className={s.ticketList}>{tickets.map(ticket => <button className={s.ticket} key={ticket.id} onClick={() => setTicketId(ticket.id)}><div className={s.ticketTop}><span>{dateLabel(ticket.outbound.journey.date)}</span><strong>{ticket.cancelled ? 'Cancelled' : 'Sample booking'}</strong></div><div className={s.ticketMain}><span>{station(ticket.outbound.journey.from).name}</span><Icon name="arrow" /><span>{station(ticket.outbound.journey.to).name}</span><strong>{clock(ticket.outbound.journey.departure)}</strong><small>{ticket.inbound ? 'Return trip' : 'Single'} · {ticket.adults} adult{ticket.adults > 1 ? 's' : ''}</small></div><div className={s.ticketBottom}><span>View booking</span><span>{gbp(ticket.total)} ›</span></div></button>)}</div>}
    </>}
    <nav className={s.nav} aria-label="Main navigation"><button aria-current={view !== 'tickets' ? 'page' : undefined} onClick={resetSearch}><Icon name="search" /><span>Search</span></button><button aria-current={view === 'tickets' ? 'page' : undefined} onClick={() => { setView('tickets'); setTicketId(null); setNotice(''); }}><Icon name="ticket" /><span>My tickets{tickets.some(ticket => !ticket.cancelled) && <b>{tickets.filter(ticket => !ticket.cancelled).length}</b>}</span></button></nav>
    {stationField && <Dialog title={stationField === 'from' ? 'Where from?' : 'Where to?'} onClose={() => setStationField(null)}><div className={s.dialogBody}><label className={s.stationSearch}><Icon name="search" /><input autoFocus aria-label="Search stations" placeholder="Station name or code" value={query} onChange={event => setQuery(event.target.value)} /></label><p className={s.muted}>East Coast stations</p><div className={s.stations}>{stations.filter(item => `${item.name} ${item.id}`.toLowerCase().includes(query.toLowerCase())).map(item => <button key={item.id} disabled={item.id === search[stationField === 'from' ? 'to' : 'from']} onClick={() => { updateSearch({ [stationField]: item.id as StationId }); setStationField(null); }}><Icon name="rail" /><span><strong>{item.name}</strong><small>{item.area}</small></span><b>{item.id}</b></button>)}</div>{!stations.some(item => `${item.name} ${item.id}`.toLowerCase().includes(query.toLowerCase())) && <p className={s.muted}>No matching stations. Try London, York or Edinburgh.</p>}</div></Dialog>}
    {passengersOpen && <Dialog title="Passengers & Railcards" onClose={() => setPassengersOpen(false)}><div className={s.dialogBody}><div className={s.stepper}><span><strong>Adults</strong><small>Aged 16 and over</small></span><button aria-label="Remove adult" disabled={search.adults === 1} onClick={() => updateSearch({ adults: search.adults - 1 })}>−</button><b aria-live="polite">{search.adults}</b><button aria-label="Add adult" disabled={search.adults === 6} onClick={() => updateSearch({ adults: search.adults + 1 })}>+</button></div><label className={s.railcard}>Railcard<select value={search.railcard ? '26-30' : 'none'} onChange={event => updateSearch({ railcard: event.target.value === '26-30' })}><option value="none">No Railcard</option><option value="26-30">1 × 26–30 Railcard</option></select></label><p className={s.muted}>Applies a sample 34% discount to one adult. Other passengers pay the full fare.</p><button className={s.primary} onClick={() => setPassengersOpen(false)}>Done</button></div></Dialog>}
    {selected && <Dialog title="Journey & ticket details" onClose={() => setSelected(null)}><div className={s.dialogBody}><p className={s.muted}>{dateLabel(selected.date)} · {returning ? 'Return' : 'Outward'}</p><Route journey={selected} /><fieldset className={s.fares}><legend>Choose your ticket</legend><label><input type="radio" name="fare" checked={!flexible} onChange={() => setFlexible(false)} /><span><strong>Advance Single</strong><small>Only on this train. Non-refundable.</small></span><b>{gbp(selected.price)}</b></label><label><input type="radio" name="fare" checked={flexible} onChange={() => setFlexible(true)} /><span><strong>Flexible Single</strong><small>Any sample train on this date.</small></span><b>{gbp(selected.price + 18)}</b></label></fieldset><p className={s.muted}>Standard class · No seat reservation<br />Prices shown per adult, before Railcard.</p><button className={s.primary} onClick={chooseJourney}>{!returning && search.returnTrip ? 'Select & choose return' : 'Continue'} <Icon name="arrow" /></button></div></Dialog>}
    {activeTicket && !cancelId && <Dialog title={activeTicket.cancelled ? 'Cancelled booking' : 'Your sample booking'} onClose={() => setTicketId(null)}><div className={s.dialogBody}><p className={s.sampleStamp}>NOT VALID FOR TRAVEL</p><p className={s.muted}>Booking {activeTicket.id.slice(0, 8).toUpperCase()}</p><Route journey={activeTicket.outbound.journey} />{activeTicket.inbound && <><h3>Return · {dateLabel(activeTicket.inbound.journey.date)}</h3><Route journey={activeTicket.inbound.journey} /></>}<p>{activeTicket.adults} adult{activeTicket.adults > 1 ? 's' : ''}{activeTicket.railcard ? ' · 1 × 26–30 Railcard' : ''}<br />Total {gbp(activeTicket.total)}</p><p className={s.muted}>No payment was taken. This booking exists only for this visit.</p>{!activeTicket.cancelled && <button className={s.secondary} onClick={() => setCancelId(activeTicket.id)}>Cancel sample booking</button>}<button className={s.primary} onClick={() => setTicketId(null)}>Back to My tickets</button></div></Dialog>}
    {cancelId && <Dialog title="Cancel this sample booking?" onClose={() => setCancelId(null)}><div className={s.dialogBody}><p>This marks the booking as cancelled in My tickets. As no payment was taken, there is nothing to refund.</p><button className={s.primary} onClick={() => { setTickets(current => current.map(ticket => ticket.id === cancelId ? { ...ticket, cancelled: true } : ticket)); setCancelId(null); setTicketId(null); setNotice('Sample booking cancelled.'); }}>Yes, cancel booking</button><button className={s.secondary} onClick={() => setCancelId(null)}>Keep booking</button></div></Dialog>}
  </div></main>;
}
