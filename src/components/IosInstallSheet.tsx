interface Props {
  onClose: () => void;
}

const STEPS = [
  'Tap the Share button (the square with an upward arrow) in Safari\'s toolbar.',
  'Scroll down and tap "Add to Home Screen".',
  'Tap "Add" in the top corner.',
];

export default function IosInstallSheet({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full bg-surface-800 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-gray-400 mb-3">Add to Home Screen</p>
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-sm text-gray-200">{step}</span>
            </li>
          ))}
        </ol>
        <button onClick={onClose} className="w-full mt-4 py-3 bg-accent rounded-lg text-sm font-bold">
          Got it
        </button>
      </div>
    </div>
  );
}
