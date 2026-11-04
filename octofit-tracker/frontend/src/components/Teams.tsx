import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  name: string;
  mascot: string;
  members: Array<string | { _id?: string; toString?: () => string }>;
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result = await getJson<{ teams: TeamRecord[] }>('/api/teams');
        if (!active) return;
        setTeams(result.teams ?? []);
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
    <CapabilityCard title="Teams" description="Manage teams and members." loading={loading} error={error} empty={teams.length === 0 && !loading && !error} emptyText="No teams yet.">
      <ul className="list-group list-group-flush">
        {teams.map((team, index) => (
          <li key={`${team.name}-${index}`} className="list-group-item">
            <strong>{team.name}</strong> · {team.mascot} · {team.members.length} members
          </li>
        ))}
      </ul>
    </CapabilityCard>
  );
}
