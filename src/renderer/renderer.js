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
    function Reminder(reminderIntervalAmount, reminderStartOverrideAmoun, ignoredReminderIntervalAmount, message, title) {
        this.reminderIntervalAmount = reminderIntervalAmount;
        this.reminderStartOverrideAmount = reminderStartOverrideAmoun;
        this.ignoredReminderIntervalAmount = ignoredReminderIntervalAmount;
        this.message = message;
        this.title = title;
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
        new Notification(this.title, { body: message }).onclick = function () {
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
            reminderStartOverrideAmount: this.reminderStartOverrideAmount,
            ignoredReminderIntervalAmount: this.ignoredReminderIntervalAmount,
            message: this.message,
            title: this.title
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
        var reminder = new Reminder(obj.reminderIntervalAmount, obj.reminderStartOverrideAmount, obj.ignoredReminderIntervalAmount, obj.message, obj.title);
        reminder.nextReminder = new Date(obj.nextReminder.valueOf());
        return reminder;
    });
    var editReminder = getEditReminder();
    activeReminders.forEach(function (reminder) {
        if (editReminder !== null && reminder === editReminder)
            return;
        var nextStart = Math.max(reminder.nextReminder.valueOf() - new Date().valueOf(), 0);
        reminder.setNextReminderTimeout(nextStart);
    });
}
function setEditReminder(index) {
    sessionStorage.setItem('edit-reminder-index', index.toString());
}
function getEditReminder() {
    var editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1');
    return activeReminders[editIndex] || null;
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
            if (index < 0) {
                console.error("Failed to edit reminder for it does not exist");
                sendPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder');
                return;
            }
            setEditReminder(index);
            saveActiveReminders();
            ipcRenderer.send('open-page', 'reminder');
        });
        // Finish building the ui element
        reminderDiv.append(text);
        reminderDiv.append(editButton);
        reminderDiv.append(deleteButton);
        reminders.push(reminderDiv);
    });
    reminderList.replaceChildren.apply(reminderList, reminders);
}
function sendPopup(title, content) {
    var popupContainer = document.getElementsByClassName("popup-container")[0];
    if (popupContainer === null) {
        console.error('Cannot create popup as the container does not exist');
        return;
    }
    var section = popupContainer.children[0];
    var popupTitle = section.children[0];
    var popupText = section.children[1];
    var popupButton = section.children[2];
    popupTitle.innerHTML = title;
    popupText.innerHTML = content;
    function handleButton() {
        section.classList.remove('show-popup');
        section.classList.add('hide-popup');
        popupButton.style.visibility = 'hidden';
    }
    function hideContainer(e) {
        if (e.animationName === 'popup-out')
            popupContainer.style.visibility = 'hidden';
    }
    popupButton.addEventListener('click', handleButton);
    popupContainer.addEventListener('animationend', hideContainer);
    // Show the popup
    popupContainer.style.visibility = 'visible';
    popupButton.style.visibility = 'visible';
    section.classList.remove('hide-popup');
    section.classList.add('show-popup');
}
function loadCreateRemindersPage() {
    var createNewReminder = document.getElementById("create-new-reminder");
    createNewReminder.addEventListener('click', function () {
        saveActiveReminders();
        ipcRenderer.send('open-page', 'reminder');
    });
    window.addEventListener('update-reminder-list', function () { return listActiveReminders(); });
    window.dispatchEvent(new Event('update-reminder-list'));
}
function loadReminderCreationPage() {
    //#region interactive fields
    var createButton = document.getElementsByClassName("start-timer")[0];
    var cancelButton = document.getElementsByClassName("cancel-reminder")[0];
    var messageField = document.getElementById("reminder-message");
    var titleField = document.getElementById("reminder-title");
    var intervalInput = document.getElementById("reminder-interval");
    var isOverrideEnabled = document.getElementById("enable-reminder-start-override");
    var startOverrideInput = document.getElementById("reminder-start-override");
    var reminderPenaltyCheckbox = document.getElementById("enable-ignore-reminder-penalty");
    var ignoredReminderPenalty = document.getElementById("reminder-ignore");
    //#endregion interactive fields
    // Update display if the user is editing
    var editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1');
    if (editIndex >= 0) {
        var editReminder = activeReminders[editIndex];
        messageField.value = editReminder.message;
        titleField.value = editReminder.title;
        intervalInput.value = (editReminder.reminderIntervalAmount * Constants.MS_TO_MINUTES).toString();
        isOverrideEnabled.checked = editReminder.reminderStartOverrideAmount > 0;
        startOverrideInput.value = (editReminder.reminderStartOverrideAmount * Constants.MS_TO_MINUTES).toString();
        reminderPenaltyCheckbox.checked = editReminder.ignoredReminderIntervalAmount > 0;
        ignoredReminderPenalty.value = (editReminder.ignoredReminderIntervalAmount * Constants.MS_TO_MINUTES).toString();
        createButton.innerHTML = createButton.getAttribute('when-editing') || createButton.innerHTML;
    }
    // Events -------------------------------
    createButton.addEventListener('click', function () {
        if (!intervalInput.checkValidity()
            || (isOverrideEnabled.checked && !startOverrideInput.checkValidity())
            || (reminderPenaltyCheckbox.checked && !ignoredReminderPenalty.checkValidity())
            || (!titleField.checkValidity())) {
            createButton.blur();
            sendPopup('Cannot Create Reminder', 'One or more inputs are invalid');
            return;
        }
        var reminderIntervalAmount = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        var ignoredReminderIntervalAmount = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;
        var startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : reminderIntervalAmount;
        var reminder = new Reminder(reminderIntervalAmount, startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS, ignoredReminderIntervalAmount, messageField.value, titleField.value);
        reminder.setNextReminderTimeout(startDelta);
        if (editIndex >= 0) {
            activeReminders[editIndex] = reminder;
            sessionStorage.setItem('edit-reminder-index', '-1');
        }
        else
            activeReminders.push(reminder);
        saveActiveReminders();
        createButton.blur();
        ipcRenderer.send('open-page', 'index');
    });
    cancelButton.addEventListener('click', function () {
        sessionStorage.setItem('edit-reminder-index', '-1');
        saveActiveReminders();
        createButton.blur();
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
        case 'reminder.html':
            loadReminderCreationPage();
            break;
    }
};
