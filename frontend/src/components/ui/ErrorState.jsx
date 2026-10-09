import Icon from './Icon';

export default function ErrorState({ message = 'Something went wrong.', onRetry, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-center rounded-xl border border-red-100 bg-red-50/60 px-6 py-10 text-center ${className}`}>
      <Icon name="alert" className="mb-3 h-7 w-7 text-red-500" />
      <p className="max-w-md text-sm font-medium text-red-700">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-secondary btn-sm mt-4">Try again</button>}
    </div>
  );
}
