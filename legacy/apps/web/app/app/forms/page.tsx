/** Doc 4 — tenant dashboard (forms list). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, DataTable, EmptyState, ErrorState, LoadingState, PageContainer, type Column } from '@testimonial-api/ui';
import { useForms } from '../../../hooks/use-forms';
import { useUiStore } from '../../../stores/ui.store';

export default function FormsPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const forms = useForms(appId ?? undefined);
  const rows = useMemo(() => (forms.data ?? []).map((f) => ({ ...f })), [forms.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'name', header: 'Name', cell: (r) => <Link href={`/app/forms/${r.id}`}>{r.name}</Link> },
    { key: 'slug', header: 'Slug', cell: (r) => `/f/${r.slug}` },
    { key: 'published', header: 'Status', cell: (r) => <Badge tone={r.published ? 'success' : 'neutral'}>{r.published ? 'Published' : 'Draft'}</Badge> },
    { key: 'submissionCount', header: 'Submissions', cell: (r) => String(r.submissionCount ?? 0) },
  ];
  if (forms.isLoading) return <LoadingState label="Loading forms…" />;
  if (forms.isError) return <ErrorState title="Could not load forms" retry={() => void forms.refetch()} />;
  if (forms.data?.length === 0) {
    return (
      <PageContainer title="Forms" actions={<Link href="/app/forms/new"><Button>New form</Button></Link>}>
        <EmptyState title="No forms yet" description="Create a form to start collecting testimonials on your site." />
      </PageContainer>
    );
  }
  return (
    <PageContainer title="Forms" actions={<Link href="/app/forms/new"><Button>New form</Button></Link>}>
      <Card><DataTable data={rows} columns={columns} /></Card>
    </PageContainer>
  );
}
