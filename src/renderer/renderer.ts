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

// This code is gross lol...

let alertInterval: ReturnType<typeof setInterval>
let reminderStartTimeout: ReturnType<typeof setInterval>

let dateField: HTMLSpanElement

let nextReminder: Date
let reminderInterval: number
let ignoredReminderInterval: number
function updateNextReminderDate(useIgnore: boolean) {
    if(useIgnore && ignoredReminderInterval > 0)
        nextReminder = new Date().addMilliseconds(ignoredReminderInterval)
    else
        nextReminder = new Date().addMilliseconds(reminderInterval)

    dateField.textContent = nextReminder.toLocaleString()
}

function sendBreakNotification(message: string) {
    updateNextReminderDate(true)
    new Notification("Time For a Break!", { body: message }).onclick =() => { 
        updateNextReminderDate(false)
        window.open('reminder:open-main-win', 'modal') 
    };
}

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
        const startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : 0;
        reminderInterval = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        ignoredReminderInterval = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;

        reminderStartTimeout = setTimeout(() => {
            if(isOverrideEnabled.checked)
                sendBreakNotification(messageField.value)
            else
                updateNextReminderDate(false)

            alertInterval = setInterval(() => sendBreakNotification(messageField.value), reminderInterval)
        }, startDelta)

        nextReminder = new Date().addMilliseconds(startDelta)
        dateField.textContent = nextReminder.toLocaleString()

        startButton.blur()
        toggleElementDisplay(newTimerField)
        toggleElementDisplay(updateTimerField)
    })

    stopButton.addEventListener('click', () => {
        clearInterval(alertInterval)
        clearTimeout(reminderStartTimeout)
        stopButton.blur()
        toggleElementDisplay(newTimerField)
        toggleElementDisplay(updateTimerField)
    })
}

