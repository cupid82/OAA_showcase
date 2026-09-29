import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/format';
import type { Inbox, NotificationView } from '@/types';

const KIND_ICON: Record<NotificationView['kind'], IconName> = {
  opportunities: 'briefcase',
  events: 'ticket',
  projects: 'rocket',
  wellbeing: 'heart',
  reminders: 'flag',
  moderation: 'shield',
};

/**
 * The in-app inbox — OAA's own record of what needs doing, rather than one more
 * email. Opening it is also when time-based reminders are created (the server
 * dedupes them), so the count is refreshed on every navigation.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  const load = useCallback(() => {
    api
      .get<{ data: Inbox }>('/api/notifications')
      .then(({ data }) => setInbox(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    setOpen(false);
  }, [load, location.pathname]);

  // Close on outside click and on Escape, returning focus to the bell.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function update(id: string, change: { read?: true; dismissed?: true }) {
    const { data } = await api.patch<{ data: Inbox }>(`/api/notifications/${id}`, change);
    setInbox(data);
  }

  async function readAll() {
    const { data } = await api.post<{ data: Inbox }>('/api/notifications/read-all', {});
    setInbox(data);
  }

  const unread = inbox?.unread ?? 0;

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex size-9 items-center justify-center border border-ink-300 text-ink-600 transition hover:border-ink-900 hover:text-ink-900"
      >
        <Icon name="bell" className="size-[1.1rem]" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center bg-brand-600 px-1 font-mono text-[10px] leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panel}
          className="fixed inset-x-3 top-[4.25rem] z-40 max-h-[70vh] overflow-hidden border border-ink-300 bg-white shadow-card sm:absolute sm:inset-x-auto sm:top-12 sm:right-0 sm:w-[24rem]"
        >
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
            <p className="kicker text-ink-800">Inbox</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="kicker text-brand-700 transition hover:text-brand-600"
              >
                Mark all read
              </button>
            )}
          </div>

          {!inbox ? (
            <p className="px-4 py-6 text-sm text-ink-500">Loading…</p>
          ) : inbox.items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="font-serif text-lg text-ink-900">You’re all caught up</p>
              <p className="mt-1 text-sm text-ink-500">
                Deadlines, join requests and new matches land here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[calc(70vh-3rem)] overflow-y-auto">
              {inbox.items.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    'group flex gap-3 border-b border-ink-100 px-4 py-3',
                    !item.read && 'bg-brand-50/50',
                  )}
                >
                  <Icon
                    name={KIND_ICON[item.kind]}
                    className={cn('mt-0.5 size-4', item.read ? 'text-ink-400' : 'text-brand-600')}
                  />
                  <div className="min-w-0 flex-1">
                    {item.link ? (
                      <Link
                        to={item.link}
                        onClick={() => {
                          if (!item.read) void update(item.id, { read: true });
                        }}
                        className="text-sm leading-snug text-ink-900 hover:text-brand-700"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="text-sm leading-snug text-ink-900">{item.title}</p>
                    )}
                    {item.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-600">{item.body}</p>
                    )}
                    <p className="mt-1 font-mono text-[11px] text-ink-400">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void update(item.id, { dismissed: true })}
                    aria-label={`Dismiss: ${item.title}`}
                    className="self-start p-1 text-ink-300 transition hover:text-ink-700 focus-visible:text-ink-700"
                  >
                    <Icon name="close" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
