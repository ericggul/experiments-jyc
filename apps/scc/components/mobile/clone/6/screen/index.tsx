'use client';
/* eslint-disable @next/next/no-img-element -- Remote editorial product photography matches the standalone archive's media approach. */
import { useEffect, useRef, useState } from 'react';
import { categories, deliveryCost, money, products, sizes, type Order, type Product } from '../model/data';
import s from './thread.module.css';

type View = 'shop' | 'saved' | 'bag' | 'account' | 'checkout';
type IconName = 'search' | 'heart' | 'bag' | 'user' | 'home' | 'close' | 'back' | 'filter';
function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'filter' ? <><path d="M3 6h18M3 12h18M3 18h18" /><path d="M8 3v6M16 9v6M9 15v6" /></> : name === 'search' ? <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></> : name === 'heart' ? <path d="M20.5 4.7a5.3 5.3 0 0 0-7.5 0L12 5.8l-1-1.1a5.3 5.3 0 0 0-7.5 7.5L12 21l8.5-8.8a5.3 5.3 0 0 0 0-7.5Z" /> : name === 'bag' ? <><path d="M4 7h16l1 14H3Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></> : name === 'user' ? <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></> : name === 'home' ? <><path d="m3 10 9-7 9 7v11H3Z" /><path d="M9 21v-8h6v8" /></> : name === 'back' ? <path d="m15 4-8 8 8 8" /> : <path d="m5 5 14 14M19 5 5 19" />}
  </svg>;
}

export default function ThreadShop() {
  const [view, setView] = useState<View>('shop');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('all');
  const [sort, setSort] = useState('picked');
  const [saved, setSaved] = useState<string[]>([]);
  const [bag, setBag] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [notice, setNotice] = useState('');
  const filterDialog = useRef<HTMLDialogElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const bagItems = products.filter(p => bag.includes(p.id));
  const sold = new Set(orders.flatMap(order => order.items.map(item => item.id)));
  const subtotal = bagItems.reduce((sum, p) => sum + p.price, 0);
  const shipping = deliveryCost(bagItems);
  const filtered = products.filter(p => !sold.has(p.id) && (view !== 'saved' || saved.includes(p.id)) && (category === 'all' || category === p.category) && (size === 'all' || size === p.size) && `${p.title} ${p.brand} ${p.seller} ${p.area}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : sort === 'new' ? products.indexOf(b) - products.indexOf(a) : 0);

  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);
  useEffect(() => { content.current?.scrollTo({ top: 0 }); }, [view]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  function resetFilters() { setCategory('all'); setSize('all'); setQuery(''); setSort('picked'); }
  function navigate(next: View) { setView(next); setSelected(null); resetFilters(); }
  function toggleSave(id: string) { setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]); }
  function addToBag(product: Product) {
    if (sold.has(product.id)) return;
    setBag(current => current.includes(product.id) ? current : [...current, product.id]);
    setSelected(null);
    setNotice('Added to your bag');
  }
  const empty = (title: string, copy: string) => <div className={s.empty}><Icon name={view === 'saved' ? 'heart' : 'bag'} /><h2>{title}</h2><p>{copy}</p><button className={s.primary} onClick={() => navigate('shop')}>Browse items</button></div>;
  const totals = <dl className={s.totals}><div><dt>Items ({bagItems.length})</dt><dd>{money(subtotal)}</dd></div><div><dt>Tracked UK delivery</dt><dd>{money(shipping)}</dd></div><div><dt>Total</dt><dd>{money(subtotal + shipping)}</dd></div></dl>;

  return <main className={s.stage} lang="en-GB"><div className={s.app}>
    <header className={s.header}>
      {view === 'shop' ? <button className={s.wordmark} onClick={() => { navigate('shop'); content.current?.scrollTo({ top: 0 }); }} aria-label="THREAD home">thread</button> : <><button className={s.iconButton} aria-label={view === 'checkout' ? 'Back to bag' : 'Back to shop'} onClick={() => navigate(view === 'checkout' ? 'bag' : 'shop')}><Icon name="back" /></button><h1>{{ saved: 'Saved', bag: 'Your bag', account: 'Your THREAD', checkout: 'Checkout' }[view]}</h1></>}
      <button className={s.iconButton} onClick={() => navigate('bag')} aria-label={`Bag, ${bag.length} items`}><Icon name="bag" />{bag.length > 0 && <span className={s.count}>{bag.length}</span>}</button>
    </header>
    <div className={s.content} ref={content}>
      {(view === 'shop' || view === 'saved') && <>
        <div className={s.search}><Icon name="search" /><input ref={search} value={query} onChange={e => setQuery(e.target.value)} aria-label="Search clothes, brands or sellers" placeholder="Search items or members" />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><Icon name="close" /></button>}</div>
        <div className={s.catalogToolbar}>
          <h2>{view === 'saved' ? 'Saved items' : query ? 'Search results' : category === 'all' ? 'Recommended for you' : categories.find(c => c.id === category)?.label}</h2>
          <button onClick={() => filterDialog.current?.showModal()} aria-label="Filter and sort items"><Icon name="filter" />Filters{(category !== 'all' || size !== 'all' || sort !== 'picked') && <span className={s.filterActive} aria-label="Filters active" />}</button>
        </div>
        {filtered.length ? <div className={s.grid}>{filtered.map(product => <article className={s.product} key={product.id}>
          <div className={s.photo}><button onClick={() => setSelected(product)} aria-label={`View ${product.title}, ${money(product.price)}, ${product.size}`}><img src={product.image} alt={product.alt} loading="lazy" /></button><button className={s.save} aria-label={`${saved.includes(product.id) ? 'Unsave' : 'Save'} ${product.title}`} aria-pressed={saved.includes(product.id)} onClick={() => toggleSave(product.id)}><Icon name="heart" /></button></div>
          <button className={s.productText} onClick={() => setSelected(product)}><strong>{product.title}</strong><small>{product.size} · {product.condition}</small><b>{money(product.price)}</b></button>
        </article>)}</div> : <div className={s.empty}><h2>{view === 'saved' && !saved.length ? 'No saved items yet' : 'Nothing here just yet.'}</h2><p>{view === 'saved' && !saved.length ? 'Tap the heart on anything you like.' : 'Try another size, a different search or fewer filters.'}</p><button className={s.primary} onClick={() => navigate('shop')}>Browse all finds</button></div>}
      </>}
      {view === 'bag' && <section className={s.section}>{bagItems.length ? <><p className={s.note}>{bagItems.length} {bagItems.length === 1 ? 'item' : 'items'} from {new Set(bagItems.map(item => item.seller)).size} {new Set(bagItems.map(item => item.seller)).size === 1 ? 'seller' : 'sellers'}</p>{bagItems.map(product => <article className={s.bagItem} key={product.id}><button onClick={() => setSelected(product)} aria-label={`View ${product.title}`}><img src={product.image} alt={product.alt} /></button><div><small>@{product.seller}</small><button className={s.itemTitle} onClick={() => setSelected(product)}>{product.title}</button><p>{product.size} · {product.condition}</p><b>{money(product.price)}</b><button className={s.textButton} onClick={() => setBag(current => current.filter(id => id !== product.id))}>Remove</button></div></article>)}{totals}<p className={s.note}>£3.49 delivery per seller. Items from the same wardrobe travel together.</p><button className={s.primary} onClick={() => setView('checkout')}>Continue to checkout <span>→</span></button></> : empty('Your bag is empty', 'Items you add will appear here.')}</section>}
      {view === 'checkout' && <form className={s.checkout} onSubmit={event => {
        event.preventDefault();
        if (!bagItems.length) return;
        const data = new FormData(event.currentTarget);
        const name = String(data.get('name')).trim();
        const address = String(data.get('address')).trim();
        const town = String(data.get('town')).trim();
        const postcode = String(data.get('postcode')).trim().toUpperCase();
        if (!name || !address || !town || !postcode) { setNotice('Please complete your delivery details.'); return; }
        setOrders(current => [{ id: crypto.randomUUID(), items: bagItems, total: subtotal + shipping, delivery: shipping, name, address, town, postcode }, ...current]);
        setBag([]);
        navigate('account');
        setNotice('Your demo order is saved');
      }}><h2>Delivery address</h2><label>Full name<input name="name" autoComplete="name" required maxLength={100} /></label><label>Address<input name="address" autoComplete="street-address" required maxLength={200} /></label><div className={s.formRow}><label>Town or city<input name="town" autoComplete="address-level2" required maxLength={80} /></label><label>UK postcode<input name="postcode" autoComplete="postal-code" required pattern="[A-Za-z]{1,2}[0-9][A-Za-z0-9]? ?[0-9][A-Za-z]{2}" title="Enter a UK postcode, for example E8 1AA" maxLength={8} /></label></div><h2>Your order</h2>{bagItems.map(product => <div className={s.summaryItem} key={product.id}><span>{product.title}<small>{product.size}</small></span><b>{money(product.price)}</b></div>)}{totals}<div className={s.localNote}><b>Demo checkout</b><p>This is a fictional shop. Your demo order stays in this visit only. No payment, seller contact or delivery takes place. Use made-up delivery details.</p></div><button className={s.primary} type="submit" disabled={!bagItems.length}>Place demo order · {money(subtotal + shipping)}</button></form>}
      {view === 'account' && <section className={s.section}><div className={s.account}><span><Icon name="user" /></span><div><h2>Your account</h2><p>Shopping as a guest</p></div></div><div className={s.accountLinks}><button onClick={() => navigate('saved')}><span>Saved finds</span><b>{saved.filter(id => !sold.has(id)).length} →</b></button><button onClick={() => navigate('bag')}><span>Your bag</span><b>{bag.length} →</b></button></div><h2 className={s.orderHeading}>Purchases</h2>{orders.length ? orders.map(order => <article className={s.order} key={order.id}><div><b>Demo order saved</b><small>#{order.id.slice(0, 8).toUpperCase()}</small></div><p>{order.name}<br />{order.address}<br />{order.town} · {order.postcode}</p>{order.items.map(product => <button className={s.orderItem} key={product.id} onClick={() => setSelected(product)}><img src={product.image} alt={product.alt} /><span>{product.title}<small>{product.size} · @{product.seller}</small></span><b>{money(product.price)}</b></button>)}<p>Delivery {money(order.delivery)} · Total <b>{money(order.total)}</b></p><small>No payment taken. These items are marked purchased for this visit.</small></article>) : <div className={s.empty}><p>No purchases yet.</p><button className={s.textButton} onClick={() => navigate('shop')}>Have a browse →</button></div>}</section>}
    </div>
    <nav className={s.bottom} aria-label="Main navigation">{([{ id: 'shop', name: 'home', label: 'Shop' }, { id: 'saved', name: 'heart', label: 'Saved' }, { id: 'bag', name: 'bag', label: 'Bag' }, { id: 'account', name: 'user', label: 'You' }] as const).map(item => <button key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.name} /><span>{item.label}</span></button>)}</nav>
    {notice && <div className={s.toast} role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><Icon name="close" /></button></div>}
    <dialog ref={filterDialog} className={s.filterDialog} aria-labelledby="thread-filter-title">
      <header><h2 id="thread-filter-title">Filter & sort</h2><button className={s.iconButton} onClick={() => filterDialog.current?.close()} aria-label="Close filters"><Icon name="close" /></button></header>
      <div className={s.filterFields}>
        <label>Category<select value={category} onChange={event => setCategory(event.target.value)}>{categories.map(item => <option key={item.id} value={item.id}>{item.id === 'all' ? 'All clothing & accessories' : item.label}</option>)}</select></label>
        <label>Size<select value={size} onChange={event => setSize(event.target.value)}><option value="all">All sizes</option>{sizes.map((item, index) => <option key={`size-${index}`} value={item}>{item}</option>)}</select></label>
        <label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="picked">Recommended</option><option value="new">Newest first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
        <button className={s.primary} onClick={() => filterDialog.current?.close()}>Show {filtered.length} {filtered.length === 1 ? 'item' : 'items'}</button>
        <button className={s.textButton} onClick={resetFilters}>Clear all filters</button>
      </div>
    </dialog>
    <dialog className={s.dialog} ref={dialog} onCancel={() => setSelected(null)} onClose={() => setSelected(null)} aria-label={selected?.title || 'Item details'}>{selected && <><div className={s.detailPhoto}><img src={selected.image} alt={selected.alt} /><button className={s.close} onClick={() => setSelected(null)} aria-label="Close item details"><Icon name="close" /></button></div><div className={s.detailBody}><div className={s.priceRow}><strong>{money(selected.price)}</strong><button className={s.iconButton} onClick={() => toggleSave(selected.id)} aria-label={`${saved.includes(selected.id) ? 'Unsave' : 'Save'} ${selected.title}`} aria-pressed={saved.includes(selected.id)}><Icon name="heart" /></button></div><h2>{selected.title}</h2><p className={s.detailMeta}>{selected.brand} · {selected.size} · {selected.condition}</p><p className={s.description}>{selected.description}</p><button className={s.sellerDetail} onClick={() => { const seller = selected.seller; navigate('shop'); setQuery(seller); }}><span className={s.avatar}>{selected.seller.slice(0, 1)}</span><span><b>@{selected.seller}</b><small>{selected.area}</small></span><span>View shop →</span></button><div className={s.delivery}><b>Tracked UK delivery · £3.49</b><span>One item available in {selected.size}</span></div><button className={s.primary} disabled={sold.has(selected.id)} onClick={() => { if (bag.includes(selected.id)) navigate('bag'); else addToBag(selected); }}>{sold.has(selected.id) ? 'Purchased in this visit' : bag.includes(selected.id) ? 'View in bag' : 'Add to bag'}</button></div></>}</dialog>
  </div></main>;
}
