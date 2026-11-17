// French date, time and text formatting helpers.

const LONG_DATE = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T/;

const toDate = (iso) => {
    if (!iso) return null;
    // A bare "YYYY-MM-DD" is a calendar day, not UTC midnight.
    const day = DATE_ONLY.exec(iso);
    if (!day && !ISO_DATETIME.test(iso)) return null; // engines "parse" text like "novembre 2026"
    const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
};

/** @param {string} iso @returns {string} e.g. "16 novembre 2026"; "" for invalid input. */
export function formatDateFr(iso) {
    const date = toDate(iso);
    return date ? LONG_DATE.format(date) : "";
}

/** @param {string} iso @returns {string} e.g. "12 nov. 2026"; "" for invalid input. */
export function formatDateShortFr(iso) {
    const date = toDate(iso);
    return date ? SHORT_DATE.format(date) : "";
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Age of a timestamp in plain French.
 * @param {string} iso
 * @param {number} [now=Date.now()]
 * @returns {string} "à l'instant", "il y a 12 min", "il y a 2 h", "hier", "il y a 3 jours",
 *   "la semaine dernière", then the full date; "" for invalid input.
 */
export function relativeTimeFr(iso, now = Date.now()) {
    const date = toDate(iso);
    if (!date) return "";
    const elapsed = now - date.getTime();
    if (elapsed < MINUTE) return "à l'instant";
    if (elapsed < HOUR) return `il y a ${Math.floor(elapsed / MINUTE)} min`;
    if (elapsed < DAY) return `il y a ${Math.floor(elapsed / HOUR)} h`;
    if (elapsed < 2 * DAY) return "hier";
    if (elapsed < 7 * DAY) return `il y a ${Math.floor(elapsed / DAY)} jours`;
    if (elapsed < 14 * DAY) return "la semaine dernière";
    return formatDateFr(iso);
}

/** @param {string} url @returns {string} host name without "www."; "" when the URL is invalid. */
export function domainOf(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
}

/**
 * French count with singular for 0 and 1.
 * @param {number} count @param {string} one @param {string} many
 * @returns {string} e.g. "1 source", "4 sources".
 */
export function plural(count, one, many) {
    return `${count} ${count > 1 ? many : one}`;
}
