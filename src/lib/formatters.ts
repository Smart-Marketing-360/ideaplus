/**
 * Indian Rupee (INR) and Number Formatters
 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '₹ 0';
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function parseINR(val: string): number {
  const cleaned = val.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
}
