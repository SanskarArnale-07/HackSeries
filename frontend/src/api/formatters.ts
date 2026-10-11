/**
 * Standardized Aerospace Formatting Helpers for TRAJACTRA
 */

/**
 * Consistently format relative velocity across table, drawer, and cards.
 * Prevents low-speed encounters (e.g. 0.0042 km/s co-orbital rendezvous) from rounding down to "0.00 km/s".
 */
export function formatRelativeSpeed(speedKmS: number): string {
  if (typeof speedKmS !== 'number' || isNaN(speedKmS)) return 'N/A';
  if (speedKmS < 0.01) {
    return `${speedKmS.toFixed(4)} km/s`;
  }
  if (speedKmS < 1.0) {
    return `${speedKmS.toFixed(3)} km/s`;
  }
  return `${speedKmS.toFixed(2)} km/s`;
}

/**
 * Format full UTC ISO timestamp to aerospace standard: "YYYY-MM-DD HH:mm:ss UTC"
 */
export function formatUtcTimestamp(iso: string): string {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  } catch {
    return iso;
  }
}

/**
 * Format compact UTC timestamp for list rows: "YYYY-MM-DD HH:mm UTC"
 */
export function formatUtcShort(iso: string): string {
  if (!iso) return 'N/A';
  try {
    const d = new Date(iso);
    const isoStr = d.toISOString();
    return `${isoStr.substring(0, 10)} ${isoStr.substring(11, 16)} UTC`;
  } catch {
    return iso;
  }
}
