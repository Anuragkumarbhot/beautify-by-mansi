"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useCart } from "@/features/cart/cart-context";
import {
  formatPrice,
  products,
  type Product,
  type ProductCategory,
} from "@/features/catalogue/products";
import styles from "./virtual-store.module.css";

type Filter = "all" | ProductCategory;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All designs" },
  { value: "minimal", label: "Minimal" },
  { value: "glam", label: "Glam" },
  { value: "bridal", label: "Bridal" },
];

const nailSizes = ["XS", "S", "M", "L", "XL", "Custom sizing / size kit"];

export function VirtualStore() {
  const { addItem } = useCart();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [rotation, setRotation] = useState(0);
  const [size, setSize] = useState("");
  const [sizingNotes, setSizingNotes] = useState("");
  const [feedback, setFeedback] = useState("");

  const visibleProducts = products.filter(
    (product) => filter === "all" || product.category === filter
  );
  const selectedProduct: Product =
    visibleProducts.find((product) => product.id === selectedId) ??
    visibleProducts[0] ??
    products[0];

  function selectProduct(product: Product) {
    setSelectedId(product.id);
    setSize("");
    setSizingNotes("");
    setFeedback("");
  }

  function handleAddToBag() {
    if (!size) {
      setFeedback("Choose a nail size before adding this design to your bag.");
      return;
    }
    if (size === "Custom sizing / size kit" && !sizingNotes.trim()) {
      setFeedback("Add a sizing note or request a size kit before continuing.");
      return;
    }

    addItem({
      productId: selectedProduct.id,
      slug: selectedProduct.slug,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image: selectedProduct.image,
      size,
      sizingNotes: sizingNotes.trim() || undefined,
    });
    setFeedback(selectedProduct.name + " has been added to your bag.");
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <p className={styles.eyebrow}>BEAUTIFY BY MANSI · DIGITAL FLAGSHIP</p>
        <h1>Step inside the<br /><em>nail boutique.</em></h1>
        <p className={styles.lede}>
          Explore the collection in an interactive 3D-inspired showroom. Select a display
          to discover its design, choose your fit, and add it to your bag.
        </p>
        <div className={styles.introLinks}>
          <Link href="/shop">Browse the standard shop <span aria-hidden="true">↗</span></Link>
          <span>Designed for mobile and desktop</span>
        </div>
      </section>

      <section className={styles.showroomSection} aria-label="Interactive virtual nail showroom">
        <div className={styles.showroomHeading}>
          <div>
            <p className={styles.eyebrow}>THE VIRTUAL SHOWROOM</p>
            <h2>Choose your display.</h2>
          </div>
          <div className={styles.viewControls} aria-label="Showroom camera controls">
            <button type="button" onClick={() => setRotation((value) => Math.max(-12, value - 6))} aria-label="Rotate showroom left">↶</button>
            <button type="button" onClick={() => setRotation(0)} aria-label="Reset showroom view">Reset view</button>
            <button type="button" onClick={() => setRotation((value) => Math.min(12, value + 6))} aria-label="Rotate showroom right">↷</button>
          </div>
        </div>

        <div className={styles.filterBar} aria-label="Filter showroom displays">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? styles.activeFilter : ""}
              aria-pressed={filter === item.value}
              onClick={() => {
                setFilter(item.value);
                setFeedback("");
                setSize("");
                setSizingNotes("");
              }}
            >
              {item.label}
            </button>
          ))}
          <span>{visibleProducts.length} {visibleProducts.length === 1 ? "design" : "designs"} on display</span>
        </div>

        <div className={styles.sceneFrame}>
          <div
            className={styles.scene}
            style={{ "--yaw": rotation + "deg" } as CSSProperties}
          >
            <div className={styles.room}>
              <div className={styles.backWall}>
                <div className={styles.wallBrand}>
                  <span>BEAUTIFY</span>
                  <small>by Mansi</small>
                  <i>THE NAIL BOUTIQUE</i>
                </div>
                <div className={styles.wallShelf}>
                  <div className={styles.shelfLabel}>THE SIGNATURE COLLECTION</div>
                  <div className={styles.displayGrid}>
                    {visibleProducts.map((product, index) => (
                      <button
                        key={product.id}
                        type="button"
                        className={
                          product.id === selectedProduct.id
                            ? styles.displayCard + " " + styles.selectedDisplay
                            : styles.displayCard
                        }
                        onClick={() => selectProduct(product)}
                        aria-pressed={product.id === selectedProduct.id}
                        aria-label={"View " + product.name + ", " + formatPrice(product.price)}
                      >
                        <span className={styles.displayImage}>
                          <Image
                            src={product.image}
                            alt=""
                            fill
                            sizes="(max-width: 680px) 34vw, 150px"
                          />
                          <span className={styles.displayNumber}>{String(index + 1).padStart(2, "0")}</span>
                        </span>
                        <span className={styles.displayName}>{product.name}</span>
                        <span className={styles.displayPrice}>{formatPrice(product.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.wallPlinth} aria-hidden="true" />
              </div>

              <div className={styles.leftWall} aria-hidden="true">
                <span className={styles.wallSconce} />
                <span className={styles.wallArt}>B<br />M</span>
              </div>
              <div className={styles.rightWall} aria-hidden="true">
                <span className={styles.wallSconce} />
                <span className={styles.rightWallText}>BEAUTY<br />IN EVERY<br />DETAIL</span>
              </div>
              <div className={styles.floor} aria-hidden="true">
                <span className={styles.floorInlay} />
              </div>
              <div className={styles.centerIsland} aria-hidden="true">
                <span className={styles.islandTop} />
                <span className={styles.islandFront}>BEAUTIFY <i>by Mansi</i></span>
              </div>
              <div className={styles.sceneCaption}>
                <span>01 — THE PRESS-ON COLLECTION</span>
                <span>SELECT A PRODUCT TO EXPLORE</span>
              </div>
            </div>
          </div>
          <div className={styles.sceneHint}>
            <span className={styles.liveDot} />
            Interactive showroom
            <span>Use the arrows to change your view · Tap a product to inspect it</span>
          </div>
        </div>

        <div className={styles.productPanel} aria-live="polite">
          <div className={styles.selectedImage}>
            <Image
              src={selectedProduct.image}
              alt={selectedProduct.name + " press-on nail design"}
              fill
              sizes="(max-width: 760px) 100vw, 340px"
            />
          </div>
          <div className={styles.productInfo}>
            <p className={styles.eyebrow}>{selectedProduct.tag}</p>
            <h3>{selectedProduct.name}</h3>
            <p className={styles.productDescription}>{selectedProduct.description}</p>
            <strong className={styles.productPrice}>{formatPrice(selectedProduct.price)}</strong>
            <label className={styles.fieldLabel} htmlFor="virtual-nail-size">Choose your nail size</label>
            <select
              id="virtual-nail-size"
              value={size}
              onChange={(event) => {
                setSize(event.target.value);
                setFeedback("");
              }}
            >
              <option value="">Select a size</option>
              {nailSizes.map((nailSize) => (
                <option key={nailSize} value={nailSize}>{nailSize}</option>
              ))}
            </select>
            {size === "Custom sizing / size kit" && (
              <label className={styles.fieldLabel} htmlFor="virtual-sizing-notes">
                Sizing details
                <textarea
                  id="virtual-sizing-notes"
                  value={sizingNotes}
                  onChange={(event) => {
                    setSizingNotes(event.target.value);
                    setFeedback("");
                  }}
                  placeholder="Request a size kit or share your measurements."
                  rows={3}
                />
              </label>
            )}
            <div className={styles.productActions}>
              <button type="button" onClick={handleAddToBag}>Add to bag</button>
              <Link href={"/shop/" + selectedProduct.slug}>Full product details ↗</Link>
            </div>
            {feedback && <p className={styles.feedback} role="status">{feedback}</p>}
            <p className={styles.finePrint}>
              The studio confirms final sizing, availability, delivery and price before accepting an order.
            </p>
          </div>
        </div>
      </section>
      <p className={styles.footerNote}>BEAUTY, THOUGHTFULLY CREATED. <span>© {new Date().getFullYear()} BEAUTIFY BY MANSI</span></p>
    </main>
  );
}
