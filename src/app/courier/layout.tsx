'use client';

import { WorkerLayout } from '@/widgets/worker/WorkerLayout/WorkerLayout';

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return <WorkerLayout roles={['COURIER', 'ADMIN']}>{children}</WorkerLayout>;
}
