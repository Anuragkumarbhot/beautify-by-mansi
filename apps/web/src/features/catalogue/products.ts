export type ProductCategory = "minimal" | "glam" | "bridal";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  price: number;
  tag: string;
  description: string;
  image: string;
};

export const products: Product[] = [
  {
    id: "rose-french",
    slug: "rose-french",
    name: "Rose French",
    category: "minimal",
    price: 799,
    tag: "Everyday edit",
    description: "Soft blush with a refined French finish.",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "velvet-wine",
    slug: "velvet-wine",
    name: "Velvet Wine",
    category: "glam",
    price: 999,
    tag: "Studio favourite",
    description: "Deep wine tones for a confident statement.",
    image: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "pearl-glaze",
    slug: "pearl-glaze",
    name: "Pearl Glaze",
    category: "minimal",
    price: 899,
    tag: "New mood",
    description: "A luminous neutral-inspired nail look.",
    image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "bridal-glow",
    slug: "bridal-glow",
    name: "Bridal Glow",
    category: "bridal",
    price: 1299,
    tag: "Celebration edit",
    description: "A dressy reference for your special day.",
    image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "cherry-chrome",
    slug: "cherry-chrome",
    name: "Cherry Chrome",
    category: "glam",
    price: 1099,
    tag: "Statement",
    description: "High-shine colour inspiration with attitude.",
    image: "https://images.unsplash.com/photo-1604902396830-aca29e19b067?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "soft-nude",
    slug: "soft-nude",
    name: "Soft Nude",
    category: "minimal",
    price: 749,
    tag: "Minimal edit",
    description: "Clean, understated and easy to style.",
    image: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "golden-hour",
    slug: "golden-hour",
    name: "Golden Hour",
    category: "bridal",
    price: 1199,
    tag: "Occasion edit",
    description: "Warm metallic inspiration for celebrations.",
    image: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: "midnight-gloss",
    slug: "midnight-gloss",
    name: "Midnight Gloss",
    category: "glam",
    price: 999,
    tag: "After dark",
    description: "A glossy, dramatic evening look.",
    image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1000&q=85",
  },
];

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
