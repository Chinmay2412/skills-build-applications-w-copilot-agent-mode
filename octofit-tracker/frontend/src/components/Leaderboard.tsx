import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardRow = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getJson<{ leaderboard: LeaderboardRow[] }>('/api/leaderboard');
        if (!active) return;
        setRows(result.leaderboard ?? []);
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : 'Unknown error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals." loading={loading} error={error} empty={rows.length === 0 && !loading && !error} emptyText="No leaderboard yet.">
      <ol className="list-group list-group-numbered">
        {rows.map((row) => (
          <li key={`${row.teamName}-${row.rank}`} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{row.rank}. {row.teamName}</span>
            <span>{row.totalPoints}</span>
          </li>
        ))}
      </ol>
    </CapabilityCard>
  );
}
