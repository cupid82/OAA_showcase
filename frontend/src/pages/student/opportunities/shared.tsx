/**
 * Pieces shared by the Events and Jobs modes: where a listing came from, and why
 * it is being suggested.
 */
import { Badge } from '@/components/ui/Badge';
import type { BadgeTone } from '@/components/ui/Badge';
import { SkillChips } from '@/components/ui/Bits';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { ListingStatus, MatchView, Verification } from '@/types';

const SOURCE_TONE: Record<Verification, BadgeTone> = {
  college: 'brand',
  partner: 'neutral',
  student: 'muted',
  external: 'accent',
};

const SOURCE_HINT: Record<Verification, string> = {
  college: 'Posted by the college.',
  partner: 'Posted by an organisation the college works with.',
  student: 'Shared by a student and checked by a moderator before going live.',
  external:
    'A link to an outside site nobody here has vouched for. Check it before you share details.',
};

/** Never says "verified" — it says who the listing came from. */
export function SourceBadge({
  verification,
  label,
}: {
  verification: Verification;
  label: string;
}) {
  return (
    <Badge tone={SOURCE_TONE[verification]} title={SOURCE_HINT[verification]}>
      {verification === 'external' && <Icon name="external" className="size-3" />}
      {label}
    </Badge>
  );
}

export function sourceHint(verification: Verification): string {
  return SOURCE_HINT[verification];
}

/** A word, not a number — a match orders a list, it doesn't grade the student. */
export function fitLabel(match: MatchView): { label: string; tone: BadgeTone } {
  if (!match.eligible) return { label: 'Not open to your year', tone: 'muted' };
  if (match.score >= 80) return { label: 'Strong fit', tone: 'brand' };
  if (match.score >= 55) return { label: 'Good fit', tone: 'neutral' };
  return { label: 'Partial fit', tone: 'muted' };
}

export function FitBadge({ match }: { match: MatchView }) {
  const fit = fitLabel(match);
  return <Badge tone={fit.tone}>{fit.label}</Badge>;
}

/** "Why am I seeing this?" — the reasons, what you have, and the gap. */
export function WhyItFits({ match, className }: { match: MatchView; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      {match.reasons.length > 0 ? (
        <ul className="space-y-1.5">
          {match.reasons.map((reason) => (
            <li key={reason} className="flex gap-2.5 text-sm text-ink-700">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-brand-500" />
              {reason}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-500">
          It doesn’t match your skills, goal or interests closely.
        </p>
      )}

      {(match.have.length > 0 || match.missing.length > 0) && (
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="kicker text-ink-500">You have</dt>
            <dd className="mt-2">
              <SkillChips
                skills={match.have}
                highlight={new Set(match.have.map((skill) => skill.id))}
                empty="None of the skills it asks for yet."
              />
            </dd>
          </div>
          <div>
            <dt className="kicker text-ink-500">The gap</dt>
            <dd className="mt-2">
              <SkillChips
                skills={match.missing}
                empty="Nothing — you list every skill it asks for."
              />
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

export const LISTING_STATUS_TEXT: Record<ListingStatus, string> = {
  published: 'Live',
  pending: 'Waiting for review',
  rejected: 'Not published',
  archived: 'Archived',
};
