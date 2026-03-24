import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  skeletonRows?: number;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  pagination?: PaginationProps;
  keyExtractor: (row: T) => string;
}

function SkeletonRow({ columns }: { columns: Column<unknown>[] }) {
  return (
    <tr>
      {columns.map((col) => (
        <td key={col.key} className={styles.cell}>
          <div className={styles.skeletonCell} />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  emptyText = 'Нет данных',
  onRowClick,
  pagination,
  keyExtractor,
}: DataTableProps<T>) {
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={styles.header}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <SkeletonRow key={i} columns={columns as Column<unknown>[]} />
                ))
              : data.length === 0
                ? (
                    <tr>
                      <td colSpan={columns.length} className={styles.empty}>
                        {emptyText}
                      </td>
                    </tr>
                  )
                : data.map((row) => (
                    <tr
                      key={keyExtractor(row)}
                      className={`${styles.row} ${onRowClick ? styles.clickable : ''}`}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={styles.cell}>
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
          >
            ←
          </button>
          <span className={styles.pageInfo}>
            {pagination.page} / {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={pagination.page >= totalPages}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
