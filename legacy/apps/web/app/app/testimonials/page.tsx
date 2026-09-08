/** Doc 4 — tenant dashboard (testimonials — table + filters + bulk actions + import dialog + export). Structural skeleton; visual pass in Doc 5. */
'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  BulkActionBar,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  ImportCsvDialog,
  Input,
  LoadingState,
  PageContainer,
  Select,
  type Column,
} from '@testimonial-api/ui';
import { useTestimonialImport } from '../../../hooks/use-testimonial-import';
import { useTestimonialExport } from '../../../hooks/use-testimonial-export';
import { useTestimonialMutations } from '../../../hooks/use-testimonial-mutations';
import { useTestimonials, type TestimonialFilters } from '../../../hooks/use-testimonials';
import { useUiStore } from '../../../stores/ui.store';

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' },
];

export default function TestimonialsPage() {
  const appId = useUiStore((s) => s.activeAppId);
  const [filters, setFilters] = useState<TestimonialFilters>({ status: 'all', page: 1, perPage: 50 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const testimonials = useTestimonials(appId ?? undefined, filters);
  const mutations = useTestimonialMutations();
  const importApi = useTestimonialImport(appId ?? undefined);
  const exportApi = useTestimonialExport();

  const rows = useMemo(() => (testimonials.data ?? []).map((t) => ({ ...t })), [testimonials.data]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: 'authorName', header: 'Author', cell: (r) => r.authorName ?? 'Anonymous' },
    { key: 'content', header: 'Content', cell: (r) => (r.content.length > 120 ? `${r.content.slice(0, 120)}…` : r.content) },
    { key: 'status', header: 'Status', cell: (r) => <Badge tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>{r.status}</Badge> },
    { key: 'createdAt', header: 'Received' },
  ];

  if (testimonials.isLoading) return <LoadingState label="Loading testimonials…" />;
  if (testimonials.isError) return <ErrorState title="Could not load testimonials" retry={() => void testimonials.refetch()} />;
  if (testimonials.data && testimonials.data.length === 0 && filters.status === 'all' && !filters.q) {
    return (
      <PageContainer title="Testimonials">
        <EmptyState title="No testimonials yet" action={<Button onClick={() => setImportOpen(true)}>Import CSV</Button>} />
        <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Testimonials"
      actions={
        <>
          <Button onClick={() => setImportOpen(true)}>Import CSV</Button>
          <Button onClick={() => void exportApi.exportCsv(appId ?? '')} disabled={exportApi.exporting}>Export</Button>
        </>
      }
    >
      <Card>
        <Select options={STATUS_OPTIONS} value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v as TestimonialFilters['status'] }))} />
        <Input placeholder="Search testimonials…" onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        <BulkActionBar
          count={selected.size}
          busy={false}
          onApprove={() => void (appId && selected.size && mutations.bulkModerate(appId, [...selected], 'approve').then(() => setSelected(new Set())))}
          onReject={() => void (appId && selected.size && mutations.bulkModerate(appId, [...selected], 'reject').then(() => setSelected(new Set())))}
          onDelete={() => void (appId && selected.size && Promise.all([...selected].map((id) => mutations.deleteTestimonial(appId, id))).then(() => setSelected(new Set())))}
        />
        <DataTable
          data={rows}
          columns={columns}
          selectable
          selectedKeys={selected}
          onToggleRow={(row, checked) =>
            setSelected((prev) => {
              const next = new Set(prev);
              if (checked) next.add(String(row.id));
              else next.delete(String(row.id));
              return next;
            })
          }
        />
      </Card>
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
      {importApi.data && importApi.data.length > 0 && (
        <p data-testid="import-jobs">{importApi.data.length} import job(s) recently</p>
      )}
    </PageContainer>
  );
}
