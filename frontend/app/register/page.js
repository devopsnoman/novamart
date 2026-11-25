'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { formatError } from '@/lib/api';
import { getNextPath } from '@/lib/format';

export default function RegisterPage() {
  const router = useRouter();
  const { user, ready, register } = useAuth();
  const [name, setName] = useState('');
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
      await register(name, email, password);
    } catch (err) {
      setError(formatError(err));
      setSubmitting(false);
    }
  }

  const loginHref = nextPath === '/' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="container section narrow">
      <form className="form-card" onSubmit={handleSubmit}>
        <h1>Create your account</h1>
        <label className="field">
          <span>Full name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            autoComplete="name"
          />
        </label>
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
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
          <small>At least 8 characters.</small>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
        <p className="form-foot">
          Already have an account? <Link href={loginHref}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
