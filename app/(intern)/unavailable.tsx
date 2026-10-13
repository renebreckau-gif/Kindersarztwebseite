// Shown when the backend database cannot be reached. The public website is not affected.

export function Unavailable() {
  return (
    <div className="intern-page">
      <main className="intern-main" id="inhalt">
        <div className="intern-card">
          <p className="intern-brand">
            <span>Kinderarztpraxis</span>
            <span>Probst &amp; Böhme</span>
          </p>
          <h1 className="intern-h1">Praxis Cockpit</h1>
          <p className="intern-error" role="status">
            Der interne Bereich ist gerade nicht erreichbar.
          </p>
          <p className="intern-note">Die öffentliche Website ist davon nicht betroffen. Bitte versuchen Sie es später erneut.</p>
        </div>
      </main>
    </div>
  );
}
