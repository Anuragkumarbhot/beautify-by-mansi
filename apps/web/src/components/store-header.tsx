"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";

export function StoreHeader() {
  const { itemCount } = useCart();

  return (
    <header className="store-header">
      <Link className="store-wordmark" href="/" aria-label="Beautify by Mansi home">
        BEAUTIFY <span>by Mansi</span>
      </Link>
      <nav aria-label="Store navigation">
        <Link href="/academy">Academy</Link>
        <Link href="/shop">Shop nails</Link>
        <Link href="/account">My account</Link>
        <Link className="store-bag" href="/cart" aria-label={"Shopping bag with " + itemCount + " items"}>
          Bag <span>{itemCount}</span>
        </Link>
      </nav>
    </header>
  );
}
