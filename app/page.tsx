import Link from "next/link";

export default function Home() {
  return (
    <main className="home-page">
      <h1>NPFC Manual</h1>
      <div className="home-actions">
        <Link className="home-button" href="/marketplace">
          Marketplace
        </Link>
        <Link className="home-button" href="/combo-maker">
          NPFC Combo Maker
        </Link>
      </div>
    </main>
  );
}
