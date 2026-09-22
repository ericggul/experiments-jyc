export type StationId = 'KGX' | 'YRK' | 'EDB';
export const stations: { id: StationId; name: string; area: string; mile: number }[] = [
  { id: 'KGX', name: 'London King’s Cross', area: 'London · N1 9AL', mile: 0 },
  { id: 'YRK', name: 'York', area: 'North Yorkshire · YO24 1AB', mile: 112 },
  { id: 'EDB', name: 'Edinburgh Waverley', area: 'Edinburgh · EH1 1BB', mile: 260 },
];
export type Search = {
  from: StationId; to: StationId; date: string; time: string;
  returnDate: string; returnTime: string; returnTrip: boolean; adults: number; railcard: boolean;
};
export const initialSearch: Search = {
  from: 'KGX', to: 'YRK', date: '2026-09-25', time: '09:00',
  returnDate: '2026-09-27', returnTime: '16:00', returnTrip: true, adults: 1, railcard: false,
};
export type Journey = {
  id: string; from: StationId; to: StationId; date: string; departure: number;
  arrival: number; minutes: number; changes: number; price: number; operator: string;
};
export type Selection = { journey: Journey; flexible: boolean };
export type Ticket = {
  id: string; outbound: Selection; inbound: Selection | null;
  adults: number; railcard: boolean; total: number; cancelled: boolean;
};
export const station = (id: StationId) => stations.find(item => item.id === id)!;
export const gbp = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
export const clock = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
export const dateLabel = (date: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
export const selectionPrice = (choice: Selection) => choice.journey.price + (choice.flexible ? 18 : 0);
export function journeyOptions(search: Search, returning: boolean): Journey[] {
  const from = returning ? search.to : search.from;
  const to = returning ? search.from : search.to;
  const date = returning ? search.returnDate : search.date;
  const time = returning ? search.returnTime : search.time;
  const [hour, minute] = time.split(':').map(Number);
  const start = Math.max(360, Math.ceil((hour * 60 + minute) / 30) * 30);
  const baseMinutes = Math.abs(station(from).mile - station(to).mile);
  const baseFare = baseMinutes > 200 ? 57.9 : baseMinutes > 120 ? 39.5 : 32.8;
  return [0, 1, 2, 3, 4, 5].map(index => {
    const departure = start + index * 30;
    const changes = index === 2 || index === 5 ? 1 : 0;
    const minutes = baseMinutes + (changes ? 28 : index % 2 * 7);
    return { id: `${from}-${to}-${date}-${departure}`, from, to, date, departure,
      arrival: departure + minutes, minutes, changes, operator: 'East Coast Rail',
      price: Math.round((baseFare + [6.2, 0, -4.4, 12.8, 4.6, 1.2][index]) * 100) / 100 };
  }).filter(journey => journey.departure < 1260);
}
export function ticketTotal(outbound: Selection, inbound: Selection | null, adults: number, railcard: boolean) {
  return Math.round((selectionPrice(outbound) + (inbound ? selectionPrice(inbound) : 0)) * (railcard ? adults - 1 + 0.66 : adults) * 100) / 100;
}
export function afterArrival(outbound: Journey, returning: Journey) {
  const out = Date.parse(`${outbound.date}T00:00:00Z`) + outbound.arrival * 60000;
  const back = Date.parse(`${returning.date}T00:00:00Z`) + returning.departure * 60000;
  return back > out;
}
