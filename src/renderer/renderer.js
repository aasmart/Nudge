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
    const formJson = Object.fromEntries(formData.entries());
    for (let key in formJson) {
        const keyArr = key.split("-");
        const keyNew = (keyArr.slice(0, 1)
            .concat(keyArr.slice(1)
            .flatMap(s => s.substring(0, 1).toUpperCase().concat(s.substring(1))))).join("");
        if (keyNew === key)
            continue;
        // Replace old keys with the new keys
        if (formJson[key].toString().length > 0)
            formJson[keyNew] = formJson[key];
        delete formJson[key];
    }
    return JSON.stringify(formJson);
};
HTMLElement.prototype.setDirty = function (isDirty) {
    if (isDirty)
        this.setAttribute('dirty', '');
    else
        this.removeAttribute('dirty');
};
HTMLElement.prototype.isDirty = function () {
    return this.getAttribute('dirty') != null;
};
class InputForm {
    constructor(formClass, onSubmit, onReset) {
        this.inputs = new Map();
        this.formElement = document.getElementsByClassName(formClass)[0];
        this.formElement.addEventListener('submit', e => onSubmit(e));
        this.formElement.addEventListener('reset', e => onReset(e));
        const inputElements = Array.from(this.formElement.querySelectorAll('input,button,textarea'));
        inputElements.forEach(e => {
            const id = e.getAttribute('id');
            const type = e.getAttribute('type');
            if (id == null)
                return;
            // Handle the error message
            if ((e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement)) {
                const errorMessage = document.createElement('p');
                errorMessage.classList.add('error-message');
                const updateValidationMessage = () => { errorMessage.innerHTML = e.validationMessage; };
                e.insertAdjacentElement("afterend", errorMessage);
                e.onkeyup = updateValidationMessage;
                e.onmousedown = updateValidationMessage;
                updateValidationMessage();
                e.oninvalid = () => {
                    e.setDirty(true);
                    updateValidationMessage();
                };
            }
            // Add unit selection dropdowns
            const useUnits = e.getAttribute('use-units');
            if (useUnits) {
                switch (useUnits) {
                    case 'time':
                        const units = document.createElement('span');
                        units.id = `${id}-units`;
                        units.classList.add('units');
                        e.insertAdjacentElement("afterend", units);
                        units.innerHTML = 'minutes';
                        break;
                }
            }
            switch (type) {
                case 'checkbox':
                    const toggles = e.getAttribute('toggles');
                    if (toggles == null || !(e instanceof HTMLInputElement))
                        break;
                    e.onchange = () => {
                        const input = this.inputs.get(toggles);
                        if (input == null)
                            return;
                        input.disabled = !e.checked;
                    };
                    break;
                default:
                    break;
            }
            e.onkeydown = () => e.setDirty(true);
            e.onmousedown = () => e.setDirty(true);
            this.inputs.set(id, e);
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
        if (checkActive && !this.activeAndFilled(input))
            return '';
        const element = this.getInputElement(input);
        if (!element || !(element instanceof HTMLInputElement))
            return '';
        return element.valueAsNumber;
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
        if (!element || !(element instanceof HTMLInputElement) || element.getAttribute('type') !== 'checkbox')
            return;
        element.checked = checked;
        element.dispatchEvent(new Event('change'));
    }
    getInputElement(input) {
        return this.inputs.get(input) || undefined;
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
class ReminderImpl {
    constructor(reminder) {
        this.nextReminder = reminder.nextReminder || new Date();
        this.reminderIntervalAmount = reminder.reminderIntervalAmount;
        this.reminderStartOverrideAmount = reminder.reminderStartOverrideAmount;
        this.ignoredReminderIntervalAmount = reminder.ignoredReminderIntervalAmount;
        this.maxIgnoredReminders = reminder.maxIgnoredReminders;
        this.ignoredReminders = reminder.ignoredReminders || 0;
        this.isIgnored = reminder.isIgnored || false;
        this.message = reminder.message;
        this.title = reminder.title;
        this.paused = reminder.paused || false;
        this.pausedTime = (reminder === null || reminder === void 0 ? void 0 : reminder.pausedTime) || new Date();
    }
    setNextReminderTimeout(delayAmountMinutes) {
        clearTimeout(this.reminderTimeout);
        const delayAmount = delayAmountMinutes * Constants.MINUTES_TO_MS;
        this.reminderTimeout = setTimeout(() => {
            this.sendBreakNotification(this.message);
            // Handles the ignored reminders
            if (this.maxIgnoredReminders && this.ignoredReminders >= this.maxIgnoredReminders) {
                this.isIgnored = false;
                this.ignoredReminders = 0;
            }
            else if (this.ignoredReminderIntervalAmount > 0) {
                this.isIgnored = true;
                this.ignoredReminders += 1;
            }
            const nextReminderDelay = this.isIgnored ?
                this.ignoredReminderIntervalAmount
                : this.reminderIntervalAmount;
            this.setNextReminderTimeout(nextReminderDelay);
        }, delayAmount);
        this.nextReminder = new Date().addMilliseconds(delayAmount);
        saveActiveReminders();
        window.dispatchEvent(new Event('update-reminder-list'));
    }
    sendBreakNotification(message) {
        new Notification(this.title, { body: message }).onclick = () => {
            if (this === null)
                return;
            if (this.isIgnored)
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
        saveActiveReminders();
    }
    setPaused(paused) {
        if (paused) {
            this.cancel();
            this.pausedTime = new Date();
        }
        else if (this.paused && !paused) {
            const nextPlay = (new Date(this.nextReminder).valueOf() - new Date(this.pausedTime).valueOf()) * Constants.MS_TO_MINUTES;
            this.setNextReminderTimeout(nextPlay);
        }
        this.paused = paused;
        saveActiveReminders();
        window.dispatchEvent(new Event('update-reminder-list'));
    }
    toJSON() {
        return {
            nextReminder: this.nextReminder,
            reminderIntervalAmount: this.reminderIntervalAmount,
            reminderStartOverrideAmount: this.reminderStartOverrideAmount,
            ignoredReminderIntervalAmount: this.ignoredReminderIntervalAmount,
            maxIgnoredReminders: this.maxIgnoredReminders,
            ignoredReminders: this.ignoredReminders,
            isIgnored: this.isIgnored,
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
        const reminder = new ReminderImpl(obj);
        return reminder;
    });
    const editReminder = getEditReminder();
    activeReminders.forEach(reminder => {
        if ((editReminder !== null && reminder === editReminder) || reminder.paused)
            return;
        const nextStart = Math.max(new Date(reminder.nextReminder).valueOf() - new Date().valueOf(), 0) * Constants.MS_TO_MINUTES;
        reminder.setNextReminderTimeout(nextStart);
    });
    saveActiveReminders();
}
function setEditReminder(index) {
    sessionStorage.setItem('edit-reminder-index', index.toString());
}
function getEditIndex() {
    return parseInt(sessionStorage.getItem('edit-reminder-index') || '-1');
}
function getEditReminder() {
    const editIndex = getEditIndex();
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
    const CREATE_BUTTON = 'create-reminder';
    const form = new InputForm('reminder-form', (e) => {
        var _a;
        e.preventDefault();
        const reminderFormJson = JSON.parse(form.formElement.toJSON());
        const reminder = new ReminderImpl({
            reminderIntervalAmount: reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.reminderIntervalAmount,
            reminderStartOverrideAmount: reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.reminderStartOverrideAmount,
            ignoredReminderIntervalAmount: reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.ignoredReminderIntervalAmount,
            maxIgnoredReminders: reminderFormJson.maxIgnoredReminders,
            message: reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.message,
            title: reminderFormJson === null || reminderFormJson === void 0 ? void 0 : reminderFormJson.title
        });
        const startDelta = (_a = reminder === null || reminder === void 0 ? void 0 : reminder.reminderStartOverrideAmount) !== null && _a !== void 0 ? _a : reminder.reminderIntervalAmount;
        reminder.setNextReminderTimeout(startDelta);
        if (editIndex >= 0) {
            activeReminders[editIndex] = reminder;
            setEditReminder(-1);
        }
        else
            activeReminders.push(reminder);
        saveActiveReminders();
        window.api.openPage('index');
        return false;
    }, (e) => {
        e.preventDefault();
        setEditReminder(-1);
        saveActiveReminders();
        window.api.openPage('index');
        return false;
    });
    // Update display if the user is editing
    const editIndex = getEditIndex();
    if (editIndex >= 0) {
        const editReminder = activeReminders[editIndex];
        form.setFromJson(JSON.stringify(editReminder));
        const createButton = form.getInputElement(CREATE_BUTTON);
        if (!createButton)
            return;
        createButton.innerHTML = createButton.getAttribute('when-editing') || createButton.innerHTML;
    }
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
