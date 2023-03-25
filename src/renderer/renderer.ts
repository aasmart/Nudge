const MINUTES_TO_MS = 60000

let alertInterval: ReturnType<typeof setInterval>

function breakAlert(message: string) {
    new Notification("Time For a Break!", { body: message }).onclick =
    () => console.log(message);
}

window.onload =() => {
    const startButton = document.getElementsByClassName("start-timer")[0] as HTMLButtonElement
    const stopButton = document.getElementsByClassName("stop-timer")[0] as HTMLButtonElement
    const messageField = document.getElementById("reminder-message") as HTMLTextAreaElement
    const intervalInput = document.getElementById("reminder-interval") as HTMLInputElement

    startButton.addEventListener('click', () => {
        const intervalAmountMs = MINUTES_TO_MS * parseFloat(intervalInput.value);

        alertInterval = setInterval(() => breakAlert(messageField.value), intervalAmountMs)
    })

    stopButton.addEventListener('click', () => {
        clearInterval(alertInterval)
    })
}

