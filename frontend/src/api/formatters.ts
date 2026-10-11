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

/**
 * Detect whether an encounter event is synthetic (e.g. simulated benchmark pairs)
 */
export function isSyntheticEvent(event: any): boolean {
  if (!event) return false;
  const primNorad = event.primary_object?.norad_id ?? 0;
  const secNorad = event.secondary_object?.norad_id ?? 0;
  const primName = (event.primary_object?.name || '').toUpperCase();
  const secName = (event.secondary_object?.name || '').toUpperCase();
  const eventId = (event.event_id || '').toUpperCase();

  return (
    primNorad >= 99000 ||
    secNorad >= 99000 ||
    primName.includes('SYNTH') ||
    secName.includes('SYNTH') ||
    eventId.includes('SYNTH')
  );
}

/**
 * Detect whether a catalog object is synthetic
 */
export function isSyntheticObject(obj: any): boolean {
  if (!obj) return false;
  const norad = obj.norad_id ?? 0;
  const name = (obj.name || '').toUpperCase();
  return norad >= 99000 || name.includes('SYNTH');
}

/**
 * Safely format vector components without ever defaulting missing values to 0
 */
export function formatVectorComponent(val: number | null | undefined, decimals = 4): string {
  if (typeof val !== 'number' || isNaN(val)) return 'N/A';
  return val.toFixed(decimals);
}

/**
 * Safely format angular degrees without ever defaulting missing values to 0°
 */
export function formatDegree(deg: number | null | undefined, decimals = 2): string {
  if (typeof deg !== 'number' || isNaN(deg)) return 'N/A';
  return `${deg.toFixed(decimals)}°`;
}

/**
 * Safely format distance in km without defaulting missing values to 0 km
 */
export function formatKm(val: number | null | undefined, decimals = 2): string {
  if (typeof val !== 'number' || isNaN(val)) return 'N/A';
  return `${val.toFixed(decimals)} km`;
}

