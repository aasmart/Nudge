var ipcRenderer = require('electron').ipcRenderer;
var Constants;
(function (Constants) {
    Constants.MINUTES_TO_MS = 60000;
    Constants.MS_TO_MINUTES = 1 / Constants.MINUTES_TO_MS;
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
        window.dispatchEvent(new Event('update-reminder-list'));
    };
    Reminder.prototype.sendBreakNotification = function (message) {
        var _this = this;
        new Notification("Time For a Break!", { body: message }).onclick = function () {
            if (_this.ignoredReminderIntervalAmount > 0)
                _this.setNextReminderTimeout(_this.reminderIntervalAmount);
            ipcRenderer.send('show-window', 'main');
        };
    };
    Reminder.prototype.start = function () {
        this.setNextReminderTimeout(this.reminderIntervalAmount);
    };
    Reminder.prototype.cancel = function () {
        if (this.reminderTimeout != null)
            clearTimeout(this.reminderTimeout);
    };
    Reminder.prototype.toJSON = function () {
        return {
            nextReminder: this.nextReminder.valueOf(),
            reminderIntervalAmount: this.reminderIntervalAmount,
            ignoredReminderIntervalAmount: this.ignoredReminderIntervalAmount,
            message: this.message
        };
    };
    return Reminder;
}());
function hasInput(inputElement) {
    return inputElement.value.length > 0;
}
var activeReminders = [];
function saveActiveReminders() {
    sessionStorage.setItem("active_reminders", JSON.stringify(activeReminders));
}
function loadActiveReminders() {
    var _a;
    var remindersObjs = (_a = JSON.parse(sessionStorage.getItem("active_reminders"))) !== null && _a !== void 0 ? _a : [];
    activeReminders = remindersObjs.map(function (obj) {
        var reminder = new Reminder(obj.reminderIntervalAmount, obj.ignoredReminderIntervalAmount, obj.message);
        reminder.nextReminder = new Date(obj.nextReminder.valueOf());
        return reminder;
    });
    activeReminders.forEach(function (reminder) {
        var nextStart = Math.max(reminder.nextReminder.valueOf() - new Date().valueOf(), 0);
        reminder.setNextReminderTimeout(nextStart);
    });
}
function listActiveReminders() {
    var reminderList = document.getElementById("reminder-list");
    var reminders = [reminderList.children[0]];
    activeReminders.forEach(function (reminder) {
        // Create the base div
        var reminderDiv = document.createElement("div");
        reminderDiv.classList.add('reminder');
        // Create the display text
        var text = document.createElement('p');
        text.innerHTML = "Next Reminder: ";
        var textSpan = document.createElement('span');
        textSpan.innerHTML = reminder.nextReminder.toLocaleString();
        textSpan.classList.add("next-timer-play");
        text.append(textSpan);
        // Create the delete button
        var deleteButton = document.createElement('button');
        deleteButton.innerHTML = "Delete";
        deleteButton.addEventListener('click', function () {
            var index = activeReminders.indexOf(reminder);
            activeReminders[index].cancel();
            if (index >= 0)
                activeReminders.splice(index, 1);
            window.dispatchEvent(new Event('update-reminder-list'));
        });
        // Create the edit button
        var editButton = document.createElement('button');
        editButton.innerHTML = "Edit";
        editButton.addEventListener('click', function () {
            var index = activeReminders.indexOf(reminder);
            sessionStorage.setItem("edit-reminder-index", index.toString());
            if (index < 0) {
                console.error("Failed to edit reminder for it does not exist");
                return;
            }
            saveActiveReminders();
            ipcRenderer.send('open-page', 'new_reminder');
        });
        // Finish building the ui element
        reminderDiv.append(text);
        reminderDiv.append(editButton);
        reminderDiv.append(deleteButton);
        reminders.push(reminderDiv);
    });
    reminderList.replaceChildren.apply(reminderList, reminders);
}
function loadCreateRemindersPage() {
    var createNewReminder = document.getElementById("create-new-reminder");
    createNewReminder.addEventListener('click', function () {
        saveActiveReminders();
        ipcRenderer.send('open-page', 'new_reminder');
    });
    window.addEventListener('update-reminder-list', function () { return listActiveReminders(); });
    window.dispatchEvent(new Event('update-reminder-list'));
}
function loadReminderCreationPage() {
    //#region interactive fields
    var startButton = document.getElementsByClassName("start-timer")[0];
    var messageField = document.getElementById("reminder-message");
    var intervalInput = document.getElementById("reminder-interval");
    var isOverrideEnabled = document.getElementById("enable-reminder-start-override");
    var startOverrideInput = document.getElementById("reminder-start-override");
    var reminderPenaltyCheckbox = document.getElementById("enable-ignore-reminder-penalty");
    var ignoredReminderPenalty = document.getElementById("reminder-ignore");
    //#endregion interactive fields
    // Set default values
    var editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1');
    if (editIndex >= 0) {
        messageField.value = activeReminders[editIndex].message;
        intervalInput.value = (activeReminders[editIndex].reminderIntervalAmount * Constants.MS_TO_MINUTES).toString();
        reminderPenaltyCheckbox.checked = activeReminders[editIndex].ignoredReminderIntervalAmount > 0;
        ignoredReminderPenalty.value = (activeReminders[editIndex].ignoredReminderIntervalAmount * Constants.MS_TO_MINUTES).toString();
        startButton.innerHTML = 'Update Reminder';
    }
    else {
        intervalInput.value = "30";
        messageField.value = "Time for a break!";
    }
    // Events -------------------------------
    startButton.addEventListener('click', function () {
        var reminderIntervalAmount = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        var ignoredReminderIntervalAmount = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;
        var startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : reminderIntervalAmount;
        var reminder = new Reminder(reminderIntervalAmount, ignoredReminderIntervalAmount, messageField.value);
        reminder.setNextReminderTimeout(startDelta);
        if (editIndex >= 0) {
            activeReminders[editIndex] = reminder;
            sessionStorage.setItem('edit-reminder-index', '-1');
        }
        else
            activeReminders.push(reminder);
        saveActiveReminders();
        startButton.blur();
        ipcRenderer.send('open-page', 'index');
    });
}
window.onload = function () {
    var location = window.location.href.split("/");
    loadActiveReminders();
    switch (location[location.length - 1]) {
        case 'index.html':
            loadCreateRemindersPage();
            break;
        case 'new_reminder.html':
            loadReminderCreationPage();
            break;
    }
};
