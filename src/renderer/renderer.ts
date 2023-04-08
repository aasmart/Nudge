let { ipcRenderer } = require('electron')

namespace Constants {
    export const MINUTES_TO_MS = 60000
    export const MS_TO_MINUTES = 1 / MINUTES_TO_MS
}

interface Date {
    addMilliseconds(milliseconds: number): Date
}

Date.prototype.addMilliseconds = function(milliseconds: number): Date {
    const date = this;
    return new Date(date.getTime() + milliseconds)
}

class Reminder {
    reminderTimeout!: ReturnType<typeof setInterval>
    nextReminder!: Date
    reminderIntervalAmount: number
    reminderStartOverrideAmount: number
    ignoredReminderIntervalAmount: number
    message: string

    constructor(
        reminderIntervalAmount: number, 
        reminderStartOverrideAmoun: number, 
        ignoredReminderIntervalAmount: number, 
        message: string) 
    {
        this.reminderIntervalAmount = reminderIntervalAmount;
        this.reminderStartOverrideAmount = reminderStartOverrideAmoun
        this.ignoredReminderIntervalAmount = ignoredReminderIntervalAmount;
        this.message = message;
    }

    setNextReminderTimeout(delayAmount: number) {
        clearTimeout(this.reminderTimeout)
    
        this.reminderTimeout = setTimeout(() => {
            this.sendBreakNotification(this.message)
            this.setNextReminderTimeout(this.ignoredReminderIntervalAmount > 0 ? this.ignoredReminderIntervalAmount : this.reminderIntervalAmount)
        }, delayAmount)
    
        this.nextReminder = new Date().addMilliseconds(delayAmount);
        window.dispatchEvent(new Event('update-reminder-list'))
    }

    private sendBreakNotification(message: string) {
        new Notification("Time For a Break!", { body: message }).onclick =() => { 
            if(this.ignoredReminderIntervalAmount > 0)
                this.setNextReminderTimeout(this.reminderIntervalAmount)
            ipcRenderer.send('show-window', 'main')
        };
    }

    start() {
        this.setNextReminderTimeout(this.reminderIntervalAmount)
    }

    cancel() {
        if(this.reminderTimeout != null)
            clearTimeout(this.reminderTimeout)
    }

    toJSON() {
        return {
            nextReminder: this.nextReminder.valueOf(),
            reminderIntervalAmount: this.reminderIntervalAmount,
            reminderStartOverrideAmount: this.reminderStartOverrideAmount,
            ignoredReminderIntervalAmount: this.ignoredReminderIntervalAmount,
            message: this.message
        }
    }
}

function hasInput(inputElement: HTMLInputElement): boolean {
    return inputElement.value.length > 0; 
}

let activeReminders: Array<Reminder> = []

function saveActiveReminders() {
    sessionStorage.setItem("active_reminders", JSON.stringify(activeReminders))
}

function loadActiveReminders() {
    let remindersObjs: Array<Reminder> = JSON.parse(sessionStorage.getItem("active_reminders")!) ?? []

    activeReminders = remindersObjs.map(obj => {
        const reminder = new Reminder(
            obj.reminderIntervalAmount, 
            obj.reminderStartOverrideAmount, 
            obj.ignoredReminderIntervalAmount, 
            obj.message
        )
        reminder.nextReminder = new Date(obj.nextReminder.valueOf())
        return reminder;
    })

    const editReminder = getEditReminder()

    activeReminders.forEach(reminder => {
        if(editReminder !== null && reminder === editReminder)
            return;
        const nextStart = Math.max(reminder.nextReminder.valueOf() - new Date().valueOf(), 0)
        reminder.setNextReminderTimeout(nextStart)
    })
}

function setEditReminder(index: number) {
    sessionStorage.setItem('edit-reminder-index', index.toString())
}

function getEditReminder(): Reminder {
    const editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1')
    return activeReminders[editIndex] || null
}

function listActiveReminders() {
    const reminderList = document.getElementById("reminder-list") as HTMLElement
    
    let reminders: Array<Node> = [reminderList.children[0]]

    activeReminders.forEach(reminder => {
        // Create the base div
        let reminderDiv = document.createElement("div")
        reminderDiv.classList.add('reminder')

        // Create the display text
        let text = document.createElement('p')
        text.innerHTML = "Next Reminder: "

        let textSpan = document.createElement('span')
        textSpan.innerHTML = reminder.nextReminder.toLocaleString()
        textSpan.classList.add("next-timer-play")

        text.append(textSpan)

        // Create the delete button
        let deleteButton = document.createElement('button')
        deleteButton.innerHTML = "Delete"

        deleteButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder)
            activeReminders[index].cancel()
            if(index >= 0)
                activeReminders.splice(index, 1)
            window.dispatchEvent(new Event('update-reminder-list'))
        })

        // Create the edit button
        let editButton = document.createElement('button')
        editButton.innerHTML = "Edit"

        editButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder)
            if(index < 0) {
                console.error("Failed to edit reminder for it does not exist")
                alert("An error was encountered while attempting to edit this reminder")
                return;
            }

            setEditReminder(index)
            saveActiveReminders()
            ipcRenderer.send('open-page', 'reminder')
        })

        // Finish building the ui element
        reminderDiv.append(text)
        reminderDiv.append(editButton)
        reminderDiv.append(deleteButton)

        reminders.push(reminderDiv)
    })

    reminderList.replaceChildren(...reminders)
}

function loadCreateRemindersPage() {
    const createNewReminder = document.getElementById("create-new-reminder") as HTMLButtonElement

    createNewReminder.addEventListener('click', () => {
        saveActiveReminders()
        ipcRenderer.send('open-page', 'reminder')
    })

    window.addEventListener('update-reminder-list', () => listActiveReminders())

    window.dispatchEvent(new Event('update-reminder-list'))
}

function loadReminderCreationPage() {
    //#region interactive fields
    const createButton = document.getElementsByClassName("start-timer")[0] as HTMLButtonElement
    const cancelButton = document.getElementsByClassName("cancel-reminder")[0] as HTMLButtonElement
    const messageField = document.getElementById("reminder-message") as HTMLTextAreaElement
    const intervalInput = document.getElementById("reminder-interval") as HTMLInputElement
    const isOverrideEnabled = document.getElementById("enable-reminder-start-override") as HTMLInputElement
    const startOverrideInput = document.getElementById("reminder-start-override") as HTMLInputElement
    const reminderPenaltyCheckbox = document.getElementById("enable-ignore-reminder-penalty") as HTMLInputElement
    const ignoredReminderPenalty = document.getElementById("reminder-ignore") as HTMLInputElement
    //#endregion interactive fields

    // Update display if the user is editing
    const editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1')
    if(editIndex >= 0) {
        const editReminder = activeReminders[editIndex]

        messageField.value = editReminder.message;
        intervalInput.value = (editReminder.reminderIntervalAmount * Constants.MS_TO_MINUTES).toString();
        isOverrideEnabled.checked = editReminder.reminderStartOverrideAmount > 0;
        startOverrideInput.value = (editReminder.reminderStartOverrideAmount * Constants.MS_TO_MINUTES).toString()
        reminderPenaltyCheckbox.checked = editReminder.ignoredReminderIntervalAmount > 0;
        ignoredReminderPenalty.value = (editReminder.ignoredReminderIntervalAmount * Constants.MS_TO_MINUTES).toString()
        createButton.innerHTML = createButton.getAttribute('when-editing') || createButton.innerHTML
    }

    // Events -------------------------------
    createButton.addEventListener('click', () => {
        if(!intervalInput.checkValidity() || !startOverrideInput.checkValidity() || !ignoredReminderPenalty.checkValidity()) {
            createButton.blur()
            alert("Cannot create reminder as one or more inputs are invalid (indicated by red outline).")
            return;
        }

        const reminderIntervalAmount = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        const ignoredReminderIntervalAmount = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;

        const startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : reminderIntervalAmount;

        let reminder = new Reminder(
            reminderIntervalAmount, 
            startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS, 
            ignoredReminderIntervalAmount, 
            messageField.value
        )
        reminder.setNextReminderTimeout(startDelta)

        if(editIndex >= 0) {
            activeReminders[editIndex] = reminder;
            sessionStorage.setItem('edit-reminder-index', '-1')
        } else
            activeReminders.push(reminder)

        saveActiveReminders()

        createButton.blur()
        ipcRenderer.send('open-page', 'index');
    })

    cancelButton.addEventListener('click', () => {
        sessionStorage.setItem('edit-reminder-index', '-1')
        saveActiveReminders()
        createButton.blur()
        ipcRenderer.send('open-page', 'index');
    })
}

window.onload = () => {
    let location = window.location.href.split("/");

    loadActiveReminders()

    switch(location[location.length - 1]) {
        case 'index.html':
            loadCreateRemindersPage()
            break;
        case 'reminder.html':
            loadReminderCreationPage()
            break;
    }
}