import { ORDER_STATUS } from '../../utils/constants';

export default function StatusBadge({ status }) {
  const meta = ORDER_STATUS[status] || { label: status || 'Unknown', tone: 'neutral' };
  return <span className={`badge-${meta.tone}`}>{meta.label}</span>;
}
