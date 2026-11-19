"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice, products, type ProductCategory } from "@/features/catalogue/products";

type Filter = "all" | ProductCategory;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All designs" },
  { value: "minimal", label: "Minimal" },
  { value: "glam", label: "Glam" },
  { value: "bridal", label: "Bridal" },
];

export function ProductGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const filteredProducts = useMemo(
    () => products.filter((product) => filter === "all" || product.category === filter),
    [filter]
  );

  return (
    <>
      <div className="catalogue-toolbar">
        <p>{filteredProducts.length} designs</p>
        <div className="filter-list" aria-label="Filter designs">
          {filters.map((item) => (
            <button
              className={filter === item.value ? "filter-chip active" : "filter-chip"}
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.map((product) => (
          <article className="v2-product-card" key={product.id}>
            <Link className="v2-product-image" href={"/shop/" + product.slug}>
              <Image
                src={product.image}
                alt={product.name + " press-on nail design"}
                fill
                sizes="(max-width: 680px) 100vw, (max-width: 1000px) 50vw, 33vw"
              />
              <span className="product-tag">{product.tag}</span>
            </Link>
            <div className="v2-product-copy">
              <p className="product-category">{product.category} edit</p>
              <h2><Link href={"/shop/" + product.slug}>{product.name}</Link></h2>
              <p className="product-description">{product.description}</p>
              <div className="product-card-bottom">
                <strong>{formatPrice(product.price)}</strong>
                <Link className="text-link" href={"/shop/" + product.slug}>View design ↗</Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
