/** Doc 4 — tenant dashboard (team — roles + invites + permission_changed realtime effect). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, DataTable, Dialog, EmptyState, ErrorState, Input, LoadingState, PageContainer, Select, type Column } from '@testimonial-api/ui';
import { useTeam } from '../../../hooks/use-team';
import { useTeamMutations } from '../../../hooks/use-team-mutations';
import { useMe } from '@testimonial-api/ui';

const ROLE_OPTIONS = [
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

export default function TeamPage() {
  const me = useMe();
  const team = useTeam();
  const mutations = useTeamMutations();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const rows = useMemo(() => (team.data ?? []).map((m) => ({ ...m })), [team.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', cell: (r) => <Select options={ROLE_OPTIONS} value={r.role} onChange={(v) => void mutations.changeRole(r.id, v)} /> },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'active' ? 'success' : 'warning'}>{r.status}</Badge> },
  ];

  if (team.isLoading) return <LoadingState label="Loading team…" />;
  if (team.isError) return <ErrorState title="Could not load the team" retry={() => void team.refetch()} />;

  return (
    <PageContainer title="Team" actions={<Button onClick={() => setInviteOpen(true)}>Invite member</Button>}>
      <Card><DataTable data={rows} columns={columns} /></Card>
      {team.data?.length === 0 && <EmptyState title="No team members" description="Invite your first teammate to collaborate." />}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen} title="Invite a teammate">
        <Input type="email" placeholder="teammate@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
        <Select options={ROLE_OPTIONS} value={inviteRole} onChange={setInviteRole} />
        <Button onClick={() => void mutations.invite(inviteEmail, inviteRole).then(() => setInviteOpen(false))}>Send invite</Button>
      </Dialog>
      <p data-testid="current-role">You are a {me.data?.user.role ?? '…'}.</p>
    </PageContainer>
  );
}
