import { Constants } from "./constants";

declare global {
    interface Date {
        addMilliseconds(milliseconds: number): Date
    }
}

Date.prototype.addMilliseconds = function(milliseconds: number): Date {
    const date = this;
    return new Date(date.getTime() + milliseconds)
}

module DateUtils {
    export function getTimeDifferenceString(a: Date, b: Date): string {
        const difference = b.valueOf() - a.valueOf();
        if(difference < 0) {
            throw new EvalError("Date b must be after date a");
        } else if(difference >= Constants.DAY_MS) {
            const days = Math.floor(difference / Constants.DAY_MS);
            return `${days} ${days == 1 ? "day" : "days"}.`;
        } else if(difference >= Constants.HOUR_MS) {
            const hours = Math.floor(difference / Constants.HOUR_MS);
            return `${hours} ${hours == 1 ? "hour" : "hours"}.`;
        } else if(difference >= Constants.MINUTES_TO_MS) {
            const minutes = Math.floor(difference / Constants.MINUTES_TO_MS);
            return `${minutes} ${minutes == 1 ? "minute" : "minutes"}.`;
        }
        return "<1 minute.";
    }
}

export { DateUtils };
