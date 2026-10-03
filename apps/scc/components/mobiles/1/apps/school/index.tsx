import { Icon, type IconName } from "../../ios";
import { createRng } from "../../model/rng";
import { formatTime, weekdayNames } from "../../model/time";
import type { ScreenProps } from "../../model/types";
import type { CloneDefinition } from "../types";
import styles from "./school.module.css";

const teachers = [
  { name: "Ms. Alvarez", role: "3rd grade · Room 204", hue: "#c0563f" },
  { name: "Mr. Okonkwo", role: "Music", hue: "#4d7fb3" },
  { name: "Principal Hale", role: "P.S. 321 Brooklyn", hue: "#5e8c61" },
  { name: "Ms. Bernstein", role: "Art", hue: "#9a63a8" },
];
const kidNames = ["Noah", "Maya", "Leo", "Zoe", "Ezra", "Ivy", "Mateo", "Ruby"];
const posts = [
  "We finished our unit on fractions today! Ask your scholar to show you how to fold paper into eighths. Reading logs are due Thursday.",
  "Photos from this morning's science lab are up. We grew crystals and the class named them all. Please send a spare change of clothes for recess.",
  "Reminder that picture retakes are next Tuesday. Wear a favorite shirt! Spirit day on Friday: school colors, blue and gold.",
  "Quiet reading corner got new books thanks to the PTA book fair. If you can volunteer on Wednesday between 9 and 11, reply here.",
];

function Updates({ seed, clock, weekday }: ScreenProps) {
  const rng = createRng(seed);
  const kids = [rng.pick(kidNames)];
  let second = rng.pick(kidNames);
  while (second === kids[0]) second = rng.pick(kidNames);
  kids.push(second);
  const lunch = rng.range(2.1, 4.8).toFixed(2);
  const dismissal = rng.pick([12 * 60 + 30, 13 * 60, 14 * 60 + 45]);
  const teacherA = teachers[seed % teachers.length];
  const teacherB = teachers[(seed + 2) % teachers.length];
  const due = weekdayNames[Math.min(4, weekday + 2)];
  const alerts: readonly { id: string; tone: string; icon: IconName; hue: string; title: string; body: string; action: string }[] = [
    { id: "form", tone: "due", icon: "paper", hue: "#ff9500", title: `Field trip form due ${due}`, body: `${kids[0]}'s class visits the Museum of Natural History. Permission slip and $12 fee.`, action: "Sign form" },
    { id: "lunch", tone: "low", icon: "card", hue: "#ff3b30", title: "Lunch balance is low", body: `${kids[1]} has $${lunch} left, about ${Math.floor(Number(lunch) / 1.75)} lunches.`, action: "Add funds" },
    { id: "pickup", tone: "info", icon: "clock", hue: "#007aff", title: "Early dismissal today", body: `Pickup at ${formatTime(dismissal)} for all grades. After-care runs as usual.`, action: "Got it" },
  ];
  const order = clock < 12 * 60 ? [2, 0, 1] : [1, 0, 2];
  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div className={styles.bar}><span>Classes</span><Icon name="bell" size={22} stroke={1.9} /></div>
        <h1 className={styles.title}>Homeroom</h1>
        <div className={styles.kids}>
          {kids.map((kid, index) => <span key={kid} className={styles.kid} data-on={index === 0}><i>{kid[0]}</i>{kid}</span>)}
          <span className={styles.kid}><i>+</i>All</span>
        </div>
      </div>
      <div className={styles.feed}>
        {order.slice(0, 2).map((index) => {
          const item = alerts[index];
          return (
            <div key={item.id} className={styles.alert} data-tone={item.tone}>
              <span className={styles.ico} style={{ background: item.hue }}><Icon name={item.icon} size={20} stroke={2} /></span>
              <div><b>{item.title}</b><p>{item.body}</p><span className={styles.btn} data-quiet={item.id === "pickup"}>{item.action}</span></div>
            </div>
          );
        })}
        {[teacherA, teacherB].map((teacher, index) => (
          <div key={teacher.name} className={styles.card}>
            <div className={styles.who}>
              <span className={styles.face} style={{ background: teacher.hue }}>{teacher.name.split(" ").map((p) => p[0]).slice(-2).join("")}</span>
              <div><b>{teacher.name}</b><small>{teacher.role} · {formatTime(clock - 40 - index * 190)}</small></div>
            </div>
            <div className={styles.text}>{posts[(seed + index) % posts.length]}</div>
            <div className={styles.reactions}><span><Icon name="heart" size={15} stroke={1.9} />{rng.int(8, 41)}</span><span><Icon name="bubble" size={15} stroke={1.9} />{rng.int(0, 6)}</span></div>
          </div>
        ))}
        {order.slice(2).map((index) => {
          const item = alerts[index];
          return (
            <div key={item.id} className={styles.alert} data-tone={item.tone}>
              <span className={styles.ico} style={{ background: item.hue }}><Icon name={item.icon} size={20} stroke={2} /></span>
              <div><b>{item.title}</b><p>{item.body}</p><span className={styles.btn} data-quiet={item.id === "pickup"}>{item.action}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HomeroomScreen(props: ScreenProps) {
  return <Updates {...props} />;
}

const homeroom: CloneDefinition = {
  Screen: HomeroomScreen,
  fixtures: [
    { view: "updates", label: "morning drop-off", seed: 2, clock: 8 * 60 + 25, duration: 4 },
    { view: "updates", label: "lunch balance", seed: 5, clock: 12 * 60 + 40, duration: 3 },
    { view: "updates", label: "pickup run", seed: 8, clock: 14 * 60 + 20, duration: 3 },
  ],
};

export default homeroom;
