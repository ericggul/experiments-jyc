export const activities = ['All workouts', 'Pilates', 'Strength', 'Yoga', 'Cycling'] as const;
export type Activity = typeof activities[number];
export const dates = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 8, 23 + i)).toISOString().slice(0, 10));
export const dateLabel = (date: string, long = false) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: long ? 'long' : 'short', month: 'short', day: 'numeric' });
export const timeLabel = (minutes: number) => `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${minutes < 720 ? 'AM' : 'PM'}`;

export const studios = [
  { id: 'form', name: 'FORM Pilates', area: 'West Village', address: '72 W 10th St, New York, NY', activity: 'Pilates', rating: '4.9', reviews: '840', photo: 'photo-1518611012118-696072aa579a', alt: 'People stretching together on exercise mats in a bright studio', description: 'Small-group mat work with a focus on control, alignment, and a very good burn. All levels welcome.', bring: 'Wear grip socks. Mats and props are provided. Arrive 10 minutes early.' },
  { id: 'heavy', name: 'Heavy Athletics', area: 'Flatiron', address: '38 W 21st St, New York, NY', activity: 'Strength', rating: '4.8', reviews: '1,206', photo: 'photo-1534438327276-14e5300c3a48', alt: 'Weight-training equipment inside a gym', description: 'Coach-led strength training. Expect supersets, free weights, and time to get your form right. Choose the weights that work for you.', bring: 'Bring indoor sneakers and a water bottle. Towels and lockers are provided.' },
  { id: 'union', name: 'Union Yoga', area: 'East Village', address: '114 E 7th St, New York, NY', activity: 'Yoga', rating: '4.9', reviews: '632', photo: 'photo-1544367567-0f2fcb009e0b', alt: 'Yoga practice on a mat in a sunlit room', description: 'A steady vinyasa practice with room to slow down. Move through standing sequences, floor work, and a proper savasana.', bring: 'Bring a mat or borrow one at the studio. This class is not heated.' },
  { id: 'cadence', name: 'Cadence', area: 'Chelsea', address: '156 W 23rd St, New York, NY', activity: 'Cycling', rating: '4.8', reviews: '973', photo: 'photo-1571019613454-1cb2f99b2d8b', alt: 'A personal training session inside a fitness studio', description: 'A music-led ride with climbs, intervals, and a short upper-body track. Resistance is always yours to set.', bring: 'Cycling shoes are included. Arrive 15 minutes early for bike setup.' },
] as const;

export type Session = { id: string; date: string; start: number; duration: number; studioId: string; name: string; instructor: string; credits: number; spots: number };
const slots = [
  { start: 420, duration: 50, studioId: 'form', name: 'Mat Pilates: Full Body', instructor: 'Grace', credits: 8, spots: 3 },
  { start: 450, duration: 50, studioId: 'heavy', name: 'Lift: Upper Body', instructor: 'Marcus', credits: 7, spots: 6 },
  { start: 540, duration: 60, studioId: 'union', name: 'Open Level Flow', instructor: 'Alex', credits: 6, spots: 8 },
  { start: 735, duration: 45, studioId: 'cadence', name: 'The 45-Minute Ride', instructor: 'Sam', credits: 9, spots: 2 },
  { start: 1050, duration: 50, studioId: 'form', name: 'Mat Pilates: Full Body', instructor: 'Olivia', credits: 10, spots: 2 },
  { start: 1080, duration: 50, studioId: 'heavy', name: 'Lift: Total Body', instructor: 'Chris', credits: 9, spots: 4 },
  { start: 1140, duration: 60, studioId: 'union', name: 'Slow Flow + Restore', instructor: 'Taylor', credits: 6, spots: 5 },
];
export const sessions: Session[] = dates.flatMap((date, day) => slots.map((slot, index) => ({ ...slot, id: `${date}-${index}`, date, start: slot.start + (day % 2 ? 15 : 0) })));
export const studioFor = (session: Session) => studios.find(studio => studio.id === session.studioId)!;
export type Account = { credits: number; booked: string[]; message: string };
export const initialAccount: Account = { credits: 30, booked: [], message: '' };
export function bookingProblem(account: Account, session: Session): string | null {
  if (account.booked.includes(session.id)) return 'You already have a spot in this class.';
  if (account.credits < session.credits) return `You need ${session.credits - account.credits} more credits for this class.`;
  const conflict = sessions.find(other => account.booked.includes(other.id) && other.date === session.date && other.start < session.start + session.duration && session.start < other.start + other.duration);
  return conflict ? `This overlaps with ${conflict.name} at ${timeLabel(conflict.start)}.` : null;
}
export function accountReducer(account: Account, action: { type: 'book' | 'cancel'; id: string }): Account {
  const session = sessions.find(item => item.id === action.id);
  if (!session) return account;
  if (action.type === 'cancel') {
    if (!account.booked.includes(session.id)) return account;
    return { credits: account.credits + session.credits, booked: account.booked.filter(id => id !== session.id), message: `Canceled. ${session.credits} credits returned.` };
  }
  const problem = bookingProblem(account, session);
  if (problem) return { ...account, message: problem };
  return { credits: account.credits - session.credits, booked: [...account.booked, session.id], message: `You're booked for ${session.name}.` };
}
