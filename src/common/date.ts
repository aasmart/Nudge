export {}

declare global {
    interface Date {
        addMilliseconds(milliseconds: number): Date
    }
}

Date.prototype.addMilliseconds = function(milliseconds: number): Date {
    const date = this;
    return new Date(date.getTime() + milliseconds)
}