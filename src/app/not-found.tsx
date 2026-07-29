import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container page">
      <div className="empty">
        <h1 style={{ marginBottom: 8 }}>Seite nicht gefunden</h1>
        <p>Diesen Hengst oder diese Seite gibt es hier nicht (mehr).</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/hengste">
            Zu allen Hengsten
          </Link>
          <Link className="btn" href="/">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
