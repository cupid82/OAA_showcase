import type { Item } from '../types';

interface ItemListProps {
  items: Item[];
  onToggle: (item: Item) => void;
  onDelete: (item: Item) => void;
}

export function ItemList({ items, onToggle, onDelete }: ItemListProps) {
  if (items.length === 0) {
    return <p className="muted">No items yet.</p>;
  }

  return (
    <ul className="item-list">
      {items.map((item) => (
        <li key={item.id} className={item.done ? 'item done' : 'item'}>
          <label>
            <input type="checkbox" checked={item.done} onChange={() => onToggle(item)} />
            <span>{item.title}</span>
          </label>
          <button type="button" className="link" onClick={() => onDelete(item)}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
