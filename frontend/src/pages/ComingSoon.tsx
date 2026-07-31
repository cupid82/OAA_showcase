import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

interface ComingSoonProps {
  title: string;
  /** The plans.md step that builds this page. */
  step: number;
  description?: string;
}

/**
 * Every sidebar link resolves to a real route from day one — this is what the
 * not-yet-built ones render. Deliberately empty: no mock data ever ships here.
 */
export function ComingSoon({ title, step, description }: ComingSoonProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        title={`Built in Step ${step}`}
        description="This page is routed and reachable, but its screen and API don't exist yet. It stays empty until that step — no placeholder data."
        action={
          <Link
            to="/"
            className="kicker text-brand-700 underline underline-offset-4 hover:text-brand-600"
          >
            Back to the portal home
          </Link>
        }
      />
    </>
  );
}
