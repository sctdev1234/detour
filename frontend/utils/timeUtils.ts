export const IN_PROGRESS_STATUSES = ['STARTING_SOON', 'STARTED', 'PICKUP_IN_PROGRESS', 'IN_PROGRESS', 'ARRIVED_PICKUP', 'CLIENT_PICKED_UP', 'CLIENT_DROPPED_OFF'];
export const IN_PROGRESS_REQUEST_STATUSES = ['started', 'picked_up', 'in_progress', 'IN_CAR'];

export const getNextTripOccurrence = (timeStart: string | undefined, days: string[] | undefined): Date | null => {
    if (!timeStart || !days || days.length === 0) return null;

    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    // Parse timeStart (assume "HH:mm")
    const match = timeStart.match(/(\d+):(\d+)/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    // Handle AM/PM if present
    if (timeStart.toLowerCase().includes('pm') && hours < 12) hours += 12;
    if (timeStart.toLowerCase().includes('am') && hours === 12) hours = 0;

    let closestDate: Date | null = null;

    for (let i = 0; i < 7; i++) {
        const testDate = new Date(now);
        testDate.setDate(now.getDate() + i);
        testDate.setHours(hours, minutes, 0, 0);

        const dayName = daysMap[testDate.getDay()];
        if (days.includes(dayName)) {
            if (testDate.getTime() > now.getTime()) {
                if (!closestDate || testDate.getTime() < closestDate.getTime()) {
                    closestDate = testDate;
                }
            }
        }
    }

    return closestDate;
};

export const getLateDurationString = (targetDate: Date | null, now: Date = new Date()): string | null => {
    if (!targetDate) return null;

    const diffMs = now.getTime() - targetDate.getTime();
    if (diffMs <= 0) return null; // not late yet

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const remainingSecs = diffSecs % 60;

    if (diffMins < 60) {
        return `Late by ${diffMins}m ${remainingSecs}s`;
    }

    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    return `Late by ${diffHours}h ${remainingMins}m ${remainingSecs}s`;
};

export const getCountdownString = (targetDate: Date | null, now: Date = new Date()): string | null => {
    if (!targetDate) return null;

    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs <= 0) return 'Now';

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const remainingSecs = diffSecs % 60;

    if (diffMins < 60) {
        return `in ${diffMins}m ${remainingSecs}s`;
    }

    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours < 24) {
        return `in ${diffHours}h ${remainingMins}m ${remainingSecs}s`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Tomorrow';
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
};
