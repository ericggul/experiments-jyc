import { createRng, hash, type Rng } from "../../model/rng";

const base = "/images/mobiles/feeds";
export const newsSrc = (name: string) => `${base}/${name}.webp`;

const photos: Record<string, readonly { img: string; alt: string }[]> = {
  city: [{ img: "news-01", alt: "A stone municipal building with a wooden door" }, { img: "post-05", alt: "A street intersection seen from above" }],
  protest: [{ img: "news-02", alt: "Demonstrators holding signs on a city street" }],
  money: [{ img: "news-03", alt: "A narrow downtown street lined with tall buildings" }],
  weather: [{ img: "news-04", alt: "Dark storm clouds over a city skyline" }, { img: "clip-03", alt: "Rain on a window with city lights behind" }],
  building: [{ img: "news-05", alt: "A yellow construction crane beside a building" }, { img: "post-09", alt: "The Manhattan skyline under a pale sky" }],
  transit: [{ img: "news-06", alt: "A traveler beside a train platform" }, { img: "clip-04", alt: "A train pulling into an elevated station" }],
  health: [{ img: "news-07", alt: "A nurse in scrubs working in a hospital" }],
  vote: [{ img: "news-08", alt: "Two voting booths in a polling place" }],
  climate: [{ img: "news-09", alt: "Smoke rising from a wildfire next to a forest" }, { img: "clip-08", alt: "A beach at sunset" }],
  travel: [{ img: "news-10", alt: "An airplane at a passenger boarding bridge" }],
  food: [{ img: "post-07", alt: "A bowl of ramen on a wooden table" }, { img: "post-02", alt: "A pizza on a dark wooden table" }, { img: "clip-06", alt: "A street food cart at night" }],
  culture: [{ img: "post-06", alt: "A woman in front of a tall bookshelf" }, { img: "clip-07", alt: "Dancers rehearsing on a dim stage" }],
  parks: [{ img: "story-04", alt: "A park bench under autumn trees" }, { img: "clip-05", alt: "Two dogs resting on autumn leaves" }],
};

type Template = { section: string; photo: keyof typeof photos; make: (rng: Rng) => [string, string] };

const boroughs = ["Brooklyn", "Queens", "the Bronx", "Staten Island", "Manhattan"];
const hoods = ["Sunset Park", "Astoria", "Mott Haven", "Bushwick", "Inwood", "Flatbush", "Long Island City", "Harlem", "Red Hook", "Jamaica", "Gowanus", "Chinatown"];
const lines = ["A", "C", "F", "G", "L", "N", "Q", "R", "2", "4", "6", "7"];
const numberWord = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

const templates: readonly Template[] = [
  { section: "New York", photo: "city", make: (r) => { const n = r.int(18, 41); return [`Council Approves ${r.pick(["Waterfront Rezoning", "Basement Apartment Rules", "Bike Lane Expansion", "Street Vendor Permits", "Composting Mandate"])} After ${r.pick(["Eleven", "Nine", "Marathon", "Heated"])}-Hour Hearing`, `The vote, ${n} to ${51 - n}, sends the measure to the mayor, who is expected to sign it within days.`]; } },
  { section: "New York", photo: "protest", make: (r) => [`${r.pick(["Thousands", "Hundreds", "Tenants", "Delivery Workers", "Teachers"])} March ${r.pick(["Across the Brooklyn Bridge", "Through Lower Manhattan", "to City Hall", "in " + r.pick(hoods)])} Demanding ${r.pick(["Lower Rents", "Higher Pay", "Safer Streets", "Smaller Classes"])}`, `Organizers said the rally was the largest of its kind in ${r.pick(boroughs)} in ${r.pick(["a decade", "years", "a generation"])}.`] },
  { section: "Business", photo: "money", make: (r) => [`Stocks ${r.pick(["Slip", "Rally", "Wobble", "Climb"])} as Investors Weigh ${r.pick(["Another Round of Rate Signals", "Strong Jobs Data", "Weak Retail Sales", "Earnings From Big Banks"])}`, `The broad market index ${r.pick(["fell", "rose"])} ${r.int(2, 19) / 10} percent, its ${r.pick(["third", "fourth", "second"])} move in that direction this week.`] },
  { section: "Weather", photo: "weather", make: (r) => [`${r.pick(["Nor'easter", "Coastal Storm", "Heavy Rain", "First Frost", "Wind Advisory"])} Expected to ${r.pick(["Bring Flooding to Low-Lying Neighborhoods", "Snarl the Evening Commute", "Linger Through the Weekend", "Topple Trees Across " + r.pick(boroughs)])}`, `Forecasters warned of up to ${r.int(2, 5)} inches of rain and gusts near ${r.int(35, 60)} miles per hour.`] },
  { section: "Real Estate", photo: "building", make: (r) => [`${r.pick(["Median Rent", "Asking Rent", "Co-op Prices", "Office Vacancies"])} in ${r.pick(hoods)} ${r.pick(["Hits a Record", "Falls for the First Time in Years", "Jumps 9 Percent", "Levels Off"])}`, `Brokers said ${r.pick(["bidding wars", "concessions", "empty storefronts", "waitlists"])} have become common across ${r.pick(boroughs)}.`] },
  { section: "Transit", photo: "transit", make: (r) => [`${r.pick(["Signal Failure", "Track Fire", "Power Outage", "Flooded Station"])} Snarls Morning Commute on the ${r.pick(lines)} and ${r.pick(lines)} Lines`, `Riders reported waits of ${r.int(15, 50)} minutes as crews worked to restore service by ${r.pick(["midday", "noon", "the evening rush"])}.`] },
  { section: "Transit", photo: "transit", make: (r) => [`${r.pick(lines)} Train Weekend Service to Be Suspended for ${numberWord[r.int(0, 7)]} Weeks`, `Shuttle buses will run between ${r.pick(hoods)} and ${r.pick(hoods)} while crews replace aging track.`] },
  { section: "Health", photo: "health", make: (r) => [`Nurses at ${numberWord[r.int(0, 5)]} Hospitals Vote to ${r.pick(["Authorize a Strike", "Accept a New Contract", "Extend Talks"])}`, `${r.pick(["Staffing levels", "Overtime rules", "Pay raises"])} are the central sticking point in the negotiations.`] },
  { section: "Health", photo: "health", make: (r) => [`${r.pick(["Flu", "RSV", "Covid"])} Cases Rise ${r.pick(["Early", "Sharply", "Again"])} as City Opens ${r.int(20, 90)} Free Vaccine Sites`, "Health officials urged older adults and parents of young children to get shots before the holidays."] },
  { section: "Politics", photo: "vote", make: (r) => [`Early Voting ${r.pick(["Opens With Long Lines", "Draws Record Turnout", "Gets Off to a Slow Start"])} in ${r.pick(["the Five Boroughs", boroughs[r.int(0, 4)], "the Suburbs"])}`, "Election officials said turnout on the first morning outpaced the last midterm cycle."] },
  { section: "Politics", photo: "city", make: (r) => [`Mayor Unveils ${r.pick(["$2 Billion", "$800 Million", "$5 Billion", "$350 Million"])} Plan for ${r.pick(["Affordable Housing", "Flood Walls", "Library Hours", "School Repairs", "Street Safety"])}`, `Critics on the council called the proposal ${r.pick(["overdue", "too modest", "a reshuffling of existing funds"])}.`] },
  { section: "Climate", photo: "climate", make: (r) => [`${r.pick(["Smoke From Western Wildfires", "Record Ocean Heat", "A Warm October", "Rising Seas"])} ${r.pick(["Drifts East, Dimming Skies", "Raises Alarms Along the Coast", "Confuses Fall Foliage", "Threaten Rockaway Beaches"])}`, "Scientists said the pattern is becoming more frequent and harder to predict."] },
  { section: "Travel", photo: "travel", make: (r) => [`${r.pick(["Hundreds of Flights", "Dozens of Trains", "Holiday Travel Plans"])} ${r.pick(["Delayed", "Canceled", "Disrupted"])} at Regional ${r.pick(["Airports", "Hubs", "Terminals"])} by ${r.pick(["Staffing Gaps", "Storms", "a Systems Outage"])}`, "Travelers were advised to check their status before leaving home."] },
  { section: "Food", photo: "food", make: (r) => [`The ${numberWord[r.int(2, 7)]} Best New ${r.pick(["Dumpling Spots", "Pizza Places", "Bakeries", "Bodega Sandwiches", "Taquerias"])} in ${r.pick(boroughs)}`, `Our critic ate her way across ${r.pick(hoods)} so you don't have to.`] },
  { section: "Arts", photo: "culture", make: (r) => [`${r.pick(["A Tiny Theater", "A Beloved Bookstore", "A Jazz Club", "A Dance Company"])} in ${r.pick(hoods)} ${r.pick(["Is Saved by Its Neighbors", "Turns 50", "Faces Eviction", "Finds a New Home"])}`, `Regulars packed the room on ${r.pick(["Tuesday", "Friday", "Sunday"])} night to mark the moment.`] },
  { section: "New York", photo: "parks", make: (r) => [`${r.pick(["Prospect Park", "Central Park", "Flushing Meadows", "Van Cortlandt Park"])} ${r.pick(["Gets a New Skating Rink", "Will Close a Loop to Cars", "Loses 40 Trees to Storm", "Adds Late-Night Hours"])}`, `Park officials said the change would take effect ${r.pick(["next month", "this spring", "immediately"])}.`] },
];

const opinionTitles = ["The City Can't Keep Asking Renters to Wait", "Let Us Have Our Bodegas", "The Subway Is Still the Best Thing About New York", "We Need to Talk About Delivery Apps", "Why I Finally Gave Up My Car", "In Defense of the Dollar Slice", "Our Schools Deserve Better Buildings", "Stop Building Glass Towers on the Waterfront"];
const authors = ["Maya Okafor", "Daniel Whitfield", "Priya Raman", "Luis Ortega", "Hannah Berg", "Marcus Bell", "Grace Liu", "Sam Adeyemi", "Elena Petrova", "Jordan Price"];
export const bylineAt = (i: number) => authors[((i % authors.length) + authors.length) % authors.length];

export type Story = {
  id: string;
  kind: "photo" | "opinion" | "live";
  section: string;
  headline: string;
  dek: string;
  img: string | null;
  alt: string;
  byline: string;
  age: number;
  minutes: number;
};

/** Story `index` for a list (`list` names the section or front); drawn from the seed. */
export function storyAt(seed: number, list: string, index: number): Story {
  const rng = createRng(hash(seed, list, index));
  const id = `${list}-${index}`;
  const byline = rng.pick(authors);
  if (index > 2 && rng.chance(0.12)) {
    return { id, kind: "opinion", section: "Opinion", headline: rng.pick(opinionTitles), dek: "", img: null, alt: "", byline, age: rng.int(30, 600), minutes: rng.int(4, 9) };
  }
  const options = list === "front" ? templates : templates.filter((t) => t.section === list);
  const template = options.length ? rng.pick(options) : rng.pick(templates);
  const [headline, dek] = template.make(rng);
  const photo = rng.pick(photos[template.photo]);
  return { id, kind: "photo", section: template.section, headline, dek, img: rng.chance(0.85) ? photo.img : null, alt: photo.alt, byline, age: rng.int(4, 400), minutes: rng.int(3, 14) };
}

export const liveTopics = ["Nor'easter Live Updates", "Election Night Live", "Subway Outage: Live Updates", "Nurses' Strike: Latest", "Heat Wave Live Updates", "Council Budget Vote: Live"];

const liveLines = [
  "Officials said they expected an update within the hour.", "Crews have been dispatched to three locations in Brooklyn.",
  "Here is what we know so far.", "The mayor is scheduled to speak at a news conference shortly.", "Service has been partially restored on two lines.",
  "Residents in low-lying areas were urged to move cars to higher ground.", "A spokesperson declined to comment on the timeline.",
  "Our reporters are on the scene in Queens.", "Photos: what it looks like on the ground.", "Readers have sent in dozens of questions. We answer a few.",
  "The governor declared a state of emergency for the region.", "Turnout figures have been updated.",
];

export function liveEntries(seed: number, count: number) {
  const rng = createRng(hash(seed, "live"));
  let ago = rng.int(1, 4);
  return Array.from({ length: count }, (_, i) => {
    const entry = { id: `live-${i}`, ago, title: rng.pick(liveLines), body: rng.pick(paragraphs).split(". ").slice(0, 2).join(". ") };
    ago += rng.int(4, 17);
    return entry;
  });
}

export const paragraphs: readonly string[] = [
  "The decision came late Thursday night, after dozens of residents, union leaders and developers spoke during a hearing that stretched well past midnight. By the end, only a handful of members of the public remained in the chamber.",
  "Supporters said the measure would ease a shortage that has pushed the typical monthly rent in the city above $3,600. \"We cannot keep telling people to wait,\" said one council member who backed the proposal.",
  "Opponents argued that the plan does not go far enough to protect existing tenants. Several said the requirements were too easy to sidestep and that the benefits would flow mostly to large landlords.",
  "City officials estimated the changes would take effect within 60 days, though legal challenges are expected. A spokeswoman for the mayor's office said the administration was \"prepared to defend the policy in court.\"",
  "Economists who study the local market said the effects would be gradual. New construction typically takes three to five years to reach residents, and costs for labor and materials remain elevated.",
  "In interviews on the street outside, residents described a mix of hope and fatigue. A teacher who has lived in the neighborhood for 19 years said she had stopped counting how many of her neighbors had moved away.",
  "\"I am not against change,\" she said. \"I just want to know there will still be a place here for the people who made it worth living in.\"",
  "The debate is likely to continue into the winter. Two further hearings are scheduled, and advocacy groups on both sides have promised to keep up pressure on the officials who will carry out the policy.",
  "Data released by the department on Friday showed that complaints rose 12 percent compared with the same period last year, with heat and hot water among the most common problems.",
  "Experts said the broader outlook would depend on interest rates, which have kept many builders from breaking ground. Several projects approved in recent years remain stalled for lack of financing.",
  "Still, some residents said they were cautiously optimistic. \"Every long process starts somewhere,\" said a community organizer who attended the final vote. \"This is not the end of it.\"",
  "Commuters at the Atlantic Avenue station said they had grown used to delays but that this week felt different. \"You plan for 20 minutes extra,\" one rider said. \"Now it's 40.\"",
  "A review of public records shows the agency had flagged the problem at least twice in the past three years, but repairs were repeatedly postponed for budget reasons.",
  "At a bakery on the corner, the owner said business had slowed since the spring. She has cut her hours and now opens at 7 instead of 6.",
  "Reporting was contributed by members of the metropolitan desk. A version of this article appears in print on Friday, in Section A, Page 18.",
];
