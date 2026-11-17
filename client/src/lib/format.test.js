import { formatDateFr, formatDateShortFr, relativeTimeFr, domainOf, plural } from "./format";

describe("formatDateFr", () => {
    test("formats an ISO date as a long French date", () => {
        expect(formatDateFr("2026-11-16T12:00:00Z")).toBe("16 novembre 2026");
        expect(formatDateFr("2026-01-01T12:00:00Z")).toBe("1 janvier 2026");
    });

    test("returns an empty string for missing or invalid input", () => {
        expect(formatDateFr(null)).toBe("");
        expect(formatDateFr("pas une date")).toBe("");
    });

    test("short form abbreviates the month", () => {
        expect(formatDateShortFr("2026-11-12T12:00:00Z")).toBe("12 nov. 2026");
        expect(formatDateShortFr("")).toBe("");
    });
});

describe("relativeTimeFr", () => {
    const now = new Date("2026-11-16T12:00:00Z").getTime();
    const ago = (ms) => new Date(now - ms).toISOString();
    const MIN = 60 * 1000;
    const HOUR = 60 * MIN;
    const DAY = 24 * HOUR;

    test.each([
        [10 * 1000, "à l'instant"],
        [12 * MIN, "il y a 12 min"],
        [2 * HOUR, "il y a 2 h"],
        [30 * HOUR, "hier"],
        [3 * DAY, "il y a 3 jours"],
        [9 * DAY, "la semaine dernière"],
    ])("%i ms ago reads %s", (ms, expected) => {
        expect(relativeTimeFr(ago(ms), now)).toBe(expected);
    });

    test("older dates fall back to the full date", () => {
        expect(relativeTimeFr("2026-09-01T12:00:00Z", now)).toBe("1 septembre 2026");
    });

    test("future timestamps (clock skew) read as just now", () => {
        expect(relativeTimeFr(new Date(now + 5 * MIN).toISOString(), now)).toBe("à l'instant");
    });

    test("invalid input gives an empty string", () => {
        expect(relativeTimeFr(undefined, now)).toBe("");
    });

    test("defaults to the current time", () => {
        expect(relativeTimeFr(new Date().toISOString())).toBe("à l'instant");
    });
});

describe("domainOf", () => {
    test("returns the host without www", () => {
        expect(domainOf("https://www.benbere.org/article/1")).toBe("benbere.org");
        expect(domainOf("http://energie.gouv.ml")).toBe("energie.gouv.ml");
    });

    test("returns an empty string for invalid urls", () => {
        expect(domainOf("not a url")).toBe("");
        expect(domainOf(null)).toBe("");
    });
});

test("plural picks the French singular for 0 and 1", () => {
    expect(plural(0, "source", "sources")).toBe("0 source");
    expect(plural(1, "source", "sources")).toBe("1 source");
    expect(plural(4, "source", "sources")).toBe("4 sources");
});
