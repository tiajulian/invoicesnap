export const CURRENCIES = [
  { code: 'AUD', symbol: 'A$',  label: 'Australian Dollar' },
  { code: 'USD', symbol: '$',   label: 'US Dollar' },
  { code: 'EUR', symbol: '€',   label: 'Euro' },
  { code: 'GBP', symbol: '£',   label: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥',   label: 'Japanese Yen' },
  { code: 'INR', symbol: '₹',   label: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$', label: 'Mexican Peso' },
]

export function formatCurrency(amount, currency = 'AUD') {
  const num = parseFloat(amount) || 0
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency || 'AUD',
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    return `${currency} ${num.toFixed(2)}`
  }
}
