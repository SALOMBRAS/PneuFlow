import './BorderBeam.css';

export default function BorderBeam({
  duration = 8,
  size = 100,
  colorFrom = '#f59e0b',
  colorTo = '#fbbf24'
}) {
  return (
    <div
      className="border-beam"
      aria-hidden="true"
      style={{
        '--border-beam-duration': `${duration}s`,
        '--border-beam-size': `${size}px`,
        '--border-beam-color-from': colorFrom,
        '--border-beam-color-to': colorTo
      }}
    />
  );
}
