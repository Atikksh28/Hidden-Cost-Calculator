/**
 * Format a number with comma after every 3 digits from left (e.g., 500,0000)
 * @param amount The amount to format
 * @param showPrefixSymbol Whether to include the ₹ prefix (default: true)
 * @returns Formatted string with currency format
 */
export function formatIndianCurrency(amount: number, showPrefixSymbol: boolean = true): string {
  const isNegative = amount < 0
  const absoluteAmount = Math.abs(amount)

  // Convert to string and split by decimal
  const [integerPart, decimalPart] = absoluteAmount.toString().split('.')

  // Add formatting: comma after every 3 digits from the left
  let formatted = ''
  for (let i = 0; i < integerPart.length; i++) {
    if (i > 0 && (integerPart.length - i) % 3 === 0) {
      formatted += ','
    }
    formatted += integerPart[i]
  }

  // Add decimal part if present
  if (decimalPart) {
    formatted += '.' + decimalPart
  }

  const sign = isNegative ? '-' : ''
  const prefix = showPrefixSymbol ? '₹' : ''

  return `${prefix}${sign}${formatted}`
}
