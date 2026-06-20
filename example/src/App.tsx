export default function App() {
  return (
    <div className="page">
      <section className="hero">
        <h1>Ship interfaces faster</h1>
        <p>Review a staging build, tweak any element on the page, and hand off a precise spec.</p>
        <div className="actions">
          <button className="btn btn-primary">Get started</button>
          <button className="btn btn-ghost">Read docs</button>
        </div>
      </section>

      <section className="cards">
        <div className="card">
          <span className="badge">Popular</span>
          <h3>Pro</h3>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }}>
            Choose Pro
          </button>
        </div>
        <div className="card">
          <span className="badge">Team</span>
          <h3>Business</h3>
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 16 }}>
            Contact sales
          </button>
        </div>
      </section>
    </div>
  );
}
