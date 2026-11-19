import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/product-grid";
import { StoreHeader } from "@/components/store-header";

export const metadata: Metadata = {
  title: "Press-on Nail Shop",
  description: "Explore press-on nail designs by Beautify by Mansi.",
};

export default function ShopPage() {
  return (
    <>
      <StoreHeader />
      <main className="shop-page">
        <div className="shop-intro">
          <p className="eyebrow">THE BEAUTY EDIT · PRESS-ON NAILS</p>
          <h1>Your next favourite<br /><em>is at your fingertips.</em></h1>
          <p>Discover expressive nail designs, choose your fit, and send the studio an order enquiry.</p>
          <Link className="text-link" href="/cart">View your bag ↗</Link>
        </div>
        <section className="catalogue-section" aria-label="Press-on nail catalogue">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">THE NAIL WARDROBE</p>
              <h2>Find your finish.</h2>
            </div>
            <p>Designed for your everyday edit and special moments.</p>
          </div>
          <ProductGrid />
        </section>
        <div className="sizing-banner">
          <div><p className="eyebrow">A PERFECT FIT MATTERS</p><h2>Not sure about your size?</h2><p>Choose the custom sizing / size kit option on a product and share your details with the studio.</p></div>
          <Link className="button button-secondary" href="/cart">Review your bag</Link>
        </div>
      </main>
    </>
  );
}
