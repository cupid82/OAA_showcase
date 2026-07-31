import type { ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <main className="container">{children}</main>
      <footer className="footer">
        <span>OAA starter</span>
      </footer>
    </div>
  );
}
