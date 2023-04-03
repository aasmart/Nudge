var Constants;
(function (Constants) {
    Constants.MINUTES_TO_MS = 60000;
})(Constants || (Constants = {}));
Date.prototype.addMilliseconds = function (milliseconds) {
    var date = this;
    return new Date(date.getTime() + milliseconds);
};
var Reminder = /** @class */ (function () {
    function Reminder(reminderIntervalAmount, ignoredReminderIntervalAmount, message) {
        this.reminderIntervalAmount = reminderIntervalAmount;
        this.ignoredReminderIntervalAmount = ignoredReminderIntervalAmount;
        this.message = message;
    }
    Reminder.prototype.setNextReminderTimeout = function (delayAmount) {
        var _this = this;
        clearTimeout(this.reminderTimeout);
        this.reminderTimeout = setTimeout(function () {
            _this.sendBreakNotification(_this.message);
            _this.setNextReminderTimeout(_this.ignoredReminderIntervalAmount > 0 ? _this.ignoredReminderIntervalAmount : _this.reminderIntervalAmount);
        }, delayAmount);
        this.nextReminder = new Date().addMilliseconds(delayAmount);
        dateField.textContent = this.nextReminder.toLocaleString();
    };
    Reminder.prototype.sendBreakNotification = function (message) {
        var _this = this;
        new Notification("Time For a Break!", { body: message }).onclick = function () {
            if (_this.ignoredReminderIntervalAmount > 0)
                _this.setNextReminderTimeout(_this.reminderIntervalAmount);
            window.open('reminder:open-main-win', 'modal');
        };
    };
    Reminder.prototype.start = function () {
        this.setNextReminderTimeout(this.reminderIntervalAmount);
    };
    Reminder.prototype.cancel = function () {
        if (this.reminderTimeout != null)
            clearTimeout(this.reminderTimeout);
    };
    return Reminder;
}());
var activeReminder;
var dateField;
function hasInput(inputElement) {
    return inputElement.value.length > 0;
}
function toggleElementDisplay(element) {
    element.style.display = element.style.display === 'none' ? 'inherit' : 'none';
}
window.onload = function () {
    //#region interactive fields
    var newTimerField = document.getElementsByClassName("timer-form")[0];
    var updateTimerField = document.getElementsByClassName("update-timer-form")[0];
    var startButton = document.getElementsByClassName("start-timer")[0];
    var stopButton = document.getElementsByClassName("stop-timer")[0];
    var messageField = document.getElementById("reminder-message");
    var intervalInput = document.getElementById("reminder-interval");
    var isOverrideEnabled = document.getElementById("enable-reminder-start-override");
    var startOverrideInput = document.getElementById("reminder-start-override");
    var reminderPenaltyCheckbox = document.getElementById("enable-ignore-reminder-penalty");
    var ignoredReminderPenalty = document.getElementById("reminder-ignore");
    dateField = document.getElementsByClassName("next-timer-play")[0];
    //#endregion interactive fields
    // Set default values
    intervalInput.value = "30";
    messageField.value = "Time for a break!";
    newTimerField.style.display = 'inherit';
    updateTimerField.style.display = 'none';
    // Events -------------------------------
    startButton.addEventListener('click', function () {
        var reminderIntervalAmount = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        var ignoredReminderIntervalAmount = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;
        var startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : reminderIntervalAmount;
        var reminder = new Reminder(reminderIntervalAmount, ignoredReminderIntervalAmount, messageField.value);
        reminder.setNextReminderTimeout(startDelta);
        activeReminder = reminder;
        startButton.blur();
        toggleElementDisplay(newTimerField);
        toggleElementDisplay(updateTimerField);
    });
    stopButton.addEventListener('click', function () {
        activeReminder.cancel();
        stopButton.blur();
        toggleElementDisplay(newTimerField);
        toggleElementDisplay(updateTimerField);
    });
};
