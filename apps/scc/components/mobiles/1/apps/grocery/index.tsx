import { Icon, Storyboard, type Panel, type Session, type Shot } from "../../ios";
import { createRng, hash } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./grocery.module.css";

const pools: readonly { name: string; items: readonly (readonly [string, string])[] }[] = [
  { name: "Produce", items: [["Baby spinach", "1 bag"], ["Lemons", "3"], ["Roma tomatoes", "6"], ["Yellow onions", "2"], ["Avocados", "4"], ["Garlic", "1 head"], ["Bananas", "1 bunch"], ["Honeycrisp apples", "5"], ["Cilantro", "1 bunch"], ["Sweet potatoes", "3"], ["Blueberries", "1 pint"], ["Scallions", "1 bunch"], ["Ginger", "1 knob"], ["Limes", "4"]] },
  { name: "Dairy & Eggs", items: [["Oat milk", "2"], ["Eggs, large", "1 dozen"], ["Greek yogurt", "32 oz"], ["Parmesan", "1 wedge"], ["Butter", "1 lb"], ["Feta", "8 oz"], ["Whole milk", "½ gal"], ["Cheddar", "1 block"], ["Sour cream", "1 tub"]] },
  { name: "Bakery", items: [["Sourdough loaf", "1"], ["Tortillas", "1 pack"], ["Bagels", "6"], ["Pita", "1 pack"], ["Brioche buns", "4"], ["Croissants", "2"]] },
  { name: "Meat & Fish", items: [["Chicken thighs", "1.5 lb"], ["Salmon fillets", "2"], ["Ground turkey", "1 lb"], ["Bacon", "1 pack"], ["Shrimp", "1 lb"], ["Flank steak", "1 lb"]] },
  { name: "Pantry", items: [["Spaghetti", "2 boxes"], ["Canned chickpeas", "3"], ["Olive oil", "1"], ["Coffee beans", "12 oz"], ["Peanut butter", "1 jar"], ["Jasmine rice", "2 lb"], ["Black beans", "2 cans"], ["Soy sauce", "1"], ["Oats", "1 canister"], ["Crushed tomatoes", "2 cans"]] },
  { name: "Frozen", items: [["Dumplings", "1 bag"], ["Peas", "1 bag"], ["Frozen berries", "1 bag"], ["Pizza", "1"], ["Ice cream", "1 pint"], ["Edamame", "1 bag"]] },
  { name: "Household", items: [["Paper towels", "6 rolls"], ["Dish soap", "1"], ["Trash bags", "1 box"], ["Laundry pods", "1 tub"], ["Sponges", "3 pack"]] },
];
const storeNames = ["Greenleaf", "Corner", "Union", "Bayside", "Fulton", "Hudson", "Myrtle", "Atlantic"];
const storeKinds = ["Market", "Grocer", "Foods", "Co-op"];
const listNames = ["Weekly Shop", "Groceries", "This week", "Dinner stuff", "Costco-free run", "Restock"];
const notes = ["Get the ripe ones", "Whatever's on sale", "Not the low-fat one", "Check the date", "Big one if they have it", "Any brand is fine"];

type Item = { id: string; name: string; qty: string; price: string; note: string };
type Aisle = { id: string; name: string; items: Item[]; skip: number };

function shopping(seed: number): { list: string; store: string; aisles: Aisle[] } {
  const rng = createRng(hash(seed, "list"));
  const chosen = pools.map((pool, index) => ({ pool, index })).filter(({ index }) => index === 0 || rng.chance(0.7)).slice(0, 5);
  const aisles = chosen.map(({ pool, index }) => {
    const offset = rng.int(0, pool.items.length - 1);
    const count = rng.int(4, 6);
    const items = Array.from({ length: Math.min(count, pool.items.length) }, (_, i) => {
      const [name, qty] = pool.items[(offset + i * 2) % pool.items.length];
      return { id: `i${index}-${i}`, name, qty, price: `$${rng.int(1, 12)}.${rng.pick(["29", "49", "99", "79"])}`, note: rng.pick(notes) };
    });
    // Items are distinct within an aisle (step 2 over the pool can repeat for short pools).
    const unique = items.filter((item, i) => items.findIndex((other) => other.name === item.name) === i);
    return { id: `a${index}`, name: pool.name, items: unique, skip: rng.chance(0.35) ? rng.int(1, unique.length - 1) : -1 };
  });
  return { list: rng.pick(listNames), store: `${rng.pick(storeNames)} ${rng.pick(storeKinds)}`, aisles };
}

const HEAD = 176;
const ROW = 42;

function AislePanel({ aisle, done }: { aisle: Aisle; done: boolean }) {
  return (
    <section className={styles.section} style={{ paddingTop: 12 }}>
      <div className={styles.sectionHead}>{aisle.name}</div>
      <div className={styles.items}>
        {aisle.items.map((item, i) => {
          const checked = done && i !== aisle.skip;
          return (
            <div key={item.id} className={styles.item} data-done={checked}>
              <span className={styles.box}>{checked && <Icon name="check" size={14} stroke={3.4} />}</span>
              <div className={styles.itemBody}>{item.name}<span className={styles.qty}>{done && i === aisle.skip ? "Out of stock" : item.qty}</span></div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ItemSheet({ item, aisle, number }: { item: Item; aisle: Aisle; number: number }) {
  return (
    <div className={styles.sheetBody}>
      <h2 className={styles.sheetTitle}>{item.name}</h2>
      <div className={styles.sheetSub}>{item.qty} · {item.price} each · Aisle {number}</div>
      <div className={styles.noteBox}>{item.note}</div>
      <div className={styles.sectionHead} style={{ margin: "16px 0 6px" }}>Also in {aisle.name}</div>
      {aisle.items.filter((other) => other.id !== item.id).slice(0, 3).map((other) => (
        <div key={other.id} className={styles.subRow}>{other.name}<span>{other.price}</span></div>
      ))}
    </div>
  );
}

type ListPlan = { shots: Shot[]; counts: Map<string, number>; total: number };

function listPlan(seed: number, duration: number, aisles: readonly Aisle[]): ListPlan {
  const rng = createRng(hash(seed, "list-shots"));
  const total = Math.max(4, duration);
  const steps: Omit<Shot, "at">[] = [];
  const counts = new Map<string, number>();
  let checked = 0;
  const sheetAisles = [rng.int(0, aisles.length - 1), rng.int(0, aisles.length - 1)];
  aisles.forEach((aisle, k) => {
    const x = 44 + k * 72;
    counts.set(`${aisle.id}-0`, checked);
    steps.push({ panel: `${aisle.id}-0`, enter: k === 0 ? "cut" : "tab", tap: k === 0 ? undefined : { x, y: 144 } });
    checked += aisle.items.length - (aisle.skip >= 0 ? 1 : 0);
    counts.set(`${aisle.id}-1`, checked);
    steps.push({ panel: `${aisle.id}-1`, enter: "cut", tap: { x: 30, y: HEAD + 56 + rng.int(0, aisle.items.length - 1) * ROW } });
    const sheet = sheetAisles.indexOf(k);
    if (sheet >= 0 && !steps.some((step) => step.panel === `item${sheet}`)) {
      steps.push({ panel: `item${sheet}`, enter: "sheet", tap: { x: 180, y: HEAD + 56 + ROW } });
      steps.push({ panel: `${aisle.id}-1`, enter: "dismiss", tap: { x: 195, y: 200 } });
    }
  });
  counts.set("overview", checked);
  steps.push({ panel: "overview", enter: "push", scroll: 220, flicks: 2, tap: { x: 340, y: 76 } });
  // A long shop keeps going: re-check aisles and item notes between laps of the overview.
  let lap = 0;
  while (steps.length * 2.2 < total) {
    const aisle = aisles[lap % aisles.length];
    steps.push({ panel: `${aisle.id}-1`, enter: "pop", tap: { x: 36, y: 76 } });
    steps.push({ panel: "overview", enter: "push", scroll: lap % 2 ? 220 : 60, tap: { x: 340, y: 76 } });
    lap++;
  }
  const dwell = Math.min(2.2, Math.max(1.35, total / steps.length));
  return { shots: steps.map((step, i) => ({ ...step, at: i * dwell })), counts, total };
}

function listSession({ seed, clock, duration }: ScreenProps, data: ReturnType<typeof shopping>, plan: ListPlan): Session {
  const panels: Record<string, Panel> = {};
  data.aisles.forEach((aisle) => {
    panels[`${aisle.id}-0`] = { top: HEAD, bottom: 86, chrome: <Footer clock={clock} store={data.store} />, body: <AislePanel aisle={aisle} done={false} /> };
    panels[`${aisle.id}-1`] = { top: HEAD, bottom: 86, chrome: <Footer clock={clock} store={data.store} />, body: <AislePanel aisle={aisle} done /> };
  });
  const rng = createRng(hash(seed, "list-shots"));
  const sheetAisles = [rng.int(0, data.aisles.length - 1), rng.int(0, data.aisles.length - 1)];
  sheetAisles.forEach((k, i) => {
    const aisle = data.aisles[k];
    panels[`item${i}`] = { className: styles.sheetPanel, top: 380, body: <ItemSheet item={aisle.items[1 % aisle.items.length]} aisle={aisle} number={k * 3 + 2 + (seed % 3)} /> };
  });
  panels.overview = {
    top: HEAD,
    body: (
      <div className={styles.overview}>
        {data.aisles.map((aisle) => (
          <div key={aisle.id} className={styles.overRow}>
            <b>{aisle.name}</b>
            <span>{aisle.items.map((item) => item.name).join(", ")}</span>
          </div>
        ))}
        <div className={styles.overRow}><b>Notes</b><span>Bring the tote bags · {duration > 20 ? "pick up dry cleaning after" : "use the coupon at checkout"}</span></div>
      </div>
    ),
  };
  return { duration: plan.total, shots: plan.shots, panels };
}

function Footer({ clock, store }: { clock: number; store: string }) {
  return <div className={styles.store}><Icon name="pin" size={18} stroke={2} />{store} · {clock < 21 * 60 ? "open until 10 PM" : "open 24 hours"}</div>;
}

/** Header with progress and the aisle tabs for an aisle or overview page; re-rendered per tick. */
function ListHeader({ data, plan, panel, elapsed }: { data: ReturnType<typeof shopping>; plan: ListPlan; panel: string; elapsed: number }) {
  const total = data.aisles.reduce((sum, aisle) => sum + aisle.items.length, 0);
  const lastAisle = [...plan.shots].reverse().find((s) => s.at <= elapsed && /^a\d/.test(s.panel));
  const active = /^a\d/.test(panel) ? panel.split("-")[0] : lastAisle ? lastAisle.panel.split("-")[0] : data.aisles[0].id;
  const done = plan.counts.get(panel) ?? 0;
  return (
    <div className={styles.listHead}>
      <div className={styles.bar}><span><Icon name="chevronLeft" size={20} stroke={2.4} />Lists</span><b>{data.list}</b><Icon name="share" size={20} stroke={2} /></div>
      <div className={styles.meta}><span>{done} of {total}</span><span className={styles.track}><span className={styles.fill} style={{ width: `${(done / total) * 100}%` }} /></span></div>
      <div className={styles.tabs}>{data.aisles.map((aisle) => <span key={aisle.id} data-on={aisle.id === active}>{aisle.name.split(" ")[0]}</span>)}</div>
    </div>
  );
}

function List(props: ScreenProps) {
  const data = shopping(props.seed);
  const plan = listPlan(props.seed, props.duration, data.aisles);
  return (
    <div className={styles.root}>
      <Storyboard
        id={`list:${props.seed}:${props.duration}`}
        elapsed={props.elapsed}
        build={() => listSession(props, data, plan)}
        live={(panel) => (panel.startsWith("item") ? null : <ListHeader data={data} plan={plan} panel={panel} elapsed={props.elapsed} />)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ recipe */

const proteins = [
  ["chicken thighs", "1.5 lb"], ["salmon fillets", "4"], ["chickpeas", "2 cans"], ["shrimp", "1 lb"], ["extra-firm tofu", "1 block"],
  ["pork chops", "4"], ["ground turkey", "1 lb"], ["flank steak", "1.25 lb"], ["cod fillets", "4"], ["eggs", "6"],
] as const;
const sides = [
  ["Roasted Tomatoes", "cherry tomatoes", "1 pint"], ["Herbed Rice", "jasmine rice", "1½ cups"], ["Charred Broccoli", "broccoli", "2 heads"],
  ["Crispy Potatoes", "baby potatoes", "1.5 lb"], ["Spinach Orzo", "orzo", "8 oz"], ["Peanut Noodles", "rice noodles", "8 oz"], ["Black Beans", "black beans", "2 cans"],
] as const;
type Method = { name: string; tag: string; spice: string; extra: readonly (readonly [string, string])[]; steps: readonly (readonly [string, number])[] };
const methods: readonly Method[] = [
  { name: "Sheet Pan", tag: "One pan", spice: "smoked paprika", extra: [["3 tbsp", "olive oil"], ["1", "lemon"], ["1 bunch", "parsley"]],
    steps: [["Heat the oven to 425°F with a sheet pan inside.", 0], ["Toss the {side} with oil, salt and pepper and spread on the pan.", 0], ["Season the {protein} with {spice} and nestle it among the {side}.", 0], ["Roast until browned and cooked through.", 22], ["Rest, squeeze lemon over and scatter parsley.", 4]] },
  { name: "Skillet", tag: "Weeknight dinner", spice: "cumin", extra: [["2 tbsp", "butter"], ["4", "garlic cloves"], ["1", "shallot"]],
    steps: [["Pat the {protein} dry and season with salt and {spice}.", 0], ["Sear in a hot skillet until golden on one side.", 6], ["Flip, add butter and garlic, and baste.", 4], ["Cook the {side} in the same pan.", 8], ["Slice and serve over the {side}.", 0]] },
  { name: "Sesame Stir-Fry", tag: "20 minutes", spice: "white pepper", extra: [["3 tbsp", "soy sauce"], ["1 tbsp", "sesame oil"], ["1 knob", "ginger"], ["4", "scallions"]],
    steps: [["Whisk soy sauce, sesame oil and grated ginger.", 0], ["Get the wok smoking and stir-fry the {protein}.", 5], ["Add scallions and the sauce; toss to glaze.", 2], ["Cook the {side} and drain.", 9], ["Toss everything together and serve hot.", 0]] },
  { name: "Coconut Curry", tag: "Cozy", spice: "curry powder", extra: [["1 can", "coconut milk"], ["1", "yellow onion"], ["2 tbsp", "curry paste"], ["1", "lime"]],
    steps: [["Soften the onion in oil, about 5 minutes.", 5], ["Stir in curry paste and {spice}; cook until fragrant.", 1], ["Add coconut milk and the {protein}; simmer gently.", 15], ["Cook the {side} while the curry simmers.", 0], ["Finish with lime juice and serve over the {side}.", 0]] },
  { name: "Lemon Garlic", tag: "Bright & easy", spice: "chili flakes", extra: [["2", "lemons"], ["5", "garlic cloves"], ["3 tbsp", "olive oil"], ["½ cup", "parmesan"]],
    steps: [["Zest and juice the lemons; slice the garlic.", 0], ["Sizzle garlic and {spice} in olive oil.", 2], ["Cook the {protein} until just done.", 8], ["Fold in the {side} with lemon and a splash of water.", 3], ["Shower with parmesan and serve.", 0]] },
  { name: "Harissa Baked", tag: "Hands-off", spice: "harissa", extra: [["2 tbsp", "harissa"], ["1 cup", "Greek yogurt"], ["1", "red onion"], ["1 bunch", "mint"]],
    steps: [["Heat the oven to 400°F.", 0], ["Rub the {protein} with {spice} and oil.", 0], ["Bake with the {side} until bubbling.", 25], ["Stir mint into the yogurt.", 0], ["Spoon yogurt over and serve.", 0]] },
];
const gradients = [["#e8a33d", "#6d2a14"], ["#cf6a3a", "#5c1f1a"], ["#5f8d4e", "#1f3a1c"], ["#c25b5b", "#4a1a24"], ["#d0a34a", "#5b3d14"], ["#6a7fb0", "#232c4d"]];

type Recipe = { title: string; tag: string; time: number; from: string; to: string; ingredients: [string, string][]; steps: { text: string; timer: number }[] };

function recipeOf(seed: number): Recipe {
  const rng = createRng(hash(seed, "recipe"));
  const method = methods[(seed + rng.int(0, 5)) % methods.length];
  const [protein, amount] = proteins[(seed * 3 + rng.int(0, 9)) % proteins.length];
  const [sideName, sideBase, sideAmount] = sides[(seed * 7 + rng.int(0, 6)) % sides.length];
  const [from, to] = gradients[(seed + rng.int(0, 5)) % gradients.length];
  const steps = method.steps.map(([text, timer]) => ({
    text: text.replaceAll("{protein}", protein).replaceAll("{side}", sideBase).replaceAll("{spice}", method.spice),
    timer,
  }));
  return {
    title: `${method.name} ${protein[0].toUpperCase()}${protein.slice(1)} with ${sideName}`,
    tag: method.tag,
    time: steps.reduce((sum, step) => sum + step.timer, 0) + 10,
    from,
    to,
    ingredients: [[amount, protein], [sideAmount, sideBase], ["1 tsp", method.spice], ...method.extra.map(([a, b]) => [a, b] as [string, string])],
    steps,
  };
}

type RecipePlan = { shots: Shot[]; timers: { label: string; start: number; length: number }[]; total: number };

function recipePlan(seed: number, duration: number, recipe: Recipe): RecipePlan {
  const total = Math.max(4, duration);
  const rng = createRng(hash(seed, "recipe-shots"));
  const shots: Shot[] = [{ panel: "overview", at: 0, enter: "cut", scroll: 330, flicks: 2 }];
  const timers: RecipePlan["timers"] = [];
  const base = (recipe.steps.length + 2) * 1.8;
  const timed = recipe.steps.reduce((sum, step) => sum + step.timer, 0);
  const spare = Math.max(0, total - base);
  let t = 1.8;
  recipe.steps.forEach((step, k) => {
    shots.push({ panel: `step${k}`, at: t, enter: "push", scroll: 0, tap: { x: 195, y: 790 } });
    if (step.timer) timers.push({ label: `Step ${k + 1}`, start: t + 0.6, length: step.timer });
    t += 1.8;
    // While a timer runs, the cook checks the ingredients or reviews and comes back.
    let wait = timed ? (spare * step.timer) / timed : 0;
    let detour = 0;
    while (wait >= 3.6) {
      if (detour % 2 === 0) {
        shots.push({ panel: "overview", at: t, enter: "pop", scroll: rng.pick([200, 330, 420]), tap: { x: 36, y: 76 } });
        t += 1.8;
        shots.push({ panel: `step${k}`, at: t, enter: "push", tap: { x: 195, y: 790 } });
      } else {
        shots.push({ panel: "tips", at: t, enter: "sheet", scroll: 140, tap: { x: 340, y: 76 } });
        t += 1.8;
        shots.push({ panel: `step${k}`, at: t, enter: "dismiss", tap: { x: 195, y: 360 } });
      }
      t += 1.8;
      wait -= 3.6;
      detour++;
    }
  });
  // Plating takes as long as it takes: notes and ingredients until the scene ends.
  const last = `step${recipe.steps.length - 1}`;
  for (let extra = 0; t < total - 2.4; extra++) {
    shots.push(extra % 2 === 0
      ? { panel: "tips", at: t, enter: "sheet", scroll: 140, tap: { x: 340, y: 76 } }
      : { panel: "overview", at: t, enter: "pop", scroll: 260, tap: { x: 36, y: 76 } });
    t += 1.8;
    shots.push({ panel: last, at: t, enter: extra % 2 === 0 ? "dismiss" : "push", tap: { x: 195, y: 360 } });
    t += 1.8;
  }
  shots.push({ panel: "done", at: t, enter: "push", tap: { x: 195, y: 790 } });
  return { shots, timers, total };
}

const tipLines = [
  "Made this twice, add more garlic than you think.", "Doubled the sauce and it was perfect over rice.", "My kids asked for seconds.",
  "Used thighs instead, cooked 5 min longer.", "Great on a weeknight, minimal dishes.", "A squeeze of lime at the end makes it.",
];

function recipeSession(recipe: Recipe, plan: RecipePlan, seed: number): Session {
  const panels: Record<string, Panel> = {
    overview: {
      chrome: <span className={styles.back}><Icon name="chevronLeft" size={20} stroke={2.6} /></span>,
      body: (
        <>
          <div className={styles.hero} style={{ background: `linear-gradient(150deg, ${recipe.from}, ${recipe.to})` }}>
            <small>{recipe.tag}</small>
            <h1>{recipe.title}</h1>
          </div>
          <div className={styles.facts}>
            <div>{recipe.time} min<small>Total time</small></div>
            <div>{4 + (seed % 2) * 2}<small>Servings</small></div>
            <div>{recipe.steps.length} steps<small>Easy</small></div>
          </div>
          <div className={styles.body}>
            <h2 className={styles.h2}>Ingredients</h2>
            {recipe.ingredients.map(([amount, name], i) => (
              <div key={i} className={styles.ingRow} data-done={i < 3}><span className={styles.box}>{i < 3 && <Icon name="check" size={13} stroke={3.4} />}</span><b>{amount}</b>{name}</div>
            ))}
            <div className={styles.startButton}>Start cooking</div>
          </div>
        </>
      ),
    },
    tips: {
      className: styles.sheetPanel,
      top: 330,
      body: (
        <div className={styles.sheetBody}>
          <h2 className={styles.sheetTitle}>Cook&rsquo;s notes</h2>
          {[0, 1, 2, 3].map((i) => <div key={i} className={styles.subRow}>{tipLines[(seed + i) % tipLines.length]}</div>)}
        </div>
      ),
    },
    done: {
      body: (
        <div className={styles.doneCard} style={{ background: `linear-gradient(160deg, ${recipe.from}, ${recipe.to})` }}>
          <Icon name="check" size={44} stroke={2.6} />
          <h1>Enjoy!</h1>
          <p>{recipe.title}</p>
          <span>Rate this recipe ★★★★★</span>
        </div>
      ),
    },
  };
  recipe.steps.forEach((step, k) => {
    panels[`step${k}`] = {
      chrome: (
        <>
          <header className={styles.stepHead}><Icon name="chevronLeft" size={22} stroke={2.4} /><b>Step {k + 1} of {recipe.steps.length}</b><Icon name="paper" size={20} stroke={1.9} /></header>
          <div className={styles.stepNav}><span>Back</span><span data-primary="true">{k === recipe.steps.length - 1 ? "Finish" : "Next"}</span></div>
        </>
      ),
      body: (
        <div className={styles.stepCard}>
          <div className={styles.stepBars}>{recipe.steps.map((_, i) => <i key={i} data-done={i <= k} />)}</div>
          <p>{step.text}</p>
          {step.timer > 0 && <div className={styles.timerChip}><Icon name="clock" size={18} stroke={2} />Timer {step.timer} min</div>}
        </div>
      ),
    };
  });
  return { duration: plan.total, shots: plan.shots, panels };
}

/** Running kitchen timers: re-rendered per tick, on every page but the notes sheet. */
function Timers({ plan, elapsed }: { plan: RecipePlan; elapsed: number }) {
  const running = plan.timers.filter((timer) => elapsed >= timer.start && elapsed < timer.start + timer.length + 2);
  if (!running.length) return null;
  return (
    <div className={styles.timers}>
      {running.slice(-2).map((timer) => {
        const left = Math.ceil(timer.start + timer.length - elapsed);
        return (
          <span key={timer.label} className={styles.timerPill} data-done={left <= 0}>
            <Icon name="clock" size={15} stroke={2.2} />{timer.label} · {left > 0 ? `${left}:00` : "Done"}
          </span>
        );
      })}
    </div>
  );
}

function RecipeView(props: ScreenProps) {
  const recipe = recipeOf(props.seed);
  const plan = recipePlan(props.seed, props.duration, recipe);
  return (
    <div className={styles.root}>
      <Storyboard
        id={`recipe:${props.seed}:${props.duration}`}
        elapsed={props.elapsed}
        build={() => recipeSession(recipe, plan, props.seed)}
        live={(panel) => (panel === "tips" ? null : <Timers plan={plan} elapsed={props.elapsed} />)}
      />
    </div>
  );
}

export function BasketScreen(props: ScreenProps) {
  return props.view === "recipe" ? <RecipeView {...props} /> : <List {...props} />;
}

const basket: CloneDefinition = {
  Screen: BasketScreen,
  fixtures: [
    { view: "list", label: "mid-shop", seed: 4, clock: 18 * 60 + 20, duration: 30 },
    { view: "list", label: "quick run", seed: 12, clock: 11 * 60 + 5, duration: 5 },
    { view: "recipe", label: "cooking dinner", seed: 0, clock: 18 * 60 + 50, duration: 25 },
    { view: "recipe", label: "sheet pan", seed: 1, clock: 19 * 60 + 5, duration: 40 },
  ],
};

export default basket;
