const base = "/images/mobiles/feeds";
export const newsSrc = (name: string) => `${base}/${name}.webp`;

export type Story = { img: string; alt: string; section: string; headline: string; dek: string };

export const stories: readonly Story[] = [
  { img: "news-01", alt: "A stone municipal building with a wooden door", section: "New York", headline: "Council Approves Waterfront Rezoning After Eleven-Hour Hearing", dek: "The vote, 33 to 18, clears the way for roughly 4,000 apartments along the Brooklyn shoreline." },
  { img: "news-02", alt: "Demonstrators holding signs on a city street", section: "U.S.", headline: "Thousands March Through Downtown Demanding Lower Rents", dek: "Organizers said the rally was the largest tenant action in the city in a decade." },
  { img: "news-03", alt: "A narrow downtown street lined with tall buildings", section: "Business", headline: "Stocks Slip as Investors Weigh Another Round of Rate Signals", dek: "The S&P 500 fell 0.8 percent, its third decline in four sessions." },
  { img: "news-04", alt: "Dark storm clouds over a city skyline", section: "Weather", headline: "Nor'easter Expected to Bring Flooding to Low-Lying Neighborhoods", dek: "Forecasters warned of up to four inches of rain and gusts above 50 miles per hour by evening." },
  { img: "news-05", alt: "A yellow construction crane beside a building", section: "Real Estate", headline: "Crane Collapse Scare Prompts Review of Midtown Building Permits", dek: "Inspectors halted work at six sites while engineers examine hoisting equipment." },
  { img: "news-06", alt: "A traveler with a rolling bag beside a train platform", section: "Transit", headline: "Signal Failure Snarls Morning Commute on Seven Subway Lines", dek: "Riders reported waits of 40 minutes as crews worked to restore service by midday." },
  { img: "news-07", alt: "A nurse in scrubs working in a hospital", section: "Health", headline: "Nurses at Three Hospitals Vote to Authorize a Strike", dek: "Staffing levels and overtime rules are the central sticking points in the talks." },
  { img: "news-08", alt: "Two voting booths in a polling place", section: "Politics", headline: "Early Voting Opens With Long Lines Across the Five Boroughs", dek: "Election officials said turnout on the first morning outpaced the last midterm cycle." },
  { img: "news-09", alt: "Smoke rising from a wildfire next to a forest", section: "Climate", headline: "Smoke From Western Wildfires Drifts East, Dimming Skies Over the Region", dek: "Air-quality alerts were issued for children, older adults and people with asthma." },
  { img: "news-10", alt: "An airplane parked at a passenger boarding bridge", section: "Travel", headline: "Hundreds of Flights Delayed at Regional Airports by Staffing Gaps", dek: "Airlines advised travelers to check their status before leaving for the airport." },
];

const bylines = ["Maya Okafor", "Daniel Whitfield", "Priya Raman", "Luis Ortega", "Hannah Berg", "Marcus Bell"];
export const bylineAt = (i: number) => bylines[((i % bylines.length) + bylines.length) % bylines.length];

export const paragraphs: readonly string[] = [
  "The decision came late Thursday night, after dozens of residents, union leaders and developers spoke during a hearing that stretched well past midnight. By the end, only a handful of members of the public remained in the chamber.",
  "Supporters said the measure would ease a housing shortage that has pushed the typical monthly rent in the city above $3,600. \"We cannot keep telling people to wait,\" said one council member who backed the proposal.",
  "Opponents argued that the plan does not go far enough to protect existing tenants. Several said the affordability requirements were too easy to sidestep and that the benefits would flow mostly to large landlords.",
  "City officials estimated the changes would take effect within 60 days, though legal challenges are expected. A spokeswoman for the mayor's office said the administration was \"prepared to defend the policy in court.\"",
  "Economists who study the local market said the effects would be gradual. New construction typically takes three to five years to reach residents, and costs for labor and materials remain elevated.",
  "In interviews on the street outside, residents described a mix of hope and fatigue. A teacher who has lived in the neighborhood for 19 years said she had stopped counting how many of her neighbors had moved away.",
  "\"I am not against change,\" she said. \"I just want to know there will still be a place here for the people who made it worth living in.\"",
  "The debate is likely to continue into the winter. Two further hearings are scheduled, and advocacy groups on both sides have promised to keep up pressure on the officials who will carry out the policy.",
  "Data released by the department on Friday showed that complaints about housing conditions rose 12 percent compared with the same period last year, with heat and hot water among the most common problems.",
  "Experts said the broader outlook would depend on interest rates, which have kept many builders from breaking ground. Several projects approved in recent years remain stalled for lack of financing.",
  "Still, some residents said they were cautiously optimistic. \"Every long process starts somewhere,\" said a community organizer who attended the final vote. \"This is not the end of it.\"",
  "Reporting was contributed by members of the metropolitan desk. A version of this article appears in print on Friday, in Section A, Page 18, with the headline above.",
];
