import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cancelCheck, createTextCheck, getCheck } from "../lib/checks";
import { checkKeys, invalidateCheckLists } from "../lib/queryKeys";

/** First poll delay; each later delay grows by POLL_FACTOR up to POLL_MAX_MS (spec 5.3). */
export const POLL_START_MS = 2000;
export const POLL_FACTOR = 1.5;
export const POLL_MAX_MS = 10000;
/** A check this page has watched running for this long is shown as "timeout"; polling stops. */
export const TIMEOUT_SECONDS = 180;
/** Before any data has loaded, give up after this many failed loads in a row (5xx, network). */
export const MAX_LOAD_FAILURES = 3;
/** created_at is trusted for the elapsed time only if it is this recent (device clocks can be wrong). */
const PLAUSIBLE_AGE_MS = 300 * 1000;

const TERMINAL_STATES = new Set(["done", "error", "cancelled"]);

/** Query key for one check. Other screens may read or seed it. @param {string} id */
export const checkQueryKey = (id) => checkKeys.detail(id);

/**
 * Delay before the next poll, after `completedPolls` polls (1-based).
 * @param {number} completedPolls @returns {number} milliseconds
 */
export function pollDelay(completedPolls) {
    const n = Math.max(1, completedPolls);
    return Math.min(POLL_START_MS * POLL_FACTOR ** (n - 1), POLL_MAX_MS);
}

const isNotFound = (error) => error?.status === 404;
/** 4xx other than 404: asking again will not help (forbidden, invalid, rate limited…). */
const isClientError = (error) =>
    typeof error?.status === "number" && error.status >= 400 && error.status < 500 && error.status !== 404;

const parseTime = (iso) => {
    const ms = Date.parse(iso ?? "");
    return Number.isNaN(ms) ? null : ms;
};

/**
 * Where the elapsed-time counter starts, fixed when this page first sees the check
 * running: the server's created_at if it is plausible on this device's clock (between
 * 0 and 300 s ago), else the moment of first observation.
 */
function elapsedOrigin(createdAt, observedAt) {
    const created = parseTime(createdAt);
    if (created === null) return observedAt;
    const age = observedAt - created;
    return age >= 0 && age <= PLAUSIBLE_AGE_MS ? created : observedAt;
}

/**
 * Load a check and poll it until it reaches a terminal state.
 *
 * Polling backs off from 2 s (×1.5, ceiling 10 s), pauses while the tab is hidden,
 * refetches when it is shown again, and stops on done/error/cancelled, on 404
 * ("notfound"), on any other 4xx or after 3 failed loads in a row before any data
 * arrived ("unreachable"), or once this page has watched the check run for 180 s
 * ("timeout"). The timeout counts only time measured on this device between
 * observations, so a wrong device clock cannot trigger or suppress it. A failed poll
 * after data has loaded sets `networkTrouble` and polling continues quietly.
 *
 * @param {string} id public check id
 * @returns {{check: import("../lib/checks").Check|null,
 *   status: "loading"|"running"|"done"|"error"|"cancelled"|"timeout"|"notfound"|"unreachable",
 *   elapsedSeconds: number, networkTrouble: boolean,
 *   cancel: () => Promise<void>, retry: () => Promise<void>, reload: () => Promise<void>}}
 *   `cancel` rethrows errors other than 409 (already finished: the check is refetched).
 *   `retry` creates a new text check with the same claim and navigates to it (it throws
 *   if that fails, e.g. ApiError "anon_quota"); an owned check still running on the
 *   server is cancelled first. For image checks it navigates home.
 *   `reload` loads the check again after "unreachable".
 */
export function useCheck(id) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const key = checkQueryKey(id);
    const [now, setNow] = useState(() => Date.now());
    // Counts already in the cache when this screen mounted, so backoff restarts at 2 s.
    const [baseCount] = useState(() => {
        const state = queryClient.getQueryState(key);
        return (state?.dataUpdateCount ?? 0) + (state?.errorUpdateCount ?? 0);
    });
    // Load failures are counted from here (moved forward by reload()).
    const [errorBase, setErrorBase] = useState(() => queryClient.getQueryState(key)?.errorUpdateCount ?? 0);
    const errorBaseRef = useRef(errorBase);
    errorBaseRef.current = errorBase;
    // When this page first saw the check running, and where its elapsed time starts.
    const observed = useRef(null);

    const observe = (data) => {
        if (data?.state === "running" && !observed.current) {
            const at = Date.now();
            observed.current = { at, origin: elapsedOrigin(data.created_at, at) };
        }
    };
    const watchedTooLong = (at) => Boolean(observed.current) && at - observed.current.at >= TIMEOUT_SECONDS * 1000;

    const cached = queryClient.getQueryData(key);
    observe(cached);
    const timedOut = cached?.state === "running" && watchedTooLong(now);

    const query = useQuery({
        queryKey: key,
        queryFn: () => getCheck(id),
        enabled: Boolean(id) && !timedOut,
        retry: false,
        staleTime: 0,
        refetchOnWindowFocus: (q) => (q.state.data?.state === "running" ? "always" : false),
        refetchInterval: (q) => {
            const { data, error } = q.state;
            if (isNotFound(error) || isClientError(error)) return false;
            if (!data && q.state.errorUpdateCount - errorBaseRef.current >= MAX_LOAD_FAILURES) return false;
            if (data && TERMINAL_STATES.has(data.state)) return false;
            observe(data);
            if (data?.state === "running" && watchedTooLong(Date.now())) return false;
            return pollDelay(q.state.dataUpdateCount + q.state.errorUpdateCount - baseCount);
        },
    });

    const check = query.data ?? null;
    observe(check);
    const isRunning = check?.state === "running";

    // Tick once a second while running, for the elapsed time and the client timeout.
    useEffect(() => {
        if (!isRunning || timedOut) return undefined;
        setNow(Date.now());
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [isRunning, timedOut]);

    // A check that stops running while watched changes what the lists show.
    const wasRunning = useRef(false);
    useEffect(() => {
        if (isRunning) wasRunning.current = true;
        else if (wasRunning.current && check && TERMINAL_STATES.has(check.state)) {
            wasRunning.current = false;
            invalidateCheckLists(queryClient);
        }
    }, [isRunning, check, queryClient]);

    const loadFailures = query.errorUpdateCount - errorBase;
    const clientError = isClientError(query.error) && !query.isFetching;

    let status;
    if (isNotFound(query.error)) status = "notfound";
    else if (clientError && (!check || isRunning)) status = "unreachable";
    else if (!check) status = loadFailures >= MAX_LOAD_FAILURES && !query.isFetching ? "unreachable" : "loading";
    else if (isRunning) status = timedOut ? "timeout" : "running";
    else if (TERMINAL_STATES.has(check.state)) status = check.state;
    else status = "error";

    // Only a failed poll after the check had loaded: the first load retries quietly.
    const networkTrouble = Boolean(query.error) && !isClientError(query.error) && !isNotFound(query.error) && status === "running";

    let elapsedSeconds = 0;
    if (check) {
        const created = parseTime(check.created_at);
        const completed = parseTime(check.completed_at);
        if (!isRunning && created !== null && completed !== null) {
            // Both times come from the server's clock.
            elapsedSeconds = Math.max(0, Math.floor((completed - created) / 1000));
        } else if (observed.current) {
            elapsedSeconds = Math.max(0, Math.floor((now - observed.current.origin) / 1000));
        }
    }

    const markCancelled = useCallback(
        async (updated) => {
            const queryKey = checkQueryKey(id);
            await queryClient.cancelQueries({ queryKey });
            queryClient.setQueryData(queryKey, (old) =>
                updated && updated.id ? updated : old ? { ...old, state: "cancelled" } : old
            );
        },
        [id, queryClient]
    );

    const cancel = useCallback(async () => {
        try {
            await markCancelled(await cancelCheck(id));
            invalidateCheckLists(queryClient);
        } catch (error) {
            if (error?.status === 409) {
                await queryClient.refetchQueries({ queryKey: checkQueryKey(id), exact: true });
                return;
            }
            throw error;
        }
    }, [id, queryClient, markCancelled]);

    const retry = useCallback(async () => {
        const current = queryClient.getQueryData(checkQueryKey(id));
        if (current?.kind === "text" && current.claim) {
            // After a client timeout the old check may still be running on the server,
            // where it would block a signed-out visitor's free check. Stop it first.
            if (current.state === "running" && current.is_owner) {
                try {
                    await markCancelled(await cancelCheck(id));
                } catch (error) {
                    // 409 not_running: it ended meanwhile, nothing to stop.
                    if (error?.status !== 409) throw error;
                }
            }
            const created = await createTextCheck(current.claim);
            queryClient.setQueryData(checkQueryKey(created.id), created);
            invalidateCheckLists(queryClient);
            navigate(`/v/${created.id}`);
            return;
        }
        navigate("/");
    }, [id, navigate, queryClient, markCancelled]);

    const { refetch } = query;
    const reload = useCallback(async () => {
        setErrorBase(queryClient.getQueryState(checkQueryKey(id))?.errorUpdateCount ?? 0);
        await refetch();
    }, [id, queryClient, refetch]);

    return { check, status, elapsedSeconds, networkTrouble, cancel, retry, reload };
}

export default useCheck;
