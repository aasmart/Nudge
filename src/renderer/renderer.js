var MINUTES_TO_MS = 60000;
var alertInterval;
var startTimeout;
var dateField;
var nextTimerPlay;
var timerIntervalAmount;
function breakAlert(message) {
    nextTimerPlay = addMilliseconds(new Date(), timerIntervalAmount);
    dateField.textContent = nextTimerPlay.toLocaleString();
    new Notification("Time For a Break!", { body: message }).onclick =
        function () {
            window.open('reminder:open-main-win', 'modal');
        };
}
function addMilliseconds(date, milliseconds) {
    return new Date(date.getTime() + milliseconds);
}
window.onload = function () {
    var newTimerField = document.getElementsByClassName("timer-form")[0];
    var updateTimerField = document.getElementsByClassName("update-timer-form")[0];
    var startButton = document.getElementsByClassName("start-timer")[0];
    var stopButton = document.getElementsByClassName("stop-timer")[0];
    var messageField = document.getElementById("reminder-message");
    var intervalInput = document.getElementById("reminder-interval");
    var isOverrideEnabled = document.getElementById("enable-reminder-start-override");
    var startOverrideInput = document.getElementById("reminder-start-override");
    dateField = document.getElementsByClassName("next-timer-play")[0];
    // Set default values
    intervalInput.value = "30";
    messageField.value = "Time for a break!";
    startButton.addEventListener('click', function () {
        var startDelta = isOverrideEnabled.checked ? startOverrideInput.valueAsNumber * MINUTES_TO_MS : 0;
        timerIntervalAmount = MINUTES_TO_MS * intervalInput.valueAsNumber;
        startTimeout = setTimeout(function () {
            if (isOverrideEnabled.checked)
                breakAlert(messageField.value);
            alertInterval = setInterval(function () { return breakAlert(messageField.value); }, timerIntervalAmount);
            nextTimerPlay = addMilliseconds(new Date(), timerIntervalAmount);
            dateField.textContent = nextTimerPlay.toLocaleString();
        }, startDelta);
        nextTimerPlay = addMilliseconds(new Date(), startDelta);
        dateField.textContent = nextTimerPlay.toLocaleString();
        startButton.blur();
        newTimerField.style.display = "none";
        updateTimerField.style.display = "flex";
    });
    stopButton.addEventListener('click', function () {
        clearInterval(alertInterval);
        clearTimeout(startTimeout);
        stopButton.blur();
        newTimerField.style.display = "flex";
        updateTimerField.style.display = "none";
    });
};
