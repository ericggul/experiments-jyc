import { Icon } from "../../ios";
import { createRng } from "../../model/rng";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./grocery.module.css";

const aisles: readonly { name: string; items: readonly (readonly [string, string])[] }[] = [
  { name: "Produce", items: [["Baby spinach", "1 bag"], ["Lemons", "3"], ["Roma tomatoes", "6"], ["Yellow onions", "2"], ["Avocados", "4"], ["Garlic", "1 head"]] },
  { name: "Dairy & Eggs", items: [["Oat milk", "2"], ["Eggs, large", "1 dozen"], ["Greek yogurt", "32 oz"], ["Parmesan", "1 wedge"]] },
  { name: "Bakery", items: [["Sourdough loaf", "1"], ["Tortillas", "1 pack"]] },
  { name: "Pantry", items: [["Spaghetti", "2 boxes"], ["Canned chickpeas", "3"], ["Olive oil", "1"], ["Coffee beans", "12 oz"], ["Peanut butter", "1 jar"]] },
  { name: "Frozen", items: [["Dumplings", "1 bag"], ["Peas", "1 bag"]] },
];

function List({ seed, elapsed, duration, clock }: ScreenProps) {
  const rng = createRng(seed);
  const all = aisles.flatMap((aisle) => aisle.items.map((item) => ({ aisle: aisle.name, name: item[0], qty: item[1] })));
  const kept = all.filter(() => rng.chance(0.72));
  const total = kept.length;
  const base = Math.floor(total * 0.1);
  const done = Math.min(total, base + Math.floor((elapsed / Math.max(1, duration)) * total * 0.75));
  const shown = new Set(kept.slice(0, done).map((item) => item.name));
  const visible = aisles
    .map((aisle) => ({ name: aisle.name, items: kept.filter((item) => item.aisle === aisle.name) }))
    .filter((aisle) => aisle.items.length > 0)
    .slice(0, 4);
  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div className={styles.bar}><span>Lists</span><Icon name="plus" size={24} stroke={2.2} /></div>
        <h1 className={styles.title}>Weekly Shop</h1>
        <div className={styles.meta}><span>{shown.size} of {total}</span><span className={styles.track}><div className={styles.fill} style={{ width: `${(shown.size / total) * 100}%` }} /></span></div>
      </div>
      {visible.map((aisle) => (
        <section key={aisle.name} className={styles.section}>
          <div className={styles.sectionHead}>{aisle.name}</div>
          <div className={styles.items}>
            {aisle.items.slice(0, 5).map((item) => (
              <div key={item.name} className={styles.item} data-done={shown.has(item.name)}>
                <span className={styles.box}>{shown.has(item.name) && <Icon name="check" size={14} stroke={3.4} />}</span>
                <div className={styles.itemBody}>{item.name}<span className={styles.qty}>{item.qty}</span></div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className={styles.store}><Icon name="pin" size={18} stroke={2} />{clock < 17 * 60 ? "Greenleaf Market, 0.4 mi" : "Corner Market, open until 10 PM"}</div>
    </div>
  );
}

const recipes = [
  { title: "Lemon Garlic Chickpea Pasta", tag: "Weeknight dinner", time: 25, from: "#e8a33d", to: "#6d2a14",
    ingredients: [["12 oz", "spaghetti"], ["1 can", "chickpeas"], ["4", "garlic cloves"], ["2", "lemons"], ["3 tbsp", "olive oil"], ["2 cups", "baby spinach"], ["1/2 cup", "parmesan"], ["1 tsp", "chili flakes"]],
    steps: ["Boil salted water and cook the spaghetti until al dente. Save a cup of pasta water.", "Warm the olive oil over medium heat and sizzle the sliced garlic for 1 minute.", "Add the drained chickpeas and chili flakes; cook until golden, about 6 minutes.", "Toss in the pasta, spinach, lemon zest and juice with a splash of pasta water.", "Finish with parmesan and black pepper. Serve hot."] },
  { title: "Sheet Pan Chicken & Roasted Tomatoes", tag: "One pan", time: 40, from: "#cf6a3a", to: "#5c1f1a",
    ingredients: [["1.5 lb", "chicken thighs"], ["1 pint", "cherry tomatoes"], ["2", "yellow onions"], ["3 tbsp", "olive oil"], ["4", "garlic cloves"], ["1 tsp", "smoked paprika"], ["1", "lemon"], ["1 bunch", "parsley"]],
    steps: ["Heat the oven to 425°F with a sheet pan inside.", "Toss chicken, onions and tomatoes with oil, garlic, paprika and salt.", "Roast skin side up for 25 to 30 minutes until browned.", "Squeeze lemon over the pan and scatter parsley before serving."] },
];

function Recipe({ seed, elapsed, duration }: ScreenProps) {
  const recipe = recipes[seed % recipes.length];
  const stepIndex = Math.min(recipe.steps.length - 1, Math.floor((elapsed / Math.max(1, duration)) * recipe.steps.length));
  return (
    <div className={styles.root}>
      <div className={styles.hero} style={{ background: `linear-gradient(150deg, ${recipe.from}, ${recipe.to})` }}>
        <small>{recipe.tag}</small>
        <h1>{recipe.title}</h1>
      </div>
      <div className={styles.facts}>
        <div>{recipe.time} min<small>Total time</small></div>
        <div className={styles.servings}><span className={styles.stepper}><Icon name="plus" size={12} stroke={3} style={{ transform: "rotate(45deg)" }} /></span>4<span className={styles.stepper}><Icon name="plus" size={12} stroke={3} /></span></div>
        <div>Easy<small>Servings · Level</small></div>
      </div>
      <div className={styles.body}>
        <h2 className={styles.h2}>Ingredients</h2>
        <div className={styles.ing}>{recipe.ingredients.map(([amount, name]) => <span key={name}><b>{amount}</b>{name}</span>)}</div>
        <h2 className={styles.h2}>Steps</h2>
        {recipe.steps.slice(Math.max(0, stepIndex - 1), Math.max(0, stepIndex - 1) + 3).map((text, offset) => {
          const index = Math.max(0, stepIndex - 1) + offset;
          return (
            <div key={text} className={styles.step} data-state={index < stepIndex ? "done" : index === stepIndex ? "now" : "todo"}>
              <span className={styles.num}>{index < stepIndex ? <Icon name="check" size={12} stroke={3.4} /> : index + 1}</span>
              <div>{text}{index === stepIndex && <div className={styles.timer}>Step {index + 1} of {recipe.steps.length}</div>}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BasketScreen(props: ScreenProps) {
  return props.view === "recipe" ? <Recipe {...props} /> : <List {...props} />;
}

const basket: CloneDefinition = {
  Screen: BasketScreen,
  fixtures: [
    { view: "list", label: "mid-shop", seed: 4, clock: 18 * 60 + 20, duration: 30 },
    { view: "list", label: "sunday prep", seed: 12, clock: 11 * 60 + 5, duration: 20 },
    { view: "recipe", label: "cooking dinner", seed: 0, clock: 18 * 60 + 50, duration: 25 },
    { view: "recipe", label: "sheet pan", seed: 1, clock: 19 * 60 + 5, duration: 40 },
  ],
};

export default basket;
