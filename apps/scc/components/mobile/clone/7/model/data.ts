export const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;
export const dollars = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export type Dish = { id: string; name: string; description: string; price: number; image: string; alt: string; extra: string; extraPrice: number };
export type Restaurant = { id: string; name: string; category: string; neighborhood: string; address: string; rating: string; reviews: string; minutes: number; fee: number; image: string; alt: string; description: string; menu: Dish[] };
const pizza = photo('photo-1513104890138-7c749659a591');
const burger = photo('photo-1568901346375-23c9450c58cd');
const greens = photo('photo-1512621776951-a57141f2eefd');
const ramen = photo('photo-1569718212165-3a8278d5f624');
const tacos = photo('photo-1565299585323-38d6b0865b47');
export const restaurants: Restaurant[] = [
  { id: 'slice', name: 'Corner Slice', category: 'Pizza', neighborhood: 'East Village', address: '112 Avenue A, New York, NY', rating: '4.8', reviews: '2.1k+', minutes: 20, fee: 199, image: pizza, alt: 'A freshly baked pizza topped with tomato and basil', description: 'Thin crust. Big fold. Your neighborhood pie shop, from the first slice to the last garlic knot.', menu: [
    { id: 'slice-pie', name: 'The neighborhood pie', description: '18-inch pie, crushed tomatoes, fresh mozzarella, basil. Feeds 3–4.', price: 2600, image: pizza, alt: 'Tomato and basil pizza', extra: 'Extra mozzarella', extraPrice: 300 },
    { id: 'slice-cheese', name: 'Four-cheese pie', description: '18-inch pie with mozzarella, ricotta, provolone and pecorino.', price: 2900, image: photo('photo-1579751626657-72bc17010498'), alt: 'A baked cheese pizza', extra: 'Hot honey on the side', extraPrice: 200 },
    { id: 'slice-small', name: 'Personal margherita', description: 'A 10-inch tomato, mozzarella and basil pie. All yours.', price: 1400, image: pizza, alt: 'A tomato and basil pizza', extra: 'Extra basil', extraPrice: 100 },
  ] },
  { id: 'smash', name: 'Double Double', category: 'Burgers', neighborhood: 'Lower East Side', address: '84 Orchard St, New York, NY', rating: '4.9', reviews: '890+', minutes: 15, fee: 149, image: burger, alt: 'A cheeseburger with lettuce and tomato on a sesame bun', description: 'Griddled beef, melty American cheese, toasted buns. A downtown burger counter that keeps it simple.', menu: [
    { id: 'smash-classic', name: 'The cheeseburger', description: 'Beef patty, American cheese, lettuce, tomato, pickles and house sauce.', price: 1250, image: burger, alt: 'Cheeseburger on a sesame bun', extra: 'Extra beef patty', extraPrice: 400 },
    { id: 'smash-double', name: 'Double cheeseburger', description: 'Two griddled patties, double American, onions and pickles.', price: 1650, image: photo('photo-1561758033-d89a9ad46330'), alt: 'A stacked cheeseburger', extra: 'Crispy bacon', extraPrice: 300 },
  ] },
  { id: 'greens', name: 'Good Greens', category: 'Healthy', neighborhood: 'NoHo', address: '28 Bleecker St, New York, NY', rating: '4.7', reviews: '640+', minutes: 20, fee: 99, image: greens, alt: 'A colorful salad with leafy greens and vegetables', description: 'Big salads with crunch, color and enough good stuff to call it lunch. Dressings packed on the side.', menu: [
    { id: 'greens-market', name: 'Market greens', description: 'Seasonal greens, chickpeas, avocado, crunchy vegetables and lemon vinaigrette.', price: 1495, image: greens, alt: 'Mixed green salad with colorful vegetables', extra: 'Extra avocado', extraPrice: 250 },
    { id: 'greens-grain', name: 'Harvest bowl', description: 'Whole grains, roasted seasonal vegetables, greens and tahini dressing.', price: 1595, image: photo('photo-1546069901-ba9599a7e63c'), alt: 'A bowl of grains and colorful vegetables', extra: 'Extra grains', extraPrice: 200 },
  ] },
  { id: 'noodle', name: 'Noodle on 9th', category: 'Noodles', neighborhood: 'East Village', address: '214 E 9th St, New York, NY', rating: '4.8', reviews: '1.3k+', minutes: 25, fee: 249, image: ramen, alt: 'A bowl of ramen noodles with egg and broth', description: 'Slow-simmered broth and springy noodles, packed separately so the first slurp is the best one.', menu: [
    { id: 'noodle-tonkotsu', name: 'Tonkotsu ramen', description: 'Pork broth, chashu, soft egg, scallions and straight noodles.', price: 1850, image: ramen, alt: 'Ramen with egg and broth', extra: 'Extra soft egg', extraPrice: 200 },
    { id: 'noodle-sesame', name: 'Spicy sesame noodles', description: 'Noodles tossed in sesame sauce with chili oil and fresh greens.', price: 1650, image: photo('photo-1555126634-323283e090fa'), alt: 'A bowl of noodles with vegetables', extra: 'Extra noodles', extraPrice: 300 },
  ] },
  { id: 'taco', name: 'Orchard Taqueria', category: 'Mexican', neighborhood: 'Lower East Side', address: '135 Orchard St, New York, NY', rating: '4.6', reviews: '420+', minutes: 20, fee: 199, image: tacos, alt: 'Tacos filled with meat, vegetables and fresh herbs', description: 'Warm tortillas, bright salsa and generously filled tacos. Three is a good place to start.', menu: [
    { id: 'taco-trio', name: 'Street taco trio', description: 'Three corn tortillas with grilled steak, onion, cilantro and salsa verde.', price: 1550, image: tacos, alt: 'Filled tacos with fresh herbs', extra: 'Guacamole on the side', extraPrice: 350 },
    { id: 'taco-veggie', name: 'Veggie taco trio', description: 'Three corn tortillas with roasted vegetables, beans, cilantro and salsa.', price: 1400, image: tacos, alt: 'A serving of filled tacos', extra: 'Guacamole on the side', extraPrice: 350 },
  ] },
];
export const categories = ['All', 'Pizza', 'Burgers', 'Healthy', 'Noodles', 'Mexican'] as const;
export type CartItem = { id: string; dishId: string; name: string; price: number; quantity: number; extra: string; note: string };
export type Order = { id: string; restaurantId: string; restaurant: string; items: CartItem[]; total: number; mode: 'delivery' | 'pickup'; destination: string; instructions: string; date: string };
export function totals(items: CartItem[], delivery: boolean, deliveryFee: number, tipPercent: number) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fee = delivery && items.length ? deliveryFee : 0;
  const service = delivery && items.length ? Math.min(399, Math.round(subtotal * .1)) : 0;
  const tax = Math.round((subtotal + fee + service) * .08875);
  const tip = Math.round(subtotal * tipPercent / 100);
  return { subtotal, fee, service, tax, tip, total: subtotal + fee + service + tax + tip };
}
