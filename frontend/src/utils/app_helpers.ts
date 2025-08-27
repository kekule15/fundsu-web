export const normalizeTimestamp = (ts: any): number | null => {
    if (ts == null) return null;

    // Firestore Timestamp-like
    if (typeof ts === "object" && typeof ts.toMillis === "function") {
        try {
            return ts.toMillis();
        } catch {
            return null;
        }
    }

    // number (could be seconds or milliseconds)
    if (typeof ts === "number") {
        // if timestamp looks like seconds (10 digits), convert to ms
        if (ts < 1e12) return ts * 1000;
        return ts;
    }

    // string (ISO or numeric string)
    if (typeof ts === "string") {
        const asNum = Number(ts);
        if (!Number.isNaN(asNum)) {
            return asNum < 1e12 ? asNum * 1000 : asNum;
        }
        const parsed = Date.parse(ts);
        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
};