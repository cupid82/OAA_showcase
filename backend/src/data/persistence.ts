import type { Database } from './types.js';

/**
 * Where the dataset lives between restarts. The store keeps the working copy in
 * memory and calls `save` after every write; a backend only has to load it once
 * and save it faithfully.
 */
export interface Persistence {
  /** For the startup log line. Never includes a password. */
  describe: string;
  /** The stored dataset, or null when there is nothing stored yet. */
  load(): Promise<Database | null>;
  /** Makes the stored copy match `db`. Called one at a time, never concurrently. */
  save(db: Database): Promise<void>;
  close?(): Promise<void>;
}
