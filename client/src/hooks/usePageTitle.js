import { useEffect } from "react";

/**
 * Set the document title to "<title> | Check-IA" (or "Check-IA" when title is empty).
 * @param {string} title
 */
export function usePageTitle(title) {
    useEffect(() => {
        document.title = title ? `${title} | Check-IA` : "Check-IA";
    }, [title]);
}

export default usePageTitle;
