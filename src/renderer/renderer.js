"use strict";
var Constants;
(function (Constants) {
    Constants.MINUTES_TO_MS = 60000;
    Constants.MS_TO_MINUTES = 1 / Constants.MINUTES_TO_MS;
})(Constants || (Constants = {}));
Date.prototype.addMilliseconds = function (milliseconds) {
    const date = this;
    return new Date(date.getTime() + milliseconds);
};
HTMLFormElement.prototype.toJSON = function () {
    const formData = new FormData(this);
    const json = Object.fromEntries(formData.entries());
    for (let key in json) {
        const keyArr = key.split("-");
        const keyNew = (keyArr.slice(0, 1)
            .concat(keyArr.slice(1)
            .flatMap(s => s.substring(0, 1).toUpperCase().concat(s.substring(1))))).join("");
        if (keyNew === key)
            continue;
        json[keyNew] = json[key];
        delete json[key];
    }
    return JSON.stringify(json);
};
class InputForm {
    constructor(formClass, onSubmit) {
        this.inputs = new Map();
        this.buttons = new Map();
        this.textareas = new Map();
        this.element = document.getElementsByClassName(formClass)[0];
        this.element.addEventListener('submit', e => onSubmit(e));
        this.formState = 'default';
        Array.from(this.element.getElementsByTagName('input')).forEach(e => {
            const id = e.getAttribute('id');
            const type = e.getAttribute('type');
            if (id == null)
                return;
            switch (type) {
                case 'checkbox':
                    const toggles = e.getAttribute('toggles');
                    if (toggles == null)
                        break;
                    e.onchange = () => {
                        const input = this.inputs.get(toggles);
                        if (input == null)
                            return;
                        input.disabled = !e.checked;
                    };
                    break;
            }
            this.inputs.set(id, e);
        });
        Array.from(this.element.getElementsByTagName('button')).forEach(e => {
            const id = e.getAttribute('id');
            if (id == null)
                return;
            this.buttons.set(id, e);
        });
        Array.from(this.element.getElementsByTagName('textarea')).forEach(e => {
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
    setFromJson(json) {
        var _a;
        const camelCaseRegex = /.([a-z])+/g;
        // Set all the fields
        const obj = JSON.parse(json);
        for (let key in obj) {
            const id = ((_a = key.match(camelCaseRegex)) === null || _a === void 0 ? void 0 : _a.flatMap(s => s.toLowerCase()).join('-')) || '';
            const element = document.getElementById(id);
            if (element == null)
                continue;
            if (element) { }
            element.value = obj[key];
        }
        // Set the toggle checkboxes
        Array.from(this.inputs.values()).forEach(input => {
            const type = input.getAttribute('type');
            if (type !== 'checkbox')
                return;
            const toggles = input.getAttribute('toggles');
            if (toggles == null)
                return;
            this.setChecked(input.id, this.hasValue(toggles));
        });
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
    setNextReminderTimeout(delayAmountMinutes) {
        clearTimeout(this.reminderTimeout);
        const delayAmount = delayAmountMinutes * Constants.MINUTES_TO_MS;
        this.reminderTimeout = setTimeout(() => {
            this.sendBreakNotification(this.message);
            const nextReminderDelay = this.ignoredReminderIntervalAmount > 0 ?
                this.ignoredReminderIntervalAmount
                : this.reminderIntervalAmount;
            this.setNextReminderTimeout(nextReminderDelay);
        }, delayAmount);
        this.nextReminder = new Date().addMilliseconds(delayAmount);
        window.dispatchEvent(new Event('update-reminder-list'));
    }
    sendBreakNotification(message) {
        new Notification(this.title, { body: message }).onclick = () => {
            if (this === null)
                return;
            if (this.ignoredReminderIntervalAmount > 0)
                this.setNextReminderTimeout(this.reminderIntervalAmount);
            window.api.showWindow('main');
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
            nextReminder: this.nextReminder,
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
        const nextStart = Math.max(reminder.nextReminder.valueOf() - new Date().valueOf(), 0) * Constants.MS_TO_MINUTES;
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
        const DELETE_SVG_PATH = './images/delete.svg';
        const deleteImg = document.createElement('img');
        deleteImg.src = DELETE_SVG_PATH;
        deleteImg.alt = 'Delete reminder';
        let deleteButton = document.createElement('button');
        deleteButton.append(deleteImg);
        deleteButton.setAttribute("action", "destructive");
        deleteButton.title = 'Delete reminder';
        deleteButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder);
            activeReminders[index].cancel();
            if (index >= 0)
                activeReminders.splice(index, 1);
            saveActiveReminders();
            window.dispatchEvent(new Event('update-reminder-list'));
        });
        // Create the edit button
        const EDIT_SVG_PATH = './images/edit.svg';
        const editImg = document.createElement('img');
        editImg.src = EDIT_SVG_PATH;
        editImg.alt = 'Edit reminder';
        let editButton = document.createElement('button');
        editButton.append(editImg);
        editButton.title = 'Edit reminder';
        editButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder);
            if (index < 0) {
                console.error("Failed to edit reminder for it does not exist");
                sendPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder');
                return;
            }
            setEditReminder(index);
            saveActiveReminders();
            window.api.openPage('reminder');
        });
        const PLAY_SVG_PATH = './images/play.svg';
        const PAUSE_SVG_PATH = './images/pause.svg';
        const stateImage = document.createElement('img');
        stateImage.src = reminder.paused ? PLAY_SVG_PATH : PAUSE_SVG_PATH;
        stateImage.alt = reminder.paused ? 'Play reminder' : 'Pause Reminder';
        // Create the pause button
        let pauseButton = document.createElement('button');
        pauseButton.setAttribute('aria-label', reminder.paused ? 'Unpause' : 'Pause');
        pauseButton.append(stateImage);
        pauseButton.title = reminder.paused ? 'Unpause reminder' : 'Pause reminder';
        pauseButton.addEventListener('click', () => {
            if (pauseButton.getAttribute('aria-label') === 'Pause') {
                pauseButton.setAttribute('aria-label', 'Unpause');
                pauseButton.title = 'Pause reminder';
                reminder.setPaused(true);
                stateImage.src = PAUSE_SVG_PATH;
                stateImage.alt = 'Pause reminder';
            }
            else {
                pauseButton.setAttribute('aria-label', 'Pause');
                pauseButton.title = 'Unpause reminder';
                reminder.setPaused(false);
                stateImage.src = PLAY_SVG_PATH;
                stateImage.alt = 'Unpause reminder';
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
        window.api.openPage('reminder');
    });
    window.addEventListener('update-reminder-list', () => listActiveReminders());
    window.dispatchEvent(new Event('update-reminder-list'));
}
function loadReminderCreationPage() {
    var _a;
    const CREATE_BUTTON = 'create-reminder';
    const CANCEL_BUTTON = 'cancel';
    const form = new InputForm('reminder-form', (e) => {
        var _a;
        e.preventDefault();
        const reminderFormJson = JSON.parse(form.element.toJSON());
        const reminder = new Reminder(reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.reminderIntervalAmount, reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.reminderStartOverrideAmount, reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.ignoredReminderIntervalAmount, reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.message, reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.title);
        const startDelta = (_a = reminder === null || reminder === void 0 ? void 0 : reminder.reminderStartOverrideAmount) !== null && _a !== void 0 ? _a : reminder.reminderIntervalAmount;
        reminder.setNextReminderTimeout(startDelta);
        if (editIndex >= 0) {
            activeReminders[editIndex] = reminder;
            sessionStorage.setItem('edit-reminder-index', '-1');
        }
        else
            activeReminders.push(reminder);
        saveActiveReminders();
        window.api.openPage('index');
        return false;
    });
    // Update display if the user is editing
    const editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1');
    if (editIndex >= 0) {
        const editReminder = activeReminders[editIndex];
        form.setFromJson(JSON.stringify(editReminder));
        // form.setValue(MESSAGE_INPUT, editReminder.message)
        // form.setValue(TITLE_INPUT, editReminder.title)
        // form.setValue(REMINDER_INTERVAL_INPUT, editReminder.reminderIntervalAmount)
        // form.setChecked(START_OVERRIDE_CHECKBOX, editReminder.reminderStartOverrideAmount > 0)
        // form.setValue(START_OVERRIDE_INPUT, editReminder.reminderStartOverrideAmount)
        // form.setChecked(REMINDER_PENALTY_CHECKBOX, editReminder.ignoredReminderIntervalAmount > 0)
        // form.setValue(IGNORED_REMINDER_INTERVAL_INPUT, editReminder.ignoredReminderIntervalAmount)
        const createButton = form.getInputElement(CREATE_BUTTON);
        createButton.innerHTML = createButton.getAttribute('when-editing') || createButton.innerHTML;
    }
    // Events -------------------------------
    (_a = form.getInputElement(CANCEL_BUTTON)) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
        sessionStorage.setItem('edit-reminder-index', '-1');
        saveActiveReminders();
        window.api.openPage('index');
    });
}
function clearPreloads() {
    const preloads = document.getElementsByClassName('preload');
    Array.from(preloads).forEach(e => e.classList.toggle('preload'));
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
    setTimeout(clearPreloads, 1);
};
