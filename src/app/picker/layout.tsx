'use client';

import { WorkerLayout } from '@/widgets/worker/WorkerLayout/WorkerLayout';

export default function PickerLayout({ children }: { children: React.ReactNode }) {
  return <WorkerLayout roles={['PICKER', 'STAFF', 'ADMIN']}>{children}</WorkerLayout>;
}
