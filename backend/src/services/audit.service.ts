/**
 * The audit trail for staff writes.
 *
 * Every mutation a teacher or admin makes to a student's record goes through
 * `recordAudit`. The table is append-only: a correction is a new row, never an
 * edit of an old one, because a trail that can be rewritten proves nothing.
 *
 * Callers pass the row *before* and *after* the change. Diffing is left to the
 * reader — storing both sides means a later change to what a field means cannot
 * retroactively alter what the log says happened.
 */
import { getDb } from '../data/store.js';
import type { AuditLogRow, Role } from '../data/types.js';

let counter = 0;

function auditId(at: string): string {
  counter += 1;
  return `aud-${at.replace(/[-:.TZ]/g, '')}-${String(counter).padStart(4, '0')}`;
}

export interface AuditEntry {
  actorId: string;
  actorRole: Role;
  action: string;
  entity: AuditLogRow['entity'];
  entityId: string;
  studentId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
}

/**
 * Appends one row. Does **not** persist — the caller flushes once, after the
 * whole mutation, so a bulk write is a single disk write and the log cannot be
 * saved without the change it describes.
 */
export function recordAudit(entry: AuditEntry): AuditLogRow {
  const at = new Date().toISOString();
  const row: AuditLogRow = { id: auditId(at), at, ...entry };

  getDb().auditLogs.push(row);
  return row;
}

/** Most recent first. Used by the teacher dashboard's activity strip. */
export function recentAudits(actorId: string, limit = 10): AuditLogRow[] {
  return getDb()
    .auditLogs.filter((row) => row.actorId === actorId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
