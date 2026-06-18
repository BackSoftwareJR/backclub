/**
 * Parse datetime from API.
 * Backend stores UTC and returns ISO8601; legacy rows may be naive UTC strings.
 */
export function parseApiDateTime(value: string | null | undefined): Date {
    if (!value) {
        return new Date();
    }

    const trimmed = value.trim();

    if (trimmed.includes('T') || trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
        return new Date(trimmed);
    }

    return new Date(trimmed.replace(' ', 'T') + 'Z');
}

/** Format Date for datetime-local input (browser local time). */
export function formatDateTimeLocalValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
