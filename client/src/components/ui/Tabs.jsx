import { createContext, useContext, useId, useRef } from "react";

// A small accessible tabs widget (WAI-ARIA "tabs with automatic activation"), used by
// the composer. It replaces @radix-ui/react-tabs, which cost about 8 kB gzipped on the
// home page. API: <Tabs value onValueChange><TabList><Tab value/>…</TabList>
// <TabPanel value/>…</Tabs>. Only the selected panel is rendered. Tabs and panels carry
// data-state="active"|"inactive" for styling.

const TabsContext = createContext(null);

function useTabs() {
    const context = useContext(TabsContext);
    if (!context) throw new Error("Tab and TabPanel must be inside <Tabs>.");
    return context;
}

const safe = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, "");

/**
 * @param {{value: string, onValueChange: (value: string) => void, children: React.ReactNode}} props
 */
export function Tabs({ value, onValueChange, children }) {
    const baseId = `tabs${safe(useId())}`;
    const context = {
        value,
        onValueChange,
        tabId: (v) => `${baseId}-tab-${safe(v)}`,
        panelId: (v) => `${baseId}-panel-${safe(v)}`,
    };
    return <TabsContext.Provider value={context}>{children}</TabsContext.Provider>;
}

/**
 * The row of tabs. Arrow keys (left/right), Home and End move focus and select.
 * @param {{"aria-label": string, className?: string, children: React.ReactNode}} props
 */
export function TabList({ className, children, ...rest }) {
    const listRef = useRef(null);

    const onKeyDown = (event) => {
        const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (!keys.includes(event.key)) return;
        const tabs = Array.from(listRef.current?.querySelectorAll('[role="tab"]:not([disabled])') ?? []);
        const index = tabs.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        let next = index;
        if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        tabs[next].focus();
        tabs[next].click();
    };

    return (
        <div ref={listRef} role="tablist" aria-orientation="horizontal" className={className} onKeyDown={onKeyDown} {...rest}>
            {children}
        </div>
    );
}

/**
 * One tab. Only the selected tab is in the Tab order (roving tabindex).
 * @param {{value: string, className?: string, children: React.ReactNode}} props
 */
export function Tab({ value, className, children, ...rest }) {
    const { value: selected, onValueChange, tabId, panelId } = useTabs();
    const active = selected === value;
    return (
        <button
            type="button"
            role="tab"
            id={tabId(value)}
            aria-selected={active}
            aria-controls={panelId(value)}
            tabIndex={active ? 0 : -1}
            data-state={active ? "active" : "inactive"}
            className={className}
            onClick={() => {
                if (!active) onValueChange(value);
            }}
            {...rest}
        >
            {children}
        </button>
    );
}

/**
 * The panel for one tab; rendered only while its tab is selected.
 * @param {{value: string, className?: string, tabIndex?: number, children: React.ReactNode}} props
 */
export function TabPanel({ value, className, tabIndex = 0, children, ...rest }) {
    const { value: selected, tabId, panelId } = useTabs();
    if (selected !== value) return null;
    return (
        <div
            role="tabpanel"
            id={panelId(value)}
            aria-labelledby={tabId(value)}
            data-state="active"
            tabIndex={tabIndex}
            className={className}
            {...rest}
        >
            {children}
        </div>
    );
}
