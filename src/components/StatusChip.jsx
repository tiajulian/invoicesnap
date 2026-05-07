export default function StatusChip({ status, onClick }) {
  const isPaid = status === 'paid'
  return (
    <button
      onClick={onClick}
      aria-label={`Status: ${isPaid ? 'Paid' : 'Unpaid'} — click to toggle`}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold
        transition-all select-none cursor-pointer
        ring-1 ring-transparent hover:ring-current hover:shadow-sm active:scale-95 ${
        isPaid
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
      }`}
    >
      {isPaid ? '✓ Paid' : '⏳ Unpaid'}
      <span className="opacity-0 group-hover:opacity-100 text-[10px]">✎</span>
    </button>
  )
}
