/* eslint-disable @next/next/no-img-element -- Product photos are local, pre-sized sample photographs. */
import type { CSSProperties } from "react";
import { Icon, Storyboard, TabBar, type Panel, type Session, type Shot, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { endsIn, money, percentOff, productAt, productSrc, queries, reviewCount, reviewsFor, tileBackground, type Product } from "./data";
import styles from "./shopping.module.css";

const tabs = (cart: number): readonly TabItem[] => [
  { id: "home", label: "Home", icon: "house" },
  { id: "categories", label: "Browse", icon: "grid" },
  { id: "deals", label: "Deals", icon: "tag" },
  { id: "cart", label: "Cart", icon: "cart", badge: cart || undefined },
  { id: "account", label: "You", icon: "person" },
];

const HEADER = 128;
const DEALS_STRIP = 36;
const BROWSE_TOP = HEADER + DEALS_STRIP;
const ROW_H = 308;
const GRID_PAD = 8;
const RESULT_H = 156;
const GALLERY_IMAGES = 5;
const GALLERY_STEP = 398;
const MAX_PRODUCTS = 3;
const MAX_CARTS = 2;
const MAX_BROWSE_SCROLL = 2000;

const tap = {
  back: { x: 22, y: 76 },
  search: { x: 160, y: 74 },
  image: { x: 195, y: 300 },
  close: { x: 356, y: 128 },
  addToCart: { x: 270, y: 784 },
  goToCart: { x: 195, y: 697 },
  continueShopping: { x: 195, y: 751 },
  homeTab: { x: 39, y: 784 },
  cartTab: { x: 273, y: 784 },
  cartLine: { x: 120, y: 290 },
} as const;

type Spec =
  | { kind: "browse" }
  | { kind: "results"; query: string; rows: number }
  | { kind: "product"; product: Product }
  | { kind: "gallery"; product: Product }
  | { kind: "added"; product: Product; cart: number; subtotal: number }
  | { kind: "cart"; items: readonly Product[] };

type Plan = { duration: number; shots: Shot[]; specs: Record<string, Spec>; browseRows: number };

/**
 * Shopping in simulated time: flick the deals grid, tap a product, swipe its
 * photos, read reviews, add to cart, glance at the cart, keep browsing; now
 * and then a search. Tap targets follow the computed scroll positions.
 */
function plan({ seed, duration, view }: Pick<ScreenProps, "seed" | "duration" | "view">): Plan {
  const rng = createRng(hash(seed, "cart-session", view));
  const total = Math.max(4, duration);
  const shots: Shot[] = [];
  const specs: Record<string, Spec> = { browse: { kind: "browse" } };
  const cart: Product[] = Array.from({ length: rng.int(0, 2) }, (_, i) => productAt(seed, "saved", i));
  let t = 0;
  let browseScroll = 0;
  let browseMax = 0;
  let resultsScroll = 0;
  let products = 0;
  let carts = 0;
  let searched = false;
  /** Where the person returns to with the Home tab. */
  let home = "browse";

  const showCart = (at: number, enter: Shot["enter"], tapAt: Shot["tap"]) => {
    const id = `cart-${carts++}`;
    specs[id] = { kind: "cart", items: [...cart] };
    shots.push({ panel: id, at, enter, tap: tapAt, scroll: Math.min(160 * cart.length, rng.int(80, 260)), flicks: 1 });
    return { id, at: at + rng.range(1.5, 2.4) };
  };

  /** Product page: photos, reviews, maybe add to cart. Returns when the person is back on a list. */
  const visit = (product: Product, at: number, enter: Shot["enter"], tapAt: Shot["tap"]) => {
    const id = `product-${products++}`;
    specs[id] = { kind: "product", product };
    let time = at;
    shots.push({ panel: id, at: time, enter, tap: tapAt, scroll: rng.int(0, 1) * 120, flicks: 1 });
    time += rng.range(1.2, 1.8);
    if (rng.chance(0.65)) {
      const gallery = `gallery-${id}`;
      specs[gallery] = { kind: "gallery", product };
      const seen = rng.int(2, 3);
      shots.push({ panel: gallery, at: time, enter: "sheet", tap: tap.image, scroll: seen * GALLERY_STEP, flicks: seen });
      time += seen * 0.45 + 0.8;
      shots.push({ panel: id, at: time, enter: "dismiss", tap: tap.close });
      time += 1.3;
    }
    // Down to the reviews.
    shots.push({ panel: id, at: time, scroll: rng.int(820, 1250), flicks: rng.int(2, 3) });
    time += rng.range(1.6, 2.4);
    if (rng.chance(0.55)) {
      cart.push(product);
      const added = `added-${id}`;
      specs[added] = { kind: "added", product, cart: cart.length, subtotal: cart.reduce((sum, p) => sum + p.price, 0) };
      shots.push({ panel: added, at: time, enter: "sheet", tap: tap.addToCart });
      time += rng.range(1.2, 1.8);
      if (carts < MAX_CARTS && rng.chance(0.55)) {
        const shown = showCart(time, "push", tap.goToCart);
        time = shown.at;
        shots.push({ panel: home, at: time, enter: "tab", tap: tap.homeTab });
        return time + 1.3;
      }
      shots.push({ panel: id, at: time, enter: "dismiss", tap: tap.continueShopping });
      time += 1.3;
    }
    shots.push({ panel: home, at: time, enter: "pop", tap: tap.back });
    return time + 1.3;
  };

  if (view === "cart") {
    const first = showCart(0, "cut", undefined);
    t = first.at;
    if (cart.length) {
      t = visit(cart[0], t, "push", tap.cartLine);
    } else {
      shots.push({ panel: "browse", at: t, enter: "tab", tap: tap.homeTab });
      t += 1.3;
    }
  } else if (view === "product") {
    t = visit(productAt(seed, "browse", rng.int(0, 5)), 0, "cut", undefined);
  }

  while (t < total) {
    if (home === "browse") {
      const run = rng.range(1.2, 2.4);
      // At the end of the loaded grid (long scenes) the Home tab jumps back to the top.
      const top = browseScroll >= MAX_BROWSE_SCROLL;
      browseScroll = top ? 0 : Math.min(MAX_BROWSE_SCROLL, browseScroll + run * rng.range(280, 460));
      browseMax = Math.max(browseMax, browseScroll);
      shots.push({ panel: "browse", at: t, enter: shots.length ? undefined : "cut", tap: top ? tap.homeTab : undefined, scroll: browseScroll, flicks: Math.max(1, Math.round(run / 0.8)) });
      t += run;
    } else {
      const spec = specs[home] as Extract<Spec, { kind: "results" }>;
      const run = rng.range(1.2, 2);
      resultsScroll = Math.min(spec.rows * RESULT_H - 500, resultsScroll + run * 300);
      shots.push({ panel: home, at: t, scroll: resultsScroll, flicks: 2 });
      t += run;
    }
    if (t >= total) break;
    const action = rng.weighted([
      ["product", products < MAX_PRODUCTS ? 5 : 0],
      ["search", !searched && home === "browse" ? 1.2 : 0],
      ["cart", cart.length && carts < MAX_CARTS ? 0.8 : 0],
      ["more", 1.2],
    ] as const);
    if (action === "product") {
      if (home === "browse") {
        const row = Math.max(0, Math.floor((browseScroll + 420 - BROWSE_TOP - 46 - GRID_PAD) / ROW_H));
        const col = rng.int(0, 1);
        const y = BROWSE_TOP + 46 + GRID_PAD + row * ROW_H - browseScroll + ROW_H / 2;
        t = visit(productAt(seed, "browse", row * 2 + col), t, "push", { x: col ? 290 : 100, y: Math.min(720, Math.max(BROWSE_TOP + 40, y)) });
      } else {
        const spec = specs[home] as Extract<Spec, { kind: "results" }>;
        t = visit(productAt(seed, `q-${spec.query}`, rng.int(1, 3)), t, "push", { x: 195, y: 420 });
        home = "browse";
        // Back from search results to the deals grid with the Home tab.
        shots.push({ panel: "browse", at: t, enter: "tab", tap: tap.homeTab });
        t += 1.3;
      }
    } else if (action === "search") {
      searched = true;
      const query = rng.pick(queries);
      specs.results = { kind: "results", query, rows: 7 };
      shots.push({ panel: "results", at: t, enter: "push", tap: tap.search });
      home = "results";
      t += 1.3;
    } else if (action === "cart") {
      const shown = showCart(t, "tab", tap.cartTab);
      t = shown.at;
      shots.push({ panel: home, at: t, enter: "tab", tap: tap.homeTab });
      t += 1.3;
    }
  }
  return { duration: total, shots, specs, browseRows: Math.ceil((browseMax + 900) / ROW_H) + 1 };
}

function Price({ value }: { value: number }) {
  const [whole, cents] = value.toFixed(2).split(".");
  return <span className={styles.price} data-cents={cents}>{whole}</span>;
}

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  const full = Math.round(rating);
  return <div className={styles.stars} data-stars={`${"★".repeat(full)}${"☆".repeat(5 - full)}`}>{reviewCount(reviews)}</div>;
}

function Picture({ product, size, variant = 0 }: { product: Product; size: number; variant?: number }) {
  if (product.img) {
    const style: CSSProperties | undefined = variant ? { objectPosition: ["50% 50%", "20% 40%", "80% 60%", "50% 10%", "50% 90%"][variant % 5], transform: `scale(${1 + (variant % 3) * 0.25})` } : undefined;
    return <img className={styles.picture} src={productSrc(product.img)} alt={product.alt} width={size} height={size} decoding="async" style={style} />;
  }
  return (
    <span className={styles.glyphTile} style={{ background: tileBackground(product.hue + variant * 25), fontSize: size * (0.42 + (variant % 3) * 0.1) }} role="img" aria-label={product.alt}>
      {product.glyph}
    </span>
  );
}

function Header({ owner, query, back = false }: { owner: ScreenProps["owner"]; query?: string; back?: boolean }) {
  return (
    <div className={styles.header}>
      <div className={styles.searchRow}>
        {back ? <Icon name="chevronLeft" size={24} stroke={2.4} /> : null}
        <div className={styles.search}><Icon name="search" size={19} stroke={2} />{query ? <b className={styles.query}>{query}</b> : "Search Cart"}</div>
      </div>
      <div className={styles.deliver}><Icon name="pin" size={16} stroke={2} />Deliver to <b>{owner.firstName} · {owner.home}</b></div>
    </div>
  );
}

function Tile({ product }: { product: Product }) {
  const off = percentOff(product);
  return (
    <div className={styles.tile}>
      <Picture product={product} size={180} />
      <div className={styles.tileBody}>
        {product.badge || off ? <span className={product.badge === "Best Seller" ? styles.seller : styles.off}>{product.badge === "Best Seller" ? "Best Seller" : `-${off}%`}</span> : null}
        <div className={styles.name}>{product.name}</div>
        <div className={styles.priceRow}><Price value={product.price} />{off ? <span className={styles.was}>{money(product.list)}</span> : null}</div>
        <Stars rating={product.rating} reviews={product.reviews} />
      </div>
    </div>
  );
}

function BrowseBody({ seed, rows }: { seed: number; rows: number }) {
  return (
    <>
      <div className={styles.banner}>Today&apos;s Deals</div>
      <div className={styles.grid}>
        {Array.from({ length: rows * 2 }, (_, i) => {
          const product = productAt(seed, "browse", i);
          return <Tile key={product.id} product={product} />;
        })}
      </div>
    </>
  );
}

function ResultsBody({ seed, query, rows }: { seed: number; query: string; rows: number }) {
  return (
    <>
      <div className={styles.resultCount}>Over {1 + (hash(seed, query) % 9)},000 results for &ldquo;{query}&rdquo;</div>
      {Array.from({ length: rows }, (_, i) => {
        const product = productAt(seed, `q-${query}`, i);
        return (
          <div key={product.id} className={styles.result}>
            <Picture product={product} size={130} />
            <div>
              {i === 0 ? <span className={styles.sponsored}>Sponsored</span> : null}
              <div className={styles.name}>{product.name}</div>
              <Stars rating={product.rating} reviews={product.reviews} />
              {product.bought ? <div className={styles.bought}>{product.bought >= 1000 ? `${product.bought / 1000}K+` : `${product.bought}+`} bought in past month</div> : null}
              <Price value={product.price} />
              <div className={styles.prime}><b>Free delivery</b> tomorrow</div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function ProductBody({ seed, product, clock }: { seed: number; product: Product; clock: number }) {
  const cutoff = 21 * 60;
  const remaining = cutoff - clock;
  const order = remaining > 0 ? `Order within ${Math.floor(remaining / 60)} hrs ${remaining % 60} mins` : `Order by ${formatTime(cutoff)} tomorrow`;
  const off = percentOff(product);
  return (
    <>
      <div className={styles.gallery} data-count={`1/${GALLERY_IMAGES}`}><Picture product={product} size={390} /></div>
      <div className={styles.detail}>
        <div className={styles.name}>{product.name}</div>
        <Stars rating={product.rating} reviews={product.reviews} />
        <div className={styles.priceLine}>{off ? <span className={styles.save}>-{off}%</span> : null}<span className={styles.big}>{money(product.price)}</span></div>
        {off ? <div className={styles.was}>List Price: {money(product.list)}</div> : null}
        <div className={styles.prime}><b>Free delivery</b> <b className={styles.dark}>Tomorrow</b>. {order}.</div>
        <div className={styles.stock}>In Stock</div>
        <ul className={styles.about}>{product.details.map((d, i) => <li key={`detail-${i}`}>{d}</li>)}</ul>
      </div>
      <div className={styles.reviews}>
        <div className={styles.reviewsHead}>Customer reviews<span>{product.rating} out of 5 · {product.reviews.toLocaleString("en-US")} ratings</span></div>
        {reviewsFor(seed, product.id, 3).map((r) => (
          <div key={r.id} className={styles.review}>
            <b>{r.name}</b>
            <span className={styles.reviewStars}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)} {r.title}</span>
            <span className={styles.reviewMeta}>Reviewed in the United States on {r.date} · Verified Purchase</span>
            {r.text}
          </div>
        ))}
      </div>
    </>
  );
}

function GalleryBody({ product }: { product: Product }) {
  return (
    <>
      {Array.from({ length: GALLERY_IMAGES }, (_, i) => (
        <div key={`${product.id}-photo-${i}`} className={styles.galleryFrame}><Picture product={product} size={390} variant={i} /></div>
      ))}
    </>
  );
}

function CartBody({ items }: { items: readonly Product[] }) {
  if (!items.length) return <div className={styles.empty}>Your Cart is empty</div>;
  return (
    <>
      {items.map((p, i) => (
        <div key={`line-${p.id}-${i}`} className={styles.line}>
          <Picture product={p} size={112} />
          <div>
            <div className={styles.lineName}>{p.name}</div>
            <Price value={p.price} />
            <div className={styles.prime}><b>Free delivery</b> tomorrow</div>
            <div className={styles.qty}>− 1 +</div>
          </div>
        </div>
      ))}
    </>
  );
}

function session(props: ScreenProps): Session {
  const { seed, owner, clock } = props;
  const script = plan(props);
  const panels: Record<string, Panel> = {};
  for (const [id, spec] of Object.entries(script.specs)) {
    if (spec.kind === "browse") {
      panels[id] = {
        top: BROWSE_TOP,
        bottom: 83,
        className: styles.listPanel,
        chrome: <><Header owner={owner} /><div className={styles.dealsStrip}>Lightning deals</div><TabBar items={tabs(0)} active="home" tint="#007185" /></>,
        body: <BrowseBody seed={seed} rows={script.browseRows} />,
      };
    } else if (spec.kind === "results") {
      panels[id] = { top: HEADER, bottom: 83, className: styles.listPanel, chrome: <><Header owner={owner} query={spec.query} back /><TabBar items={tabs(0)} active="home" tint="#007185" /></>, body: <ResultsBody seed={seed} query={spec.query} rows={spec.rows} /> };
    } else if (spec.kind === "product") {
      panels[id] = {
        top: HEADER,
        bottom: 96,
        chrome: <><Header owner={owner} back /><div className={styles.buyBar}><Price value={spec.product.price} /><span className={styles.add}>Add to Cart</span></div></>,
        body: <ProductBody seed={seed} product={spec.product} clock={clock} />,
      };
    } else if (spec.kind === "gallery") {
      panels[id] = { top: 150, className: styles.galleryPanel, chrome: <div className={styles.galleryHead}>{spec.product.name}<Icon name="close" size={22} stroke={2.2} /></div>, body: <GalleryBody product={spec.product} /> };
    } else if (spec.kind === "added") {
      panels[id] = {
        className: styles.addedPanel,
        body: (
          <div className={styles.addedSheet}>
            <div className={styles.addedHead}><Icon name="check" size={22} stroke={2.6} />Added to Cart</div>
            <div className={styles.addedRow}><Picture product={spec.product} size={64} /><span>Cart subtotal ({spec.cart} {spec.cart === 1 ? "item" : "items"}): <b>{money(spec.subtotal)}</b></span></div>
            <div className={styles.add}>Go to Cart</div>
            <div className={styles.ghost}>Continue shopping</div>
          </div>
        ),
      };
    } else {
      const subtotal = spec.items.reduce((sum, p) => sum + p.price, 0);
      panels[id] = {
        top: 196,
        bottom: 83,
        className: styles.listPanel,
        chrome: (
          <>
            <div className={styles.cartHead}>
              <div className={styles.subtotal}>Subtotal <b>{money(subtotal)}</b></div>
              <div className={styles.free}>{subtotal >= 35 ? `Your order qualifies for FREE delivery to ${owner.home}` : `Add ${money(35 - subtotal)} for FREE delivery`}</div>
              <div className={styles.checkout}>Proceed to checkout ({spec.items.length} {spec.items.length === 1 ? "item" : "items"})</div>
            </div>
            <TabBar items={tabs(spec.items.length)} active="cart" tint="#007185" />
          </>
        ),
        body: <CartBody items={spec.items} />,
      };
    }
  }
  return { duration: script.duration, shots: script.shots, panels };
}

/** Today's deal window closes a few hours after the scene starts (fixed for the scene). */
const dealsEnd = (seed: number, sceneStart: number) => ((Math.floor(sceneStart / 60) + 2 + (seed % 5)) * 60) % 1440;

export function ShoppingScreen(props: ScreenProps) {
  const timer = <span className={styles.timer}>Ends in {endsIn(props.clock, dealsEnd(props.seed, props.clock - props.elapsed))}</span>;
  return (
    <div className={styles.screen}>
      <Storyboard id={`${props.view}:${props.seed}:${props.duration}`} elapsed={props.elapsed} build={() => session(props)} live={(panel) => (panel === "browse" ? timer : null)} />
    </div>
  );
}

const shopping: CloneDefinition = {
  Screen: ShoppingScreen,
  tone: () => "dark",
  fixtures: [
    { view: "browse", label: "evening deals", clock: 20 * 60 + 10, duration: 25, seed: 4 },
    { view: "product", label: "product page", clock: 21 * 60 + 25, duration: 10, seed: 6 },
    { view: "cart", label: "cart", clock: 22 * 60 + 5, duration: 6, seed: 2 },
  ],
};

export default shopping;
