export default function ShopLoading() {
  return (
    <main id="main-content">
      <div className="container section">
        <div className="skeleton skeleton-title" />
        <div className="inventory-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="skeleton skeleton-card" key={index} />
          ))}
        </div>
      </div>
    </main>
  );
}
