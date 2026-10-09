export default function UnsplashAttribution({ image, className = '' }) {
  if (!image?.photographerName || !image?.photographerUrl || !image?.photoUrl) return null;

  return (
    <p className={`text-ink-600 ${className}`}>
      Photo by{' '}
      <a href={image.photographerUrl} target="_blank" rel="noreferrer" className="underline">
        {image.photographerName}
      </a>{' '}
      on{' '}
      <a href={image.photoUrl} target="_blank" rel="noreferrer" className="underline">
        Unsplash
      </a>
    </p>
  );
}
