/* eslint-disable @next/next/no-img-element -- Product photos are local, pre-sized sample photographs. */
import { Icon, TabBar, ios, type TabItem } from "../../ios";
import { createRng, hash } from "../../model/rng";
import { formatTime } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import { endsIn, money, percentOff, productSrc, products, reviewCount, type Product } from "./data";
import styles from "./shopping.module.css";

const tabs = (cart: number): readonly TabItem[] => [
  { id: "home", label: "Home", icon: "house" },
  { id: "categories", label: "Browse", icon: "grid" },
  { id: "deals", label: "Deals", icon: "tag" },
  { id: "cart", label: "Cart", icon: "cart", badge: cart || undefined },
  { id: "account", label: "You", icon: "person" },
];

function Price({ value }: { value: number }) {
  const [whole, cents] = value.toFixed(2).split(".");
  return <span className={styles.price}><sup>$</sup>{whole}<sup>{cents}</sup></span>;
}

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  const full = Math.round(rating);
  return (
    <div className={styles.stars}>
      <span className={styles.starIcons}>{"★".repeat(full)}{"☆".repeat(5 - full)}</span>
      {reviewCount(reviews)}
    </div>
  );
}

/** Seeded order and deal windows: each phone sees a different slice of the day's deals. */
function dealOrder(seed: number) {
  const rng = createRng(hash(seed, "deals"));
  const list = [...products];
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function Header({ owner }: Pick<ScreenProps, "owner">) {
  return (
    <div className={styles.header}>
      <div className={styles.search}><Icon name="search" size={19} stroke={2} />Search Cart<b><Icon name="camera" size={20} /></b></div>
      <div className={styles.deliver}><Icon name="pin" size={16} stroke={2} />Deliver to <b>{owner.firstName} · {owner.home}</b></div>
    </div>
  );
}

function Browse({ seed, elapsed, clock, owner }: ScreenProps) {
  const list = dealOrder(seed);
  const end = 24 * 60 - 1;
  const scroll = Math.min(elapsed * 8, 620);
  return (
    <div className={styles.screen}>
      <Header owner={owner} />
      <div className={styles.viewport}>
        <div className={ios.flow} style={{ transform: `translateY(${-scroll}px)` }}>
          <div className={styles.banner}>Today&apos;s Deals<span className={styles.timer}>Ends in {endsIn(clock, end)}</span></div>
          <div className={styles.grid}>
            {list.map((p, i) => <Tile key={p.id} product={p} index={i} seed={seed} clock={clock} />)}
          </div>
        </div>
      </div>
      <TabBar items={tabs(0)} active="home" tint="#007185" />
    </div>
  );
}

function Tile({ product, index, seed, clock }: { product: Product; index: number; seed: number; clock: number }) {
  const rng = createRng(hash(seed, product.id));
  const left = rng.int(2, 11) * 60 + rng.int(0, 59);
  return (
    <div className={styles.tile}>
      <img src={productSrc(product.img)} alt={product.alt} width={180} height={180} decoding="async" loading={index < 4 ? undefined : "lazy"} />
      <div className={styles.tileBody}>
        <span className={styles.off}>-{percentOff(product)}%</span>
        <div className={styles.deal}>Ends in {endsIn(clock, (clock + left) % 1440)}</div>
        <div className={styles.name}>{product.name}</div>
        <div className={styles.priceRow}><Price value={product.price} /><span className={styles.was}>{money(product.list)}</span></div>
        <Stars rating={product.rating} reviews={product.reviews} />
      </div>
    </div>
  );
}

function ProductPage({ seed, elapsed, clock, owner }: ScreenProps) {
  const p = dealOrder(seed)[0];
  const scroll = Math.min(elapsed * 3, 150);
  const cutoff = 21 * 60;
  const remaining = cutoff - clock;
  const order = remaining > 0 ? `Order within ${Math.floor(remaining / 60)} hrs ${remaining % 60} mins` : `Order by ${formatTime(cutoff)} tomorrow`;
  return (
    <div className={styles.screen}>
      <Header owner={owner} />
      <div className={styles.viewport} style={{ bottom: 0, background: "#fff" }}>
        <div className={ios.flow} style={{ transform: `translateY(${-scroll}px)` }}>
          <div className={styles.gallery}>
            <img src={productSrc(p.img)} alt={p.alt} width={390} height={340} decoding="async" />
            <span className={styles.counter}>1/6</span>
          </div>
          <div className={styles.dots}><i /><i /><i /><i /><i /><i /></div>
          <div className={styles.detail}>
            <div className={styles.name}>{p.name}</div>
            <Stars rating={p.rating} reviews={p.reviews} />
            <div style={{ marginTop: 6 }}><span className={styles.save}>-{percentOff(p)}%</span><span className={styles.big}><sup>$</sup>{Math.floor(p.price)}<sup>{p.price.toFixed(2).split(".")[1]}</sup></span></div>
            <div className={styles.was}>List Price: {money(p.list)}</div>
            <div className={styles.prime}><b>Free delivery</b> <b style={{ color: "#0f1111" }}>Arrives tomorrow</b>. {order}.</div>
            <div className={styles.stock}>In Stock</div>
            <div className={styles.add}>Add to Cart</div>
            <div className={`${styles.add} ${styles.buy}`}>Buy Now</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartPage({ seed, owner }: ScreenProps) {
  const rng = createRng(hash(seed, "cart"));
  const count = rng.int(2, 3);
  const items = dealOrder(seed + 1).slice(0, count).map((p) => ({ p, qty: rng.chance(0.25) ? 2 : 1 }));
  const subtotal = items.reduce((sum, { p, qty }) => sum + p.price * qty, 0);
  const units = items.reduce((sum, { qty }) => sum + qty, 0);
  return (
    <div className={styles.screen}>
      <div className={styles.cartHead}>
        <div className={styles.search}><Icon name="search" size={19} stroke={2} />Search Cart</div>
        <div className={styles.subtotal}>Subtotal <b>{money(subtotal)}</b></div>
        <div className={styles.deliver} style={{ color: "#067d62" }}>Your order qualifies for FREE delivery to {owner.home}</div>
        <div className={styles.checkout}>Proceed to checkout ({units} {units === 1 ? "item" : "items"})</div>
      </div>
      <div className={styles.cartViewport}>
        {items.map(({ p, qty }) => (
          <div key={p.id} className={styles.line}>
            <img src={productSrc(p.img)} alt={p.alt} width={112} height={112} decoding="async" />
            <div>
              <div className={styles.lineName}>{p.name}</div>
              <Price value={p.price} />
              <div className={styles.prime}><b>Free delivery</b> tomorrow</div>
              <div className={styles.qty}><span>{qty === 1 ? "−" : "–"}</span><span>{qty}</span><span>+</span></div>
              <div className={styles.lineActions}>Delete · Save for later</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShoppingScreen(props: ScreenProps) {
  if (props.view === "product") return <ProductPage {...props} />;
  if (props.view === "cart") return <CartPage {...props} />;
  return <Browse {...props} />;
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
