const MINUTES_TO_MS = 60000

let alertInterval: ReturnType<typeof setInterval>
let startTimeout: ReturnType<typeof setInterval>

let dateField: HTMLSpanElement

let nextTimerPlay: Date
let timerIntervalAmount: number
function breakAlert(message: string) {
    nextTimerPlay = addMilliseconds(new Date(), timerIntervalAmount)
    dateField.textContent = nextTimerPlay.toLocaleString()
    new Notification("Time For a Break!", { body: message }).onclick =
    () => window.open('');
}

function addMilliseconds(date: Date, milliseconds: number): Date {
    return new Date(date.getTime() + milliseconds)
}

window.onload =() => {
    const newTimerField = document.getElementsByClassName("timer-form")[0] as HTMLDivElement
    const updateTimerField = document.getElementsByClassName("update-timer-form")[0] as HTMLDivElement
    const startButton = document.getElementsByClassName("start-timer")[0] as HTMLButtonElement
    const stopButton = document.getElementsByClassName("stop-timer")[0] as HTMLButtonElement
    const messageField = document.getElementById("reminder-message") as HTMLTextAreaElement
    const intervalInput = document.getElementById("reminder-interval") as HTMLInputElement
    const isOverrideEnabled = document.getElementById("enable-reminder-start-override") as HTMLInputElement
    const startOverrideInput = document.getElementById("reminder-start-override") as HTMLInputElement
    dateField = document.getElementsByClassName("next-timer-play")[0] as HTMLSpanElement

    // Set default values
    intervalInput.value = "30"
    messageField.value = "Time for a break!"

    startButton.addEventListener('click', () => {
        const startDelta = isOverrideEnabled.checked ? startOverrideInput.valueAsNumber * MINUTES_TO_MS : 0;
        timerIntervalAmount = MINUTES_TO_MS * intervalInput.valueAsNumber;

        startTimeout = setTimeout(() => {
            if(isOverrideEnabled.checked)
                breakAlert(messageField.value)
            alertInterval = setInterval(() => breakAlert(messageField.value), timerIntervalAmount)
            nextTimerPlay = addMilliseconds(new Date(), timerIntervalAmount)
            dateField.textContent = nextTimerPlay.toLocaleString()
        }, startDelta)

        nextTimerPlay = addMilliseconds(new Date(), startDelta)
        dateField.textContent = nextTimerPlay.toLocaleString()

        startButton.blur()
        newTimerField.style.display = "none"
        updateTimerField.style.display = "flex"
    })

    stopButton.addEventListener('click', () => {
        clearInterval(alertInterval)
        clearTimeout(startTimeout)
        stopButton.blur()
        newTimerField.style.display = "flex"
        updateTimerField.style.display = "none"
    })
}

