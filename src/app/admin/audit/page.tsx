'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { AuditLog } from '@/domain/audit/AuditLog';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './page.module.css';

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}

function AuditEntry({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = log.before !== undefined || log.after !== undefined;

  return (
    <div className={styles.entry}>
      <div className={styles.entryHeader} onClick={() => hasDiff && setExpanded((v) => !v)}>
        <span className={styles.entryTime}>
          {formatDistanceToNow(new Date(log.timestamp), { locale: ru, addSuffix: true })}
        </span>
        <span className={styles.entryAction}>{log.action}</span>
        <span className={styles.entryTarget}>
          {log.targetType}:{log.targetId.slice(0, 8)}
        </span>
        <span className={styles.entryActor}>{log.actorRole}</span>
        {log.reason && (
          <span className={styles.entryReason}>{log.reason}</span>
        )}
        {hasDiff && (
          <span className={styles.expandIcon}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>

      {expanded && hasDiff && (
        <div className={styles.entryDiff}>
          {log.before !== undefined && (
            <div className={styles.diffSection}>
              <span className={styles.diffLabel}>До</span>
              <pre className={styles.diffJson}>{JSON.stringify(log.before, null, 2)}</pre>
            </div>
          )}
          {log.after !== undefined && (
            <div className={styles.diffSection}>
              <span className={styles.diffLabel}>После</span>
              <pre className={styles.diffJson}>{JSON.stringify(log.after, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAuditPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'audit', { dateFrom, dateTo }],
    queryFn: () => {
      const url = new URL('/api/admin/audit', window.location.origin);
      if (dateFrom) url.searchParams.set('dateFrom', dateFrom);
      if (dateTo) url.searchParams.set('dateTo', dateTo);
      return apiClient.get<AuditLogsResponse>(url.pathname + url.search);
    },
    staleTime: 30_000,
  });

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Аудит-лог</h1>

      <div className={styles.filters}>
        <input
          type="date"
          className={styles.dateInput}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="С"
        />
        <input
          type="date"
          className={styles.dateInput}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="По"
        />
      </div>

      {isLoading && <div className={styles.hint}>Загрузка...</div>}
      {isError && (
        <div className={styles.error}>
          Endpoint аудита ещё не реализован в backend. Будет доступен после добавления{' '}
          <code>/api/admin/audit</code>.
        </div>
      )}

      {data && (
        <div className={styles.timeline}>
          {data.logs.length === 0 ? (
            <div className={styles.hint}>Записей нет</div>
          ) : (
            data.logs.map((log) => <AuditEntry key={log.id} log={log} />)
          )}
        </div>
      )}
    </div>
  );
}
