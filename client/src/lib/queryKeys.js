// TanStack Query keys for checks, in one place so mutations refresh every list.
//
// Every list of checks (home "Vérifications récentes", library, history) lives under
// the ["checks"] prefix; one check lives under ["check", id]. The two prefixes are
// distinct on purpose: refreshing the lists never refetches an open check page.

const LISTS = "checks";
const DETAIL = "check";

export const checkKeys = Object.freeze({
    /** Prefix of every list query. Invalidate this after publish, delete, cancel or create. */
    lists: () => [LISTS],
    /**
     * One page of a list.
     * @param {"library"|"mine"} scope @param {{q?: string, verdict?: string, page?: number}} params
     */
    list: (scope, params) => [LISTS, scope, params],
    /** The home page's short list of recently published checks. */
    recent: () => [LISTS, "library", "recent"],
    /** One check. @param {string} id */
    detail: (id) => [DETAIL, id],
    /** Checks related to one check. @param {string} id */
    related: (id) => [DETAIL, id, "related"],
});

/**
 * Mark every list of checks stale; mounted lists refetch now, the others on next mount.
 * @param {import("@tanstack/react-query").QueryClient} queryClient
 * @returns {Promise<void>}
 */
export function invalidateCheckLists(queryClient) {
    return queryClient.invalidateQueries({ queryKey: checkKeys.lists() });
}
