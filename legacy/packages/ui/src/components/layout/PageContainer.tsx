/** PageContainer — Doc 4 §6 / Doc 5 §5.2 layout (layout) · styled per §5 spec. */
import type { ReactNode } from 'react';

import { PageHeader } from './PageHeader';
export function PageContainer({ title, description, actions, children, className }: {
  title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <main data-component="PageContainer" className="p-6">
      <div className={`mx-auto max-w-7xl ${className ?? ''}`}>
        {(title || actions) && <PageHeader title={title ?? ''} description={description} actions={actions} />}
        {children}
      </div>
    </main>
  );
}
