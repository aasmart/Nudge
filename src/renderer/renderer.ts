namespace Constants {
    export const MINUTES_TO_MS = 60000
}

interface Date {
    addMilliseconds(milliseconds: number): Date
}

Date.prototype.addMilliseconds = function(milliseconds: number): Date {
    const date = this;
    return new Date(date.getTime() + milliseconds)
}

class Reminder {
    reminderTimeout!: ReturnType<typeof setInterval>
    nextReminder!: Date
    reminderIntervalAmount: number
    ignoredReminderIntervalAmount: number
    message: string

    constructor(reminderIntervalAmount: number, ignoredReminderIntervalAmount: number, message: string) {
        this.reminderIntervalAmount = reminderIntervalAmount;
        this.ignoredReminderIntervalAmount = ignoredReminderIntervalAmount;
        this.message = message;
    }

    setNextReminderTimeout(delayAmount: number) {
        clearTimeout(this.reminderTimeout)
    
        this.reminderTimeout = setTimeout(() => {
            this.sendBreakNotification(this.message)
            this.setNextReminderTimeout(this.ignoredReminderIntervalAmount > 0 ? this.ignoredReminderIntervalAmount : this.reminderIntervalAmount)
        }, delayAmount)
    
        this.nextReminder = new Date().addMilliseconds(delayAmount);
        dateField.textContent = this.nextReminder.toLocaleString()
    }

    private sendBreakNotification(message: string) {
        new Notification("Time For a Break!", { body: message }).onclick =() => { 
            if(this.ignoredReminderIntervalAmount > 0)
                this.setNextReminderTimeout(this.reminderIntervalAmount)
            window.open('reminder:open-main-win', 'modal') 
        };
    }

    start() {
        this.setNextReminderTimeout(this.reminderIntervalAmount)
    }

    cancel() {
        if(this.reminderTimeout != null)
            clearTimeout(this.reminderTimeout)
    }
}

let activeReminder: Reminder
let dateField: HTMLSpanElement

function hasInput(inputElement: HTMLInputElement): boolean {
    return inputElement.value.length > 0; 
}

function toggleElementDisplay(element: HTMLElement) {
    element.style.display = element.style.display === 'none' ? 'inherit' : 'none'
}

window.onload = () => {
    //#region interactive fields
    const newTimerField = document.getElementsByClassName("timer-form")[0] as HTMLDivElement
    const updateTimerField = document.getElementsByClassName("update-timer-form")[0] as HTMLDivElement
    const startButton = document.getElementsByClassName("start-timer")[0] as HTMLButtonElement
    const stopButton = document.getElementsByClassName("stop-timer")[0] as HTMLButtonElement
    const messageField = document.getElementById("reminder-message") as HTMLTextAreaElement
    const intervalInput = document.getElementById("reminder-interval") as HTMLInputElement
    const isOverrideEnabled = document.getElementById("enable-reminder-start-override") as HTMLInputElement
    const startOverrideInput = document.getElementById("reminder-start-override") as HTMLInputElement
    const reminderPenaltyCheckbox = document.getElementById("enable-ignore-reminder-penalty") as HTMLInputElement
    const ignoredReminderPenalty = document.getElementById("reminder-ignore") as HTMLInputElement
    dateField = document.getElementsByClassName("next-timer-play")[0] as HTMLSpanElement
    //#endregion interactive fields

    // Set default values
    intervalInput.value = "30"
    messageField.value = "Time for a break!"
    newTimerField.style.display = 'inherit'
    updateTimerField.style.display = 'none'

    // Events -------------------------------
    startButton.addEventListener('click', () => {
        const reminderIntervalAmount = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        const ignoredReminderIntervalAmount = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;

        const startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : reminderIntervalAmount;

        let reminder = new Reminder(reminderIntervalAmount, ignoredReminderIntervalAmount, messageField.value)
        reminder.setNextReminderTimeout(startDelta)

        activeReminder = reminder;

        startButton.blur()
        toggleElementDisplay(newTimerField)
        toggleElementDisplay(updateTimerField)
    })

    stopButton.addEventListener('click', () => {
        activeReminder.cancel()
        stopButton.blur()
        toggleElementDisplay(newTimerField)
        toggleElementDisplay(updateTimerField)
    })
}

