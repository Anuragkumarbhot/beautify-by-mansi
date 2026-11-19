"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/features/cart/cart-context";
import { formatPrice, type Product } from "@/features/catalogue/products";

const sizes = ["XS", "S", "M", "L", "XL", "Custom sizing / size kit"];

export function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState("");
  const [sizingNotes, setSizingNotes] = useState("");
  const [message, setMessage] = useState("");

  function handleAdd() {
    if (!size) {
      setMessage("Choose a nail size before adding this design to your bag.");
      return;
    }
    if (size === "Custom sizing / size kit" && !sizingNotes.trim()) {
      setMessage("Add your sizing details or a note about the size kit.");
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.image,
      size,
      sizingNotes: sizingNotes.trim() || undefined,
    });
    setMessage("Added to your bag.");
  }

  return (
    <main className="detail-page">
      <div className="breadcrumbs"><Link href="/shop">The nail wardrobe</Link><span>/</span>{product.name}</div>
      <div className="detail-layout">
        <div className="detail-image">
          <Image src={product.image} alt={product.name + " press-on nail design"} fill priority sizes="(max-width: 760px) 100vw, 55vw" />
        </div>
        <section className="detail-copy">
          <p className="eyebrow">{product.tag}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="detail-description">{product.description}</p>

          <label className="field-label" htmlFor="nail-size">Choose your nail size</label>
          <select id="nail-size" className="form-control" value={size} onChange={(event) => { setSize(event.target.value); setMessage(""); }}>
            <option value="">Select a size</option>
            {sizes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>

          {size === "Custom sizing / size kit" && (
            <div className="custom-sizing-field">
              <label className="field-label" htmlFor="sizing-notes">Sizing details</label>
              <textarea
                id="sizing-notes"
                className="form-control"
                rows={3}
                value={sizingNotes}
                onChange={(event) => { setSizingNotes(event.target.value); setMessage(""); }}
                placeholder="Tell us whether you need a size kit or have custom measurements."
              />
              <p className="field-help">The studio will confirm custom sizing before accepting the order.</p>
            </div>
          )}

          <button className="button button-primary add-to-bag" type="button" onClick={handleAdd}>Add to bag</button>
          {message && <p className="form-feedback" role="status">{message}</p>}
          <p className="detail-note">This is an order enquiry experience. Final sizing, availability, delivery and price are confirmed by the studio.</p>
          <Link className="text-link back-to-shop" href="/shop">← Continue exploring</Link>
        </section>
      </div>
    </main>
  );
}
