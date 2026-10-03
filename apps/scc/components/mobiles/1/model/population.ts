import { archetypeWeights, personas } from "./personas.ts";
import { createRng, hash } from "./rng.ts";
import type { Owner } from "./types.ts";

const firstNames = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Mia", "Lucas", "Sofia", "Mason", "Aaliyah", "Jayden",
  "Priya", "Arjun", "Mei", "Kenji", "Hana", "Min-jun", "Ji-woo", "Diego", "Camila", "Mateo", "Valentina", "Luis",
  "Imani", "Malik", "Zara", "Omar", "Fatima", "Yusuf", "Chloe", "Daniel", "Grace", "Samuel", "Leah", "Eli",
  "Nadia", "Andrei", "Katya", "Tomás", "Rosa", "Kwame", "Amara", "Tenzin", "Linh", "Bao", "Siobhan", "Declan",
  "Maya", "Jordan", "Taylor", "Riley", "Noor", "Isaac", "Esther", "Marcus", "Destiny", "Xavier", "Ana", "Wei",
];
const lastNames = [
  "Carter", "Nguyen", "Patel", "Brooks", "Rivera", "Kim", "Walsh", "Shah", "Lopez", "Reed", "Johnson", "Williams",
  "Garcia", "Martinez", "Chen", "Wang", "Park", "Choi", "Okafor", "Mensah", "Haddad", "Khan", "Cohen", "Goldberg",
  "O'Brien", "Murphy", "Rossi", "Esposito", "Kowalski", "Novak", "Ivanova", "Santos", "Ramirez", "Torres", "Jackson",
  "Washington", "Thompson", "Singh", "Gupta", "Tanaka", "Sato", "Ali", "Hussein", "Mendoza", "Castillo", "Baptiste",
  "Pierre", "Dubois", "Levy", "Friedman", "Diaz", "Morales", "Ortiz", "Hernandez", "Yilmaz", "Zhou", "Lin", "Adeyemi",
];

const round5 = (minute: number) => Math.round(minute / 5) * 5;

/**
 * One owner per seat: an archetype drawn by weight, then a name, a home and
 * work neighbourhood from that archetype's places, and the usual alarm.
 */
export function createPopulation(count: number, seed = 1): Owner[] {
  return Array.from({ length: count }, (_, index) => {
    const rng = createRng(hash("owner", seed, index));
    const archetype = rng.weighted(archetypeWeights);
    const persona = personas[archetype];
    const alarm = persona.alarm === null ? null : round5(persona.alarm + rng.normal(0, persona.alarmSd));
    return {
      id: `p${String(index + 1).padStart(3, "0")}`,
      archetype,
      firstName: rng.pick(firstNames),
      lastName: rng.pick(lastNames),
      home: rng.pick(persona.places.home),
      work: rng.pick(persona.places.work),
      alarm,
      seed: hash("person", seed, index),
    };
  });
}
