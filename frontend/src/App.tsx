import { useEffect, useState } from 'react';

import { Layout } from './components/Layout';
import { ItemList } from './components/ItemList';
import { api } from './lib/api';
import type { Item } from './types';

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ data: Item[] }>('/api/items')
      .then((res) => {
        if (!cancelled) setItems(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load items');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    try {
      const res = await api.post<{ data: Item }>('/api/items', { title: trimmed });
      setItems((prev) => [res.data, ...prev]);
      setTitle('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    }
  }

  async function handleToggle(item: Item) {
    try {
      const res = await api.patch<{ data: Item }>(`/api/items/${item.id}`, { done: !item.done });
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.data : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    }
  }

  async function handleDelete(item: Item) {
    try {
      await api.delete(`/api/items/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  }

  return (
    <Layout>
      <h1>OAA</h1>
      <p className="subtitle">
        Frontend and backend are wired together. Edit <code>frontend/src/App.tsx</code> to start
        building.
      </p>

      <form className="new-item" onSubmit={handleCreate}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add an item…"
          aria-label="New item title"
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <ItemList items={items} onToggle={handleToggle} onDelete={handleDelete} />
      )}
    </Layout>
  );
}
