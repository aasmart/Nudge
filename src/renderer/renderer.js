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
let reminderTimeout;
let dateField;
let nextReminder;
let reminderIntervalAmount;
let ignoredReminderIntervalAmount;
function setNextReminderTimeout(delayAmount, message) {
    clearTimeout(reminderTimeout);
    reminderTimeout = setTimeout(() => {
        sendBreakNotification(message);
        setNextReminderTimeout(ignoredReminderIntervalAmount > 0 ? ignoredReminderIntervalAmount : reminderIntervalAmount, message);
    }, delayAmount);
    nextReminder = new Date().addMilliseconds(delayAmount);
    dateField.textContent = nextReminder.toLocaleString();
}
function sendBreakNotification(message) {
    new Notification("Time For a Break!", { body: message }).onclick = () => {
        if (ignoredReminderIntervalAmount > 0)
            setNextReminderTimeout(reminderIntervalAmount, message);
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
        reminderIntervalAmount = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        ignoredReminderIntervalAmount = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;
        const startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : reminderIntervalAmount;
        setNextReminderTimeout(startDelta, messageField.value);
        startButton.blur();
        toggleElementDisplay(newTimerField);
        toggleElementDisplay(updateTimerField);
    });
    stopButton.addEventListener('click', () => {
        clearTimeout(reminderTimeout);
        stopButton.blur();
        toggleElementDisplay(newTimerField);
        toggleElementDisplay(updateTimerField);
    });
};
