"use strict";
var Constants;
(function (Constants) {
    Constants.MINUTES_TO_MS = 60000;
})(Constants || (Constants = {}));
Date.prototype.addMilliseconds = function (milliseconds) {
    const date = this;
    return new Date(date.getTime() + milliseconds);
};
// This code is gross lol...
let alertInterval;
let reminderStartTimeout;
let dateField;
let nextReminder;
let reminderInterval;
let ignoredReminderInterval;
function updateNextReminderDate(useIgnore) {
    if (useIgnore && ignoredReminderInterval > 0)
        nextReminder = new Date().addMilliseconds(ignoredReminderInterval);
    else
        nextReminder = new Date().addMilliseconds(reminderInterval);
    dateField.textContent = nextReminder.toLocaleString();
}
function sendBreakNotification(message) {
    updateNextReminderDate(true);
    new Notification("Time For a Break!", { body: message }).onclick = () => {
        updateNextReminderDate(false);
        window.open('reminder:open-main-win', 'modal');
    };
}
function hasInput(inputElement) {
    return inputElement.value.length > 0;
}
function toggleElementDisplay(element) {
    element.style.display = element.style.display === 'none' ? 'inherit' : 'none';
}
window.onload = () => {
    //#region interactive fields
    const newTimerField = document.getElementsByClassName("timer-form")[0];
    const updateTimerField = document.getElementsByClassName("update-timer-form")[0];
    const startButton = document.getElementsByClassName("start-timer")[0];
    const stopButton = document.getElementsByClassName("stop-timer")[0];
    const messageField = document.getElementById("reminder-message");
    const intervalInput = document.getElementById("reminder-interval");
    const isOverrideEnabled = document.getElementById("enable-reminder-start-override");
    const startOverrideInput = document.getElementById("reminder-start-override");
    const reminderPenaltyCheckbox = document.getElementById("enable-ignore-reminder-penalty");
    const ignoredReminderPenalty = document.getElementById("reminder-ignore");
    dateField = document.getElementsByClassName("next-timer-play")[0];
    //#endregion interactive fields
    // Set default values
    intervalInput.value = "30";
    messageField.value = "Time for a break!";
    newTimerField.style.display = 'inherit';
    updateTimerField.style.display = 'none';
    // Events -------------------------------
    startButton.addEventListener('click', () => {
        const startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : 0;
        reminderInterval = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        ignoredReminderInterval = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;
        reminderStartTimeout = setTimeout(() => {
            if (isOverrideEnabled.checked)
                sendBreakNotification(messageField.value);
            else
                updateNextReminderDate(false);
            alertInterval = setInterval(() => sendBreakNotification(messageField.value), reminderInterval);
        }, startDelta);
        nextReminder = new Date().addMilliseconds(startDelta);
        dateField.textContent = nextReminder.toLocaleString();
        startButton.blur();
        toggleElementDisplay(newTimerField);
        toggleElementDisplay(updateTimerField);
    });
    stopButton.addEventListener('click', () => {
        clearInterval(alertInterval);
        clearTimeout(reminderStartTimeout);
        stopButton.blur();
        toggleElementDisplay(newTimerField);
        toggleElementDisplay(updateTimerField);
    });
};
