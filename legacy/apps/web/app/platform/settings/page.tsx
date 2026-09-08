/** Doc 4 — platform dashboard (platform settings). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';
import { Badge, Button, Card, Input, LoadingState, PageContainer, Switch } from '@testimonial-api/ui';

export default function PlatformSettingsPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [signups, setSignups] = useState(true);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  return (
    <PageContainer title="Platform settings">
      <Card title="Profile">
        <Input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={() => setSaved(true)}>Save</Button>
        {saved && <Badge tone="success">Saved</Badge>}
      </Card>
      <Card title="Operations">
        <Switch checked={maintenance} onCheckedChange={setMaintenance} /> Maintenance mode
        <Switch checked={signups} onCheckedChange={setSignups} /> Allow tenant sign-ups
      </Card>
      {maintenance && <LoadingState label="Maintenance mode is on — public pages show the maintenance screen." />}
    </PageContainer>
  );
}
