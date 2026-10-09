import Icon from '../ui/Icon';
import formatCurrency from '../../utils/formatCurrency';

/** Shows what the AI query parser understood from a natural-language search (analysis from /search/query). */
export default function AiInsight({ analysis }) {
  if (!analysis) return null;
  const { hardFilters = {}, softSignals = {} } = analysis;
  const tags = [];
  (hardFilters.category || []).forEach((v) => tags.push(`Category: ${v}`));
  (hardFilters.brand || []).forEach((v) => tags.push(`Brand: ${v}`));
  if (hardFilters.minPrice != null) tags.push(`Min ${formatCurrency(hardFilters.minPrice)}`);
  if (hardFilters.maxPrice != null) tags.push(`Under ${formatCurrency(hardFilters.maxPrice)}`);
  if (hardFilters.inStock) tags.push('In stock');
  (softSignals.colors || []).forEach((v) => tags.push(`Colour: ${v}`));
  (softSignals.genders || []).forEach((v) => tags.push(`For: ${v}`));
  (softSignals.useCases || []).forEach((v) => tags.push(`Use: ${v}`));
  if (tags.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white px-4 py-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700"><Icon name="sparkles" className="h-4 w-4" />SearchIQ understood</span>
      {tags.map((t) => <span key={t} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium capitalize text-ink-700 ring-1 ring-brand-100">{t}</span>)}
    </div>
  );
}
