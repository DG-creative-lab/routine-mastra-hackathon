export default function AboutPage() {
  return (
    <div className="prose prose-invert max-w-3xl">
      <h1>About / How to use</h1>
      <ol>
        <li><strong>Describe task</strong> → creates a normalized spec (via <code>/api/specify</code>).</li>
        <li>Review in <strong>Spec preview</strong>, optionally <em>Validate</em>.</li>
        <li><strong>Generate Template</strong> → scaffolds files you can explore or ZIP.</li>
        <li>Or use <strong>Upload spec</strong> to provide <code>requirements.json</code> directly.</li>
      </ol>
      <p>
        Rate limits apply on <code>/api/specify</code>; you’ll see remaining/reset in the toast if hit.
        Demo mode uses fixtures; look for badges like <code>critics.ts</code> / <code>observer.ts</code> in results.
      </p>
    </div>
  );
}