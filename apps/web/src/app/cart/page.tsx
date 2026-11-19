"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { StoreHeader } from "@/components/store-header";
import { useCart } from "@/features/cart/cart-context";
import { formatPrice } from "@/features/catalogue/products";

const WHATSAPP_NUMBER = "919877339755";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [fulfilment, setFulfilment] = useState("pickup");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");

  function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) {
      setFeedback("Your bag is empty.");
      return;
    }
    if (fulfilment === "delivery" && !address.trim()) {
      setFeedback("Add a delivery address or choose studio pickup.");
      return;
    }

    const orderReference = "BBM-" + Date.now().toString(36).toUpperCase();
    const orderLines = items.map((item) =>
      "- " + item.name + " | Size: " + item.size +
      (item.sizingNotes ? " | Sizing: " + item.sizingNotes : "") +
      " | Qty: " + item.quantity + " | " + formatPrice(item.price * item.quantity)
    );
    const message = [
      "Hello Beautify by Mansi! I would like to place a press-on nail order enquiry.",
      "Reference: " + orderReference,
      "",
      ...orderLines,
      "",
      "Estimated subtotal: " + formatPrice(subtotal),
      "Fulfilment: " + (fulfilment === "delivery" ? "Home delivery" : "Studio pickup"),
      address.trim() ? "Delivery address: " + address.trim() : "",
      "Name: " + name.trim(),
      "WhatsApp: " + phone.trim(),
      email.trim() ? "Email: " + email.trim() : "",
      notes.trim() ? "Notes: " + notes.trim() : "",
      "",
      "Please confirm availability, sizing, delivery charges and final price.",
    ].filter(Boolean).join("\n");

    const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
    window.open(url, "_blank", "noopener,noreferrer");
    setFeedback("Your WhatsApp order enquiry has been prepared. Send the message in WhatsApp to contact the studio.");
  }

  return (
    <>
      <StoreHeader />
      <main className="cart-page">
        <div className="cart-page-heading">
          <p className="eyebrow">THE BEAUTY EDIT</p>
          <h1>Your bag.</h1>
          <p>Review your designs and send an enquiry to the studio.</p>
        </div>

        {!items.length ? (
          <section className="empty-cart">
            <h2>Your bag is waiting for something beautiful.</h2>
            <p>Explore the nail wardrobe and choose a design to get started.</p>
            <Link className="button button-primary" href="/shop">Explore press-on nails</Link>
          </section>
        ) : (
          <div className="cart-layout">
            <section className="cart-items-panel" aria-label="Items in your bag">
              {items.map((item) => (
                <article className="cart-line" key={item.key}>
                  <div className="cart-line-image">
                    <Image src={item.image} alt={item.name} fill sizes="112px" />
                  </div>
                  <div className="cart-line-copy">
                    <h2><Link href={"/shop/" + item.slug}>{item.name}</Link></h2>
                    <p>Size: {item.size}</p>
                    {item.sizingNotes && <p>Sizing note: {item.sizingNotes}</p>}
                    <strong>{formatPrice(item.price)}</strong>
                    <div className="quantity-control">
                      <button type="button" aria-label={"Decrease quantity of " + item.name} onClick={() => updateQuantity(item.key, Math.max(1, item.quantity - 1))}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label={"Increase quantity of " + item.name} onClick={() => updateQuantity(item.key, item.quantity + 1)}>+</button>
                      <button className="remove-link" type="button" onClick={() => removeItem(item.key)}>Remove</button>
                    </div>
                  </div>
                  <strong className="line-total">{formatPrice(item.price * item.quantity)}</strong>
                </article>
              ))}
              <button className="clear-cart" type="button" onClick={clearCart}>Clear bag</button>
            </section>

            <aside className="checkout-panel">
              <div className="summary-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
              <p className="checkout-disclaimer">Delivery charges, availability and final pricing are confirmed by the studio. No online payment is collected in this V2 preview.</p>
              <form className="enquiry-form" onSubmit={submitEnquiry}>
                <h2>Order enquiry</h2>
                <label className="field-label" htmlFor="customer-name">Your name</label>
                <input id="customer-name" className="form-control" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
                <label className="field-label" htmlFor="customer-phone">WhatsApp number</label>
                <input id="customer-phone" className="form-control" type="tel" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} autoComplete="tel-national" placeholder="10-digit mobile number" required value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} />
                <label className="field-label" htmlFor="customer-email">Email (optional)</label>
                <input id="customer-email" className="form-control" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <label className="field-label" htmlFor="fulfilment">Fulfilment preference</label>
                <select id="fulfilment" className="form-control" value={fulfilment} onChange={(event) => setFulfilment(event.target.value)}>
                  <option value="pickup">Studio pickup</option>
                  <option value="delivery">Home delivery</option>
                </select>
                {fulfilment === "delivery" && (
                  <>
                    <label className="field-label" htmlFor="delivery-address">Delivery address</label>
                    <textarea id="delivery-address" className="form-control" rows={3} required value={address} onChange={(event) => setAddress(event.target.value)} />
                  </>
                )}
                <label className="field-label" htmlFor="order-notes">Additional notes (optional)</label>
                <textarea id="order-notes" className="form-control" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
                <button className="button button-primary submit-enquiry" type="submit">Continue to WhatsApp ↗</button>
                {feedback && <p className="form-feedback" role="status">{feedback}</p>}
              </form>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
