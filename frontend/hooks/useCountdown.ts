import { useEffect, useState } from 'react';
import { getCountdownString } from '../utils/timeUtils';

export function useCountdownDate(targetDate: Date | null) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        if (!targetDate) return;

        const diff = targetDate.getTime() - Date.now();
        if (diff <= 0) return;

        const interval = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    return getCountdownString(targetDate, now);
}
