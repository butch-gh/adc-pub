/**
 * Generates a unique invoice code in the format: INVYEAR-MMDD-2HMMSS
 * Example: INV2025-1022-100302
 * Where:
 * - INV: Static prefix
 * - YEAR: 4-digit year
 * - MMDD: Month and day (zero-padded)
 * - 2HMMSS: 24-hour format hour, minute, second (zero-padded)
 */
export function generate_invoice_code(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0'); // 24-hour format
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `INV${year}-${month}${day}-${hours}${minutes}${seconds}`;
}