'use client';

export default function GlobalError({ error, reset }) {
  return (
    <div className="container section">
      <div className="empty-state">
        <h1>We could not load this page</h1>
        <p>
          {error && error.message
            ? error.message
            : 'Something went wrong.'}{' '}
          Make sure the backend API is running, then try again.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
