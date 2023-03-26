const MINUTES_TO_MS = 60000

let alertInterval: ReturnType<typeof setInterval>

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
    dateField = document.getElementsByClassName("next-timer-play")[0] as HTMLSpanElement

    // Set default values
    intervalInput.value = "30"
    messageField.value = "Time for a break!"

    startButton.addEventListener('click', () => {
        timerIntervalAmount = MINUTES_TO_MS * parseFloat(intervalInput.value);

        alertInterval = setInterval(() => breakAlert(messageField.value), timerIntervalAmount)
        nextTimerPlay = addMilliseconds(new Date(), timerIntervalAmount)
        dateField.textContent = nextTimerPlay.toLocaleString()

        startButton.blur()
        newTimerField.style.display = "none"
        updateTimerField.style.display = "flex"
    })

    stopButton.addEventListener('click', () => {
        clearInterval(alertInterval)
        stopButton.blur()
        newTimerField.style.display = "flex"
        updateTimerField.style.display = "none"
    })
}

