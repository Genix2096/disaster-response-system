export default function StatusBadge({ status }) {
  const cls = {
    PENDING: 'badge-pending',
    IN_PROGRESS: 'badge-in-progress',
    RESOLVED: 'badge-resolved',
    REJECTED: 'badge-rejected',
  }[status] || 'badge-pending';

  const label = status === 'IN_PROGRESS' ? 'In Progress' : status;

  return <span className={`badge ${cls}`}>{label}</span>;
}
