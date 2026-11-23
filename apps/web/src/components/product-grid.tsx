"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice, products, type ProductCategory } from "@/features/catalogue/products";

type Filter = "all" | ProductCategory;
type SortOrder = "featured" | "price-asc" | "price-desc" | "name";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All designs" },
  { value: "minimal", label: "Minimal" },
  { value: "glam", label: "Glam" },
  { value: "bridal", label: "Bridal" },
];

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

export function ProductGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("featured");

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en-IN");
    const matching = products.filter((product) => {
      const matchesCategory = filter === "all" || product.category === filter;
      const searchableText = [
        product.name,
        product.description,
        product.tag,
        product.category,
      ].join(" ").toLocaleLowerCase("en-IN");
      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });

    if (sortOrder === "price-asc") return [...matching].sort((a, b) => a.price - b.price);
    if (sortOrder === "price-desc") return [...matching].sort((a, b) => b.price - a.price);
    if (sortOrder === "name") return [...matching].sort((a, b) => a.name.localeCompare(b.name));
    return matching;
  }, [filter, query, sortOrder]);

  function resetDiscovery() {
    setFilter("all");
    setQuery("");
    setSortOrder("featured");
  }

  return (
    <>
      <div className="catalogue-toolbar">
        <p aria-live="polite">{filteredProducts.length} {filteredProducts.length === 1 ? "design" : "designs"}</p>
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

      <div
        className="catalogue-discovery-controls"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))",
          gap: "12px",
          margin: "18px 0 24px",
        }}
      >
        <label style={{ display: "grid", gap: "7px", color: "#705d58", fontSize: "12px" }}>
          Search designs
          <input
            className="form-control"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try rose, chrome, bridal..."
            aria-label="Search press-on nail designs"
          />
        </label>
        <label style={{ display: "grid", gap: "7px", color: "#705d58", fontSize: "12px" }}>
          Sort by
          <select
            className="form-control"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            aria-label="Sort press-on nail designs"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {filteredProducts.length > 0 ? (
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
      ) : (
        <div className="catalogue-empty-state" role="status" style={{ padding: "38px 20px", textAlign: "center", border: "1px solid #eaded7", background: "#fff" }}>
          <h3 style={{ margin: "0 0 8px", color: "#553642", fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "24px" }}>
            No designs found
          </h3>
          <p style={{ margin: "0 0 18px", color: "#806d67", fontSize: "13px" }}>
            Try another search or clear your filters to explore the full nail wardrobe.
          </p>
          <button className="button button-secondary" type="button" onClick={resetDiscovery}>
            Clear search and filters
          </button>
        </div>
      )}
    </>
  );
}
