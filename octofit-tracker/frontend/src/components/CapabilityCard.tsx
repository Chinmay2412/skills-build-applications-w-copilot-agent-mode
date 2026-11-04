import type { ReactNode } from 'react';

type Props = {
  title: string;
  description: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  children?: ReactNode;
};

export function CapabilityCard({ title, description, loading = false, error = null, empty = false, emptyText = 'Nothing to show yet.', children }: Props) {
  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {loading && <p role="status">Loading {title.toLowerCase()}...</p>}
        {!loading && error && <p role="alert">Unable to load {title.toLowerCase()}. {error}</p>}
        {!loading && !error && empty && <p>{emptyText}</p>}
        {!loading && !error && !empty && children}
      </div>
    </section>
  );
}
