import { useId, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/ui/Icon';
import { FIELD } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { useCatalog } from '@/lib/useShared';

/**
 * Pick skills from the catalogue: chosen ones as removable chips, and a search
 * box that suggests the rest. Keyboard: type, arrow to a suggestion, Enter to add,
 * Backspace on an empty box to remove the last chip.
 */
export function SkillPicker({
  id,
  value,
  onChange,
  max = 12,
  placeholder = 'Type a skill — React, SQL, Figma…',
  exclude,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  placeholder?: string;
  /** Ids that may not be picked here (e.g. already chosen in another field). */
  exclude?: string[];
}) {
  const { catalog, skillName } = useCatalog();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const taken = new Set([...value, ...(exclude ?? [])]);
    return (catalog?.skills ?? [])
      .filter((skill) => !taken.has(skill.id))
      .filter(
        (skill) =>
          !needle || skill.name.toLowerCase().includes(needle) || skill.id.includes(needle),
      )
      .slice(0, 8);
  }, [catalog, exclude, query, value]);

  const full = value.length >= max;

  function add(skillId: string) {
    if (full || value.includes(skillId)) return;
    onChange([...value, skillId]);
    setQuery('');
    setActive(0);
    input.current?.focus();
  }

  function remove(skillId: string) {
    onChange(value.filter((entry) => entry !== skillId));
  }

  return (
    <div className="relative">
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((skillId) => (
            <li key={skillId}>
              <span className="inline-flex items-center gap-1 border border-brand-300 bg-brand-50 py-0.5 pr-1 pl-2 text-xs text-brand-800">
                {skillName(skillId)}
                <button
                  type="button"
                  onClick={() => remove(skillId)}
                  aria-label={`Remove ${skillName(skillId)}`}
                  className="p-0.5 text-brand-700 transition hover:text-brand-950"
                >
                  <Icon name="close" className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={input}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={full}
        value={query}
        placeholder={full ? `That’s the most you can pick (${max})` : placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        // Delay so a click on a suggestion lands before the list disappears.
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, matches.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter') {
            const pick = matches[active];
            if (open && pick) {
              event.preventDefault();
              add(pick.id);
            }
          } else if (event.key === 'Escape') {
            setOpen(false);
          } else if (event.key === 'Backspace' && query === '' && value.length > 0) {
            remove(value[value.length - 1] ?? '');
          }
        }}
        className={cn(FIELD, 'mt-1')}
      />

      {open && matches.length > 0 && !full && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto border border-ink-300 bg-white shadow-card"
        >
          {matches.map((skill, index) => (
            <li key={skill.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                // mousedown, not click: fires before the input's blur closes the list.
                onMouseDown={(event) => {
                  event.preventDefault();
                  add(skill.id);
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'flex w-full items-baseline justify-between gap-4 px-3 py-2 text-left text-sm',
                  index === active ? 'bg-brand-50 text-ink-900' : 'text-ink-700',
                )}
              >
                <span>{skill.name}</span>
                <span className="kicker text-[10px] text-ink-400">{skill.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
