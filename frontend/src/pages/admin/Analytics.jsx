import { useEffect, useState } from 'react';
import { searchAnalytics } from '../../api/admin.api';
import { AdminHeader, BarList, Kpi, Panel, TrendChart } from '../../components/admin/AdminUI';
import ErrorState from '../../components/ui/ErrorState';
import { RowSkeleton } from '../../components/ui/Skeletons';
import { errorMessage } from '../../api/axios';
import { formatNumber, percent } from '../../utils/format';

export default function Analytics() {
  const [days, setDays] = useState(7);
  const [s, setS] = useState({ loading: true, error: '', data: null });
  const load = () => {
    setS((x) => ({ ...x, loading: true, error: '' }));
    searchAnalytics({ days, limit: 10 }).then((data) => setS({ loading: false, error: '', data })).catch((e) => setS({ loading: false, error: errorMessage(e, 'Could not load analytics'), data: null }));
  };
  useEffect(load, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const d = s.data;
  const sum = d?.summary || {};
  return (
    <>
      <AdminHeader title="Search analytics" subtitle="How shoppers use SearchIQ search"
        actions={<select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input h-9 w-auto text-sm" aria-label="Time range">{[7, 14, 30, 90].map((n) => <option key={n} value={n}>Last {n} days</option>)}</select>} />
      {s.loading ? <RowSkeleton rows={4} /> : s.error ? <ErrorState message={s.error} onRetry={load} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Kpi label="Total searches" value={formatNumber(sum.totalSearches)} icon="search" />
            <Kpi label="Unique users" value={formatNumber(sum.uniqueUsers)} icon="users" tone="sky" />
            <Kpi label="Zero-result searches" value={formatNumber(sum.zeroResultSearches)} hint={`${percent(sum.zeroResultRate)} of searches`} icon="alert" tone="amber" />
            <Kpi label="Results returned" value={formatNumber(sum.totalResultsReturned)} icon="layers" tone="green" />
          </div>
          <Panel title="Searches per day" className="mt-6"><TrendChart data={(d.daily || []).map((x) => ({ date: x.date, a: x.searches, b: x.zeroResultSearches }))} /></Panel>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Panel title="Top queries"><BarList items={(d.topQueries || []).map((q) => ({ label: q.query, value: q.searches }))} /></Panel>
            <Panel title="Queries with no results"><BarList color="bg-amber-500" empty="No zero-result queries 🎉" items={(d.zeroResultQueries || []).map((q) => ({ label: q.query, value: q.searches }))} /></Panel>
            <Panel title="Search mode usage"><BarList color="bg-accent-600" items={(d.modeUsage || []).map((m) => ({ label: m.mode, value: m.searches }))} /></Panel>
          </div>
        </>
      )}
    </>
  );
}
