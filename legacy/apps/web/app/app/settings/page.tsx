/** Doc 4 — tenant dashboard (settings — branding (ColorPicker) + API keys (rotate) + notification prefs). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useState } from 'react';
import { Badge, Button, Card, ColorPicker, EmptyState, ErrorState, Input, LoadingState, PageContainer, Switch, Textarea } from '@testimonial-api/ui';
import { useApiKeys } from '../../../hooks/use-api-keys';
import { useUiStore } from '../../../stores/ui.store';

export default function SettingsPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const apiKeys = useApiKeys(appId ?? undefined);
  const [brandColor, setBrandColor] = useState('#4f46e5');
  const [tenantName, setTenantName] = useState('');
  const [saved, setSaved] = useState(false);

  if (apiKeys.isLoading) return <LoadingState label="Loading settings…" />;
  if (apiKeys.isError) return <ErrorState title="Could not load settings" retry={() => void apiKeys.refetch()} />;

  return (
    <PageContainer title="Settings">
      <Card title="Branding">
        <Input placeholder="Workspace name" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
        <ColorPicker value={brandColor} onChange={(v) => { setBrandColor(v); setSaved(false); }} />
        <Button onClick={() => setSaved(true)} disabled={saved}>Save branding</Button>
        {saved && <Badge tone="success">Saved</Badge>}
      </Card>
      <Card title="Public note (optional)" />
      <Card title="API keys">
        {apiKeys.data?.map((k) => (
          <p key={k.id}>{k.name} — {k.prefix}… <Badge>{k.scopes.join(', ')}</Badge>
            <Button variant="ghost" onClick={() => void apiKeys.rotateKey(appId ?? '', k.id)}>Rotate</Button>
          </p>
        ))}
        {apiKeys.data?.length === 0 && <EmptyState title="No API keys" description="Widget/embed tokens are managed here." />}
      </Card>
      <Card title="Notifications">
        <Switch checked={true} />
      </Card>
      <Textarea placeholder="Extra settings text (Doc 5 wiring)" />
    </PageContainer>
  );
}
