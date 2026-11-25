'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { formatError } from '@/lib/api';
import { getNextPath } from '@/lib/format';

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState('/');

  useEffect(() => {
    setNextPath(getNextPath());
  }, []);

  useEffect(() => {
    if (ready && user) router.replace(getNextPath());
  }, [ready, user, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(formatError(err));
      setSubmitting(false);
    }
  }

  const registerHref = nextPath === '/' ? '/register' : `/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="container section narrow">
      <form className="form-card" onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="form-foot">
          New here? <Link href={registerHref}>Create an account</Link>
        </p>
      </form>
    </div>
  );
}
