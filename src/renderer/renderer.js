"use strict";
let { ipcRenderer } = require('electron');
var Constants;
(function (Constants) {
    Constants.MINUTES_TO_MS = 60000;
    Constants.MS_TO_MINUTES = 1 / Constants.MINUTES_TO_MS;
})(Constants || (Constants = {}));
Date.prototype.addMilliseconds = function (milliseconds) {
    const date = this;
    return new Date(date.getTime() + milliseconds);
};
class InputForm {
    constructor(formClass) {
        this.inputs = new Map();
        this.buttons = new Map();
        this.textareas = new Map();
        this.container = document.getElementsByClassName(formClass)[0];
        Array.from(this.container.getElementsByTagName('input')).forEach(e => {
            const id = e.getAttribute('id');
            const type = e.getAttribute('type');
            if (id == null)
                return;
            switch (type) {
                case 'checkbox':
                    const toggles = e.getAttribute('toggles');
                    if (toggles != null) {
                        e.onchange = () => {
                            const input = this.inputs.get(toggles);
                            if (input == null)
                                return;
                            input.disabled = !e.checked;
                        };
                    }
                    break;
            }
            this.inputs.set(id, e);
        });
        Array.from(this.container.getElementsByTagName('button')).forEach(e => {
            const id = e.getAttribute('id');
            if (id == null)
                return;
            this.buttons.set(id, e);
        });
        Array.from(this.container.getElementsByTagName('textarea')).forEach(e => {
            const id = e.getAttribute('id');
            if (id == null)
                return;
            this.textareas.set(id, e);
        });
    }
    setValue(input, value) {
        const element = this.getInputElement(input);
        if (element == null)
            return;
        if (!element.disabled)
            element.value = value.toString();
        else
            element.value = '';
    }
    getValue(input, checkActive = false) {
        var _a;
        if (checkActive && !this.activeAndFilled(input))
            return '';
        return ((_a = this.getInputElement(input)) === null || _a === void 0 ? void 0 : _a.value) || '';
    }
    getValueAsNumber(input, checkActive = false) {
        var _a;
        if (checkActive && !this.activeAndFilled(input))
            return '';
        return ((_a = this.getInputElement(input)) === null || _a === void 0 ? void 0 : _a.valueAsNumber) || '';
    }
    hasRequiredFields() {
        return Array.from(this.inputs.values()).filter(e => !e.checkValidity()).length <= 0;
    }
    hasValue(input) {
        var _a, _b;
        return (((_b = (_a = this.inputs.get(input)) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.length) || 0) > 0;
    }
    activeAndFilled(input) {
        const inputElement = this.getInputElement(input);
        if (inputElement == null)
            return false;
        return !inputElement.disabled && inputElement.value.length > 0;
    }
    setChecked(input, checked) {
        const element = this.inputs.get(input);
        if (element == null || element.getAttribute('type') !== 'checkbox')
            return;
        element.checked = checked;
        element.dispatchEvent(new Event('change'));
    }
    getInputElement(input) {
        return this.inputs.get(input)
            || this.textareas.get(input)
            || this.buttons.get(input)
            || null;
    }
}
class Reminder {
    constructor(reminderIntervalAmount, reminderStartOverrideAmount, ignoredReminderIntervalAmount, message, title, isPaused = false, pausedTime = new Date()) {
        this.reminderIntervalAmount = reminderIntervalAmount;
        this.reminderStartOverrideAmount = reminderStartOverrideAmount;
        this.ignoredReminderIntervalAmount = ignoredReminderIntervalAmount;
        this.message = message;
        this.title = title;
        this.paused = isPaused;
        this.pausedTime = pausedTime;
    }
    setNextReminderTimeout(delayAmount) {
        clearTimeout(this.reminderTimeout);
        this.reminderTimeout = setTimeout(() => {
            this.sendBreakNotification(this.message);
            this.setNextReminderTimeout(this.ignoredReminderIntervalAmount > 0 ? this.ignoredReminderIntervalAmount : this.reminderIntervalAmount);
        }, delayAmount);
        this.nextReminder = new Date().addMilliseconds(delayAmount);
        window.dispatchEvent(new Event('update-reminder-list'));
    }
    sendBreakNotification(message) {
        new Notification(this.title, { body: message }).onclick = () => {
            if (this.ignoredReminderIntervalAmount > 0)
                this.setNextReminderTimeout(this.reminderIntervalAmount);
            ipcRenderer.send('show-window', 'main');
        };
    }
    start() {
        this.setNextReminderTimeout(this.reminderIntervalAmount);
    }
    cancel() {
        if (this.reminderTimeout != null)
            clearTimeout(this.reminderTimeout);
    }
    setPaused(paused) {
        if (paused) {
            this.cancel();
            this.pausedTime = new Date();
        }
        else if (this.paused && !paused) {
            const nextPlay = this.nextReminder.valueOf() - this.pausedTime.valueOf();
            this.setNextReminderTimeout(nextPlay);
        }
        this.paused = paused;
        window.dispatchEvent(new Event('update-reminder-list'));
    }
    toJSON() {
        return {
            nextReminder: this.nextReminder.valueOf(),
            reminderIntervalAmount: this.reminderIntervalAmount,
            reminderStartOverrideAmount: this.reminderStartOverrideAmount,
            ignoredReminderIntervalAmount: this.ignoredReminderIntervalAmount,
            message: this.message,
            title: this.title,
            paused: this.paused,
            pausedTime: this.pausedTime,
        };
    }
}
let activeReminders = [];
function saveActiveReminders() {
    sessionStorage.setItem("active_reminders", JSON.stringify(activeReminders));
}
function loadActiveReminders() {
    var _a;
    let remindersObjs = (_a = JSON.parse(sessionStorage.getItem("active_reminders"))) !== null && _a !== void 0 ? _a : [];
    activeReminders = remindersObjs.map(obj => {
        const reminder = new Reminder(obj.reminderIntervalAmount, obj.reminderStartOverrideAmount, obj.ignoredReminderIntervalAmount, obj.message, obj.title, obj.paused, obj.pausedTime);
        reminder.nextReminder = new Date(obj.nextReminder.valueOf());
        return reminder;
    });
    const editReminder = getEditReminder();
    activeReminders.forEach(reminder => {
        if (editReminder !== null && reminder === editReminder || reminder.paused)
            return;
        const nextStart = Math.max(reminder.nextReminder.valueOf() - new Date().valueOf(), 0);
        reminder.setNextReminderTimeout(nextStart);
    });
}
function setEditReminder(index) {
    sessionStorage.setItem('edit-reminder-index', index.toString());
}
function getEditReminder() {
    const editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1');
    return activeReminders[editIndex] || null;
}
function listActiveReminders() {
    const reminderList = document.getElementById("reminder-list").children[1];
    let reminders = [];
    activeReminders.forEach(reminder => {
        // Create the base div
        let reminderListElement = document.createElement("li");
        reminderListElement.classList.add('reminder');
        // Create the display text
        let text = document.createElement('p');
        text.innerHTML = "Next Reminder: ";
        let textSpan = document.createElement('span');
        if (reminder.paused)
            textSpan.innerHTML = "this reminder is paused";
        else
            textSpan.innerHTML = reminder.nextReminder.toLocaleString();
        textSpan.classList.add("next-timer-play");
        text.append(textSpan);
        // Create the delete button
        let deleteButton = document.createElement('button');
        deleteButton.innerHTML = "Delete";
        deleteButton.setAttribute("action", "destructive");
        deleteButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder);
            activeReminders[index].cancel();
            if (index >= 0)
                activeReminders.splice(index, 1);
            saveActiveReminders();
            window.dispatchEvent(new Event('update-reminder-list'));
        });
        // Create the edit button
        let editButton = document.createElement('button');
        editButton.innerHTML = "Edit";
        editButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder);
            if (index < 0) {
                console.error("Failed to edit reminder for it does not exist");
                sendPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder');
                return;
            }
            setEditReminder(index);
            saveActiveReminders();
            ipcRenderer.send('open-page', 'reminder');
        });
        // Create the pause button
        let pauseButton = document.createElement('button');
        pauseButton.setAttribute('aria-label', reminder.paused ? 'Unpause' : 'Pause');
        pauseButton.innerHTML = reminder.paused ? 'Unpause' : 'Pause';
        pauseButton.addEventListener('click', () => {
            if (pauseButton.getAttribute('aria-label') === 'Pause') {
                pauseButton.setAttribute('aria-label', 'Unpause');
                reminder.setPaused(true);
                pauseButton.innerHTML = 'Unpause';
            }
            else {
                pauseButton.setAttribute('aria-label', 'Pause');
                reminder.setPaused(false);
                pauseButton.innerHTML = 'Pause';
            }
        });
        // Finish building the ui element
        reminderListElement.append(text);
        reminderListElement.append(pauseButton);
        reminderListElement.append(editButton);
        reminderListElement.append(deleteButton);
        reminders.push(reminderListElement);
    });
    reminderList.replaceChildren(...reminders);
}
function sendPopup(title, content) {
    const popupContainer = document.getElementsByClassName("popup-container")[0];
    if (popupContainer === null) {
        console.error('Cannot create popup as the container does not exist');
        return;
    }
    const section = popupContainer.children[0];
    const popupTitle = section.children[0];
    const popupText = section.children[1];
    const popupButton = section.children[2];
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
    const createNewReminder = document.getElementById("create-new-reminder");
    createNewReminder.addEventListener('click', () => {
        saveActiveReminders();
        ipcRenderer.send('open-page', 'reminder');
    });
    window.addEventListener('update-reminder-list', () => listActiveReminders());
    window.dispatchEvent(new Event('update-reminder-list'));
}
function loadReminderCreationPage() {
    var _a, _b;
    const form = new InputForm('user-input');
    //#region interactive fields
    const CREATE_BUTTON = 'start-timer';
    const CANCEL_BUTTON = 'cancel-reminder';
    const MESSAGE_INPUT = 'reminder-message';
    const TITLE_INPUT = 'reminder-title';
    const REMINDER_INTERVAL_INPUT = 'reminder-interval';
    const START_OVERRIDE_CHECKBOX = 'enable-reminder-start-override';
    const START_OVERRIDE_INPUT = 'reminder-start-override';
    const REMINDER_PENALTY_CHECKBOX = 'enable-ignore-reminder-penalty';
    const IGNORED_REMINDER_PENALTY_INPUT = 'reminder-ignore';
    //#endregion interactive fields
    // Update display if the user is editing
    const editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1');
    if (editIndex >= 0) {
        const editReminder = activeReminders[editIndex];
        form.setValue(MESSAGE_INPUT, editReminder.message);
        form.setValue(TITLE_INPUT, editReminder.title);
        form.setValue(REMINDER_INTERVAL_INPUT, editReminder.reminderIntervalAmount * Constants.MS_TO_MINUTES);
        form.setChecked(START_OVERRIDE_CHECKBOX, editReminder.reminderStartOverrideAmount > 0);
        form.setValue(START_OVERRIDE_INPUT, editReminder.reminderStartOverrideAmount * Constants.MS_TO_MINUTES);
        form.setChecked(REMINDER_PENALTY_CHECKBOX, editReminder.ignoredReminderIntervalAmount > 0);
        form.setValue(IGNORED_REMINDER_PENALTY_INPUT, editReminder.ignoredReminderIntervalAmount * Constants.MS_TO_MINUTES);
        const createButton = form.getInputElement(CREATE_BUTTON);
        createButton.innerHTML = createButton.getAttribute('when-editing') || createButton.innerHTML;
    }
    // Events -------------------------------
    (_a = form.getInputElement(CREATE_BUTTON)) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        if (!form.hasRequiredFields()) {
            sendPopup('Cannot Create Reminder', 'One or more inputs are invalid');
            return;
        }
        const reminderIntervalAmount = Constants.MINUTES_TO_MS * form.getValueAsNumber(REMINDER_INTERVAL_INPUT);
        const ignoredReminderIntervalAmount = form.getValueAsNumber(IGNORED_REMINDER_PENALTY_INPUT, true) * Constants.MINUTES_TO_MS;
        const startDelta = form.activeAndFilled(START_OVERRIDE_INPUT) ? form.getValueAsNumber(START_OVERRIDE_INPUT) * Constants.MINUTES_TO_MS : reminderIntervalAmount;
        let reminder = new Reminder(reminderIntervalAmount, form.getValueAsNumber(START_OVERRIDE_INPUT) * Constants.MINUTES_TO_MS, ignoredReminderIntervalAmount, form.getValue(MESSAGE_INPUT), form.getValue(TITLE_INPUT), false);
        reminder.setNextReminderTimeout(startDelta);
        if (editIndex >= 0) {
            activeReminders[editIndex] = reminder;
            sessionStorage.setItem('edit-reminder-index', '-1');
        }
        else
            activeReminders.push(reminder);
        saveActiveReminders();
        ipcRenderer.send('open-page', 'index');
    });
    (_b = form.getInputElement(CANCEL_BUTTON)) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => {
        sessionStorage.setItem('edit-reminder-index', '-1');
        saveActiveReminders();
        ipcRenderer.send('open-page', 'index');
    });
}
window.onload = () => {
    let location = window.location.href.split("/");
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
