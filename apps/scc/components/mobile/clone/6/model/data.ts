export type Product = {
  id: string;
  title: string;
  brand: string;
  category: 'jackets' | 'tops' | 'denim' | 'shoes' | 'bags';
  size: string;
  price: number;
  image: string;
  alt: string;
  seller: string;
  area: string;
  condition: string;
  description: string;
};
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=720&q=85`;
export const categories = [
  { id: 'all', label: 'For you' },
  { id: 'jackets', label: 'Jackets' },
  { id: 'tops', label: 'Tops' },
  { id: 'denim', label: 'Denim' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'bags', label: 'Bags' },
];
export const products: Product[] = [
  { id: 'leather-01', title: 'Black biker jacket', brand: 'Vintage', category: 'jackets', size: 'UK 10', price: 68, image: photo('photo-1551028719-00167b16eac5'), alt: 'Black leather biker jacket with silver zips', seller: 'good.finds', area: 'Hackney, London', condition: 'Very good', description: 'Proper heavy leather, silver hardware and a lovely worn-in finish. A little wear at the cuffs, nothing major. Tagged M; best on a UK 10 with room for a jumper. Pit to pit 51cm, length 58cm.' },
  { id: 'denim-02', title: 'Straight-leg blue jeans', brand: 'Vintage denim', category: 'denim', size: 'UK 12', price: 32, image: photo('photo-1542272604-787c3835535d'), alt: 'Folded blue denim jeans showing pocket stitching', seller: 'nell.archive', area: 'Peckham, London', condition: 'Good', description: 'The everyday pair. Mid-blue wash, straight leg, no stretch. Light fading at the knees and hems. Waist laid flat 38cm, inside leg 76cm. Freshly washed and ready to go.' },
  { id: 'shirt-03', title: 'Easy white cotton tee', brand: 'Unbranded', category: 'tops', size: 'UK 8', price: 12, image: photo('photo-1521572163474-6864f9cf17ab'), alt: 'Plain white short-sleeved T-shirt against a grey background', seller: 'rosies.rail', area: 'Dalston, London', condition: 'Very good', description: 'Soft cotton tee with a proper crew neck. Boxy fit, slightly cropped. No stains or holes. Fits a UK 8–10 depending on how you like it. Selling because I have far too many white tees.' },
  { id: 'trainers-04', title: 'Tan Nike low-tops', brand: 'Nike', category: 'shoes', size: 'UK 6', price: 26, image: photo('photo-1549298916-b41d501d3772'), alt: 'Tan Nike low-top trainers with white soles on mustard fabric', seller: 'south.of.river', area: 'Brixton, London', condition: 'Good', description: 'Low-top trainers, UK 6. Worn a handful of times, light marks to the soles. Clean lining and plenty of wear left. No original box; will pack securely.' },
  { id: 'jacket-05', title: 'Faded denim jacket', brand: 'Vintage', category: 'jackets', size: 'UK 12', price: 42, image: photo('photo-1543076447-215ad9ba6923'), alt: 'Faded blue denim jacket hanging from a wall hook', seller: 'good.finds', area: 'Hackney, London', condition: 'Good', description: 'Soft faded denim with a roomy cut. All buttons present, small fray at one cuff. Lovely over a hoodie. Label has faded; measurements are pit to pit 55cm, length 62cm.' },
  { id: 'bag-06', title: 'Everyday leather handbag', brand: 'Unbranded', category: 'bags', size: 'One size', price: 39, image: photo('photo-1548036328-c9fa89d128fa'), alt: 'Structured leather handbag with handles', seller: 'flo.in.london', area: 'Bethnal Green, London', condition: 'Very good', description: 'An easy everyday bag. Leather outer, zipped inner pocket and enough room for a book. Some gentle creasing from use. Approx. 28 × 21cm. Strap and lining both in great nick.' },
  { id: 'shirt-07', title: 'Cotton shirt, relaxed fit', brand: 'High street archive', category: 'tops', size: 'UK 14', price: 18, image: photo('photo-1596755094514-f87e34085b2c'), alt: 'Long-sleeved collared shirt shown from the front', seller: 'nell.archive', area: 'Peckham, London', condition: 'Very good', description: 'Crisp cotton shirt, easy oversized shape. Works tucked in or open over a vest. Spare button still attached. Pit to pit 58cm, length 73cm. Only worn twice.' },
  { id: 'knit-08', title: 'Soft everyday knit', brand: 'Unbranded', category: 'tops', size: 'UK 10', price: 24, image: photo('photo-1434389677669-e08b4cac3105'), alt: 'Textured knitted jumper with long sleeves', seller: 'rosies.rail', area: 'Dalston, London', condition: 'Good', description: 'Soft knit for chilly mornings. A little bobbling under the arms, otherwise lovely. Fits UK 10 comfortably. Care label removed so I wash cool and dry flat.' },
  { id: 'boots-09', title: 'Heart-print high-tops', brand: 'Converse', category: 'shoes', size: 'UK 5', price: 55, image: photo('photo-1542280756-74b2f55e73ab'), alt: 'Cream Converse high-top trainers with red heart motifs', seller: 'south.of.river', area: 'Brixton, London', condition: 'Good', description: 'Cream canvas high-tops with the red heart detail. UK 5. Light wear to the rubber toe caps and soles; canvas in good nick. Original laces, no box.' },
  { id: 'tee-10', title: 'Black crew-neck tee', brand: 'Unbranded', category: 'tops', size: 'UK 12', price: 14, image: photo('photo-1503341504253-dff4815485f1'), alt: 'Black short-sleeved T-shirt worn with jeans', seller: 'flo.in.london', area: 'Bethnal Green, London', condition: 'Very good', description: 'Simple black tee, soft jersey, relaxed fit. No holes or fading. Best on a UK 10–12. Having a wardrobe clear-out so happy for this to find a new home.' },
];
export const sizes = ['UK 5', 'UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'One size'];
export const money = (amount: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
export const deliveryCost = (items: Product[]) => new Set(items.map(item => item.seller)).size * 3.49;
export type Order = { id: string; items: Product[]; total: number; delivery: number; name: string; address: string; town: string; postcode: string };
