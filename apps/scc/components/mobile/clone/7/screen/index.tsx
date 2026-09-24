'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { categories, dollars, restaurants, totals, type CartItem, type Dish, type Order, type Restaurant } from '../model/data';
import s from './sidewalk.module.css';

type View = 'home' | 'saved' | 'orders' | 'restaurant' | 'cart';
type Modal = 'address' | 'dish' | 'replace' | null;
function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v11H3Z" /><path d="M9 21v-8h6v8" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    heart: <path d="M20.8 4.6a5.6 5.6 0 0 0-8.8 1.2 5.6 5.6 0 0 0-8.8-1.2C-2 10 6 17 12 21c6-4 14-11 8.8-16.4Z" />,
    bag: <><path d="M4 7h16l1 14H3Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
    orders: <><path d="M5 3h14v19l-3-2-4 2-4-2-3 2Z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    back: <path d="m15 4-8 8 8 8" />,
    close: <path d="m5 5 14 14M19 5 5 19" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export default function Sidewalk() {
  const [view, setView] = useState<View>('home');
  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState('120 E 7th St, New York, NY 10009');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [fast, setFast] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [saved, setSaved] = useState<string[]>([]);
  const [restaurant, setRestaurant] = useState(restaurants[0]);
  const [cartRestaurant, setCartRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [dish, setDish] = useState<Dish | null>(null);
  const [extra, setExtra] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [tip, setTip] = useState(18);
  const [instructions, setInstructions] = useState('Leave at my door');
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    if (!modal && dialog.current?.open) dialog.current.close();
  }, [modal]);
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }); }, [view, restaurant.id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(timer);
  }, [notice]);
  function openRestaurant(value: Restaurant) { setRestaurant(value); setView('restaurant'); }
  function toggleSaved(id: string) { setSaved(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  function openDish(value: Dish) { setDish(value); setQuantity(1); setExtra(false); setNote(''); setModal('dish'); }
  function addItem(replace = false) {
    if (!dish) return;
    if (cart.length && cartRestaurant?.id !== restaurant.id && !replace) { setModal('replace'); return; }
    const item: CartItem = { id: crypto.randomUUID(), dishId: dish.id, name: dish.name, price: dish.price + (extra ? dish.extraPrice : 0), quantity, extra: extra ? dish.extra : '', note: note.trim() };
    setCart(current => replace ? [item] : [...current, item]);
    setCartRestaurant(restaurant); setModal(null); setNotice(`${dish.name} added to your bag`);
  }
  function changeQuantity(id: string, delta: number) {
    setCart(current => current.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(20, item.quantity + delta)) } : item));
  }
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const bill = totals(cart, mode === 'delivery', cartRestaurant?.fee ?? 0, tip);
  const filtered = restaurants.filter(value =>
    (view !== 'saved' || saved.includes(value.id)) &&
    (view === 'saved' || category === 'All' || value.category === category) &&
    (!fast || (mode === 'delivery' ? value.minutes + 10 : value.minutes) <= 30) &&
    `${value.name} ${value.category} ${value.neighborhood} ${value.menu.map(item => item.name).join(' ')}`.toLowerCase().includes(query.toLowerCase().trim())
  ).sort((a, b) => sort === 'rating' ? Number(b.rating) - Number(a.rating) : sort === 'fee' ? a.fee - b.fee : 0);
  const modeSwitch = <div className={s.modeSwitch}>{(['delivery', 'pickup'] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'delivery' ? 'Delivery' : 'Pickup'}</button>)}</div>;
  function empty(title: string, text: string) {
    return <div className={s.empty}><Icon name="bag" /><h2>{title}</h2><p>{text}</p><button className={s.primary} onClick={() => { setQuery(''); setCategory('All'); setFast(false); setView('home'); }}>Find something good</button></div>;
  }
  return <main className={s.stage} lang="en-US"><div className={s.app}>
    <header className={s.header}>
      {view === 'home' || view === 'saved' ? <div className={s.destination}><span className={s.wordmark}>SIDEWALK<span>↗</span></span><button onClick={() => setModal('address')}><Icon name="pin" /><span>{mode === 'delivery' ? 'Deliver to ' : 'Near '}{address.split(',')[0]}</span><b>⌄</b></button></div> : <div className={s.pageTitle}><button className={s.iconButton} aria-label="Back to restaurants" onClick={() => setView('home')}><Icon name="back" /></button><h1>{view === 'cart' ? 'Your bag' : view === 'orders' ? 'Your orders' : restaurant.name}</h1></div>}
      <button className={s.bagButton} aria-label={`Open bag, ${count} items`} onClick={() => setView('cart')}><Icon name="bag" />{count > 0 && <span>{count}</span>}</button>
    </header>
    <div className={s.content} ref={scroll}>
      {(view === 'home' || view === 'saved') && <>
        <div className={s.browseControls}><div className={s.switchRow}>{modeSwitch}<span>New York, NY</span></div><label className={s.search}><Icon name="search" /><input aria-label="Search restaurants or dishes" placeholder="What sounds good?" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" /></button>}</label></div>
        {view === 'home' && <div className={s.categories}>{categories.map((value, index) => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{index === 0 ? <span className={s.allCategory}><Icon name="bag" /></span> : <img src={restaurants[index - 1].image} alt="" />}<span>{value}</span></button>)}</div>}
        <div className={s.filters}><button aria-pressed={fast} onClick={() => setFast(!fast)}>30 min or less{fast ? ' ✓' : ''}</button><select aria-label="Sort restaurants" value={sort} onChange={event => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="fee">Lowest delivery fee</option></select></div>
        <section className={s.restaurants}><div className={s.sectionTitle}><h1>{view === 'saved' ? 'Your go-tos' : query ? 'Search results' : category === 'All' ? 'Good food. Close by.' : category}</h1><p>{view === 'saved' ? 'All your favorites, one place.' : `${filtered.length} neighborhood spots · ${mode === 'delivery' ? 'Delivered to your door' : 'Ready when you are'}`}</p></div>
          {filtered.length ? filtered.map(value => <article className={s.restaurant} key={value.id}><div className={s.restaurantImage}><button onClick={() => openRestaurant(value)} aria-label={`View ${value.name} menu`}><img src={value.image} alt={value.alt} loading="lazy" /></button><button className={s.favorite} aria-label={`Save ${value.name}`} aria-pressed={saved.includes(value.id)} onClick={() => toggleSaved(value.id)}><Icon name="heart" /></button><span>{mode === 'pickup' ? `${Math.max(10, value.minutes - 10)}–${value.minutes} min pickup` : `${value.minutes}–${value.minutes + 10} min`}</span></div><button className={s.restaurantInfo} onClick={() => openRestaurant(value)}><div><h2>{value.name}</h2><b>{value.rating} <span>★</span></b></div><p>{value.category} · {value.neighborhood} · $$</p><div className={s.meta}><span>{mode === 'delivery' ? `${dollars(value.fee)} delivery fee` : 'No pickup fee'}</span><span>({value.reviews} ratings)</span></div></button></article>) : empty(view === 'saved' ? 'No saved restaurants' : 'No results found', view === 'saved' ? 'Tap the heart on a restaurant to save it here.' : 'Try another dish, restaurant or neighborhood.')}
        </section>
      </>}
      {view === 'restaurant' && <><div className={s.storeHero}><img src={restaurant.image} alt={restaurant.alt} /><button className={s.favorite} aria-label={`Save ${restaurant.name}`} aria-pressed={saved.includes(restaurant.id)} onClick={() => toggleSaved(restaurant.id)}><Icon name="heart" /></button></div><section className={s.storeIntro}><h1>{restaurant.name}</h1><p><b>{restaurant.rating} ★</b> ({restaurant.reviews} ratings) · {restaurant.category} · $$</p><p>{restaurant.neighborhood} · {restaurant.address.split(',')[0]}</p><p className={s.description}>{restaurant.description}</p><div className={s.storeMode}>{modeSwitch}<span><b>{mode === 'delivery' ? `${restaurant.minutes}–${restaurant.minutes + 10}` : `${Math.max(10, restaurant.minutes - 10)}–${restaurant.minutes}`} min</b><small>{mode === 'delivery' ? `${dollars(restaurant.fee)} delivery fee` : 'No pickup fee'}</small></span></div></section><section className={s.menu}><h2>The menu</h2>{restaurant.menu.map(value => <button key={value.id} className={s.dish} onClick={() => openDish(value)}><span><h3>{value.name}</h3><p>{value.description}</p><b>{dollars(value.price)}</b></span><span className={s.dishImage}><img src={value.image} alt={value.alt} /><i>+</i></span></button>)}</section></>}
      {view === 'cart' && <section className={s.checkout}>{cart.length && cartRestaurant ? <>
        <button className={s.cartRestaurant} onClick={() => openRestaurant(cartRestaurant)}><h2>{cartRestaurant.name}</h2><span>Add more →</span></button>
        {cart.map(item => <article className={s.cartItem} key={item.id}><div><h3>{item.name}</h3><b>{dollars(item.price * item.quantity)}</b></div>{item.extra && <p>{item.extra}</p>}{item.note && <p>{item.note}</p>}<div><button className={s.textButton} onClick={() => setCart(current => current.filter(value => value.id !== item.id))}>Remove</button><div className={s.stepper}><button aria-label={`Decrease ${item.name} quantity`} disabled={item.quantity === 1} onClick={() => changeQuantity(item.id, -1)}>−</button><span>{item.quantity}</span><button aria-label={`Increase ${item.name} quantity`} disabled={item.quantity === 20} onClick={() => changeQuantity(item.id, 1)}>+</button></div></div></article>)}
        <section className={s.checkoutSection}><h2>Getting your food</h2>{modeSwitch}<div className={s.addressRow}><Icon name="pin" /><div><b>{mode === 'delivery' ? 'Deliver to' : 'Pick up at'}</b><p>{mode === 'delivery' ? address : cartRestaurant.address}</p></div>{mode === 'delivery' && <button className={s.textButton} onClick={() => setModal('address')}>Edit</button>}</div>{mode === 'delivery' && <label className={s.field}>Drop-off instructions<select value={instructions} onChange={event => setInstructions(event.target.value)}><option>Leave at my door</option><option>Hand it to me</option><option>Meet outside</option></select></label>}</section>
        <section className={s.checkoutSection}><h2>{mode === 'delivery' ? 'Add a driver tip' : 'Add a restaurant tip'}</h2><p>{mode === 'delivery' ? '100% of your tip would go to your driver.' : 'A little thanks for the kitchen.'}</p><div className={s.tips}>{[0, 15, 18, 20].map(value => <button key={value} aria-pressed={tip === value} onClick={() => setTip(value)}>{value ? `${value}%` : 'No tip'}<small>{dollars(Math.round(bill.subtotal * value / 100))}</small></button>)}</div></section>
        <dl className={s.totals}><div><dt>Subtotal</dt><dd>{dollars(bill.subtotal)}</dd></div><div><dt>Delivery fee</dt><dd>{dollars(bill.fee)}</dd></div><div><dt>Service fee {mode === 'delivery' ? '(10%, max $3.99)' : '(pickup)'}</dt><dd>{dollars(bill.service)}</dd></div><div><dt>Estimated tax (8.875%)</dt><dd>{dollars(bill.tax)}</dd></div><div><dt>Tip</dt><dd>{dollars(bill.tip)}</dd></div><div className={s.total}><dt>Total</dt><dd>{dollars(bill.total)}</dd></div></dl>
        <p className={s.simulation}>This is a local demo. Restaurants, prices and ratings are fictional. No payment is collected and no order is sent. Estimated tax is calculated on the subtotal and fees.</p><button className={s.primary} onClick={() => { setOrders(current => [{ id: crypto.randomUUID(), restaurantId: cartRestaurant.id, restaurant: cartRestaurant.name, items: cart, total: bill.total, mode, destination: mode === 'delivery' ? address : cartRestaurant.address, instructions: mode === 'delivery' ? instructions : 'Pick up at the counter', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }, ...current]); setCart([]); setView('orders'); setNotice('Demo order saved. No charge made.'); }}>Place demo order · {dollars(bill.total)}</button>
      </> : empty('Your bag is empty', 'Pick a neighborhood spot and add something delicious.')}</section>}
      {view === 'orders' && <section className={s.orders}>{orders.length ? orders.map(order => <article key={order.id}><div className={s.orderHeading}><span>Demo order saved</span><small>{order.date}</small></div><h2>{order.restaurant}</h2>{order.items.map(item => <p key={item.id}>{item.quantity} × {item.name}{item.extra ? ` · ${item.extra}` : ''}{item.note ? ` · ${item.note}` : ''}</p>)}<b>{dollars(order.total)}</b><p>{order.mode === 'delivery' ? 'Delivery' : 'Pickup'} · {order.destination}<br />{order.instructions}</p><small>Order #{order.id.slice(0, 8).toUpperCase()} · Not sent to restaurant</small><button className={s.primary} onClick={() => { const value = restaurants.find(item => item.id === order.restaurantId); if (value) openRestaurant(value); }}>View menu</button></article>) : empty('No orders yet', 'Your demo orders will appear here during this visit.')}</section>}
    </div>
    {view === 'restaurant' && count > 0 && <button className={s.floatingBag} onClick={() => setView('cart')}><span>{count}</span><b>View bag</b><strong>{dollars(bill.subtotal)}</strong></button>}
    <nav className={s.navigation} aria-label="Main navigation">{([{ id: 'home', label: 'Discover', icon: 'home' }, { id: 'saved', label: 'Saved', icon: 'heart' }, { id: 'orders', label: 'Orders', icon: 'orders' }] as const).map(item => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => { setQuery(''); setFast(false); setView(item.id); }}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
    {notice && <div className={s.toast} role="status">{notice}</div>}
    <dialog ref={dialog} className={s.dialog} aria-label={modal === 'address' ? 'Delivery address' : modal === 'replace' ? 'Start a new bag' : dish?.name || 'Menu item'} onCancel={() => setModal(null)} onClick={event => { if (event.target === event.currentTarget) setModal(null); }}><button className={s.close} aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" /></button>
      {modal === 'address' ? <form className={s.dialogBody} onSubmit={event => { event.preventDefault(); const input = event.currentTarget.elements.namedItem('address') as HTMLInputElement; const value = input.value.trim(); if (!value) { input.setCustomValidity('Enter your street address.'); input.reportValidity(); return; } setAddress(value); setModal(null); }}><h2>Where to?</h2><p>Set your address for this visit.</p><label className={s.field}>Street address, apartment and ZIP<input name="address" required defaultValue={address} autoComplete="street-address" onInput={event => event.currentTarget.setCustomValidity('')} /></label><button className={s.primary} type="submit">Save address</button></form> : modal === 'replace' ? <div className={s.dialogBody}><h2>Start a new bag?</h2><p>You can order from one restaurant at a time. Adding this item will replace your bag from {cartRestaurant?.name}.</p><button className={s.primary} onClick={() => addItem(true)}>Start bag from {restaurant.name}</button><button className={s.secondary} onClick={() => setModal('dish')}>Keep my current bag</button></div> : dish && <><img className={s.detailPhoto} src={dish.image} alt={dish.alt} /><div className={s.dialogBody}><h2>{dish.name}</h2><p>{dish.description}</p><b className={s.detailPrice}>{dollars(dish.price)}</b><fieldset className={s.customize}><legend>Make it yours <span>Optional</span></legend><label><span>{dish.extra}<small>+{dollars(dish.extraPrice)}</small></span><input type="checkbox" checked={extra} onChange={event => setExtra(event.target.checked)} /></label></fieldset><label className={s.field}>Special instructions<textarea placeholder="Anything the kitchen should know?" maxLength={240} value={note} onChange={event => setNote(event.target.value)} /></label><p className={s.smallPrint}>For allergies, contact the restaurant directly before placing a real order.</p><div className={s.quantityRow}><b>Quantity</b><div className={s.stepper}><button aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => setQuantity(quantity - 1)}>−</button><span>{quantity}</span><button aria-label="Increase quantity" disabled={quantity === 20} onClick={() => setQuantity(quantity + 1)}>+</button></div></div><button className={s.primary} onClick={() => addItem()}>Add to bag · {dollars((dish.price + (extra ? dish.extraPrice : 0)) * quantity)}</button></div></>}
    </dialog>
  </div></main>;
}
