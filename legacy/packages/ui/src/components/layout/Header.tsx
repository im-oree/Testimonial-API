/** Header — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

import { PageHeader } from './PageHeader';
export function Header({ title, actions }: { title: string; actions?: ReactNode }) {
  return <PageHeader title={title} actions={actions} />;
}
