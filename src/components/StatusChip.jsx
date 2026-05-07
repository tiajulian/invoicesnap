export default function StatusChip({ status, onClick }) {
  const isPaid = status === 'paid'
  return (
    <button
      onClick={onClick}
      title="Click to toggle status"
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors select-none ${
        isPaid
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
      }`}
    >
      {isPaid ? '✓ Paid' : '⏳ Unpaid'}
    </button>
  )
}
