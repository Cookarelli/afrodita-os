import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content">
      <div className="container section">
        <div className="empty-state">
          <h1>This appliance is no longer available</h1>
          <p>It may have been reserved, sold, hidden, or removed from public inventory.</p>
          <Link className="button button-primary" href="/shop">
            Browse available appliances
          </Link>
        </div>
      </div>
    </main>
  );
}
