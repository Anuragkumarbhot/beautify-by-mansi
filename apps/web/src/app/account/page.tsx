import Link from "next/link";
import { StoreHeader } from "@/components/store-header";

export default function AccountPage() {
  return (
    <>
      <StoreHeader />
      <main className="account-page">
        <p className="eyebrow">YOUR BEAUTY SPACE</p>
        <h1>Your account,<br /><em>coming into focus.</em></h1>
        <p className="account-copy">Customer sign-in, saved details and order history are planned for the next V2 milestone. Account authentication is not connected in this preview.</p>
        <div className="account-status">
          <span className="status-dot" />
          <div><strong>Account access is not live yet</strong><p>Your cart is saved on this device. To enquire about an order, continue through the bag.</p></div>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href="/cart">Review your bag</Link>
          <Link className="button button-secondary" href="/shop">Explore the shop</Link>
        </div>
      </main>
    </>
  );
}
