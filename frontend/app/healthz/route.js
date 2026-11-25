// Health check for the frontend itself (used later by Kubernetes probes).
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok' });
}
