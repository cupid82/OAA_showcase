import { randomUUID } from 'node:crypto';

import type { CreateItemInput, Item, UpdateItemInput } from '../models/item.js';

/**
 * In-memory store so the app runs with zero setup.
 * Swap the body of these methods for real queries when you add a database
 * (see backend/src/db/README.md).
 */
const items = new Map<string, Item>();

function seed() {
  const now = new Date().toISOString();
  const first: Item = {
    id: randomUUID(),
    title: 'Wire up a real database',
    description: 'Replace the in-memory store in itemService.ts.',
    done: false,
    createdAt: now,
    updatedAt: now,
  };
  items.set(first.id, first);
}
seed();

export const itemService = {
  async list(): Promise<Item[]> {
    return [...items.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async get(id: string): Promise<Item | undefined> {
    return items.get(id);
  },

  async create(input: CreateItemInput): Promise<Item> {
    const now = new Date().toISOString();
    const item: Item = {
      id: randomUUID(),
      title: input.title,
      description: input.description ?? '',
      done: input.done ?? false,
      createdAt: now,
      updatedAt: now,
    };
    items.set(item.id, item);
    return item;
  },

  async update(id: string, input: UpdateItemInput): Promise<Item | undefined> {
    const existing = items.get(id);
    if (!existing) return undefined;

    const updated: Item = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    items.set(id, updated);
    return updated;
  },

  async remove(id: string): Promise<boolean> {
    return items.delete(id);
  },
};
