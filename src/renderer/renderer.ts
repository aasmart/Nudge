let { ipcRenderer } = require('electron')

namespace Constants {
    export const MINUTES_TO_MS = 60000
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
    ignoredReminderIntervalAmount: number
    message: string

    constructor(reminderIntervalAmount: number, ignoredReminderIntervalAmount: number, message: string) {
        this.reminderIntervalAmount = reminderIntervalAmount;
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
        const reminder = new Reminder(obj.reminderIntervalAmount, obj.ignoredReminderIntervalAmount, obj.message)
        reminder.nextReminder = new Date(obj.nextReminder.valueOf())
        return reminder;
    })

    activeReminders.forEach(reminder => {
        reminder.setNextReminderTimeout(reminder.nextReminder.valueOf() - new Date().valueOf())
    })
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
        text.innerHTML = "This reminder will be at "

        let textSpan = document.createElement('span')
        textSpan.innerHTML = reminder.nextReminder.toLocaleString()
        textSpan.classList.add("next-timer-play")

        text.append(textSpan)

        // Create the stop button
        let stopButton = document.createElement('button')
        stopButton.innerHTML = "Cancel Reminder"

        stopButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder)
            activeReminders[index].cancel()
            if(index >= 0)
                activeReminders.splice(index, 1)
            window.dispatchEvent(new Event('update-reminder-list'))
        })

        // Finish building the ui element
        reminderDiv.append(text)
        reminderDiv.append(stopButton)

        reminders.push(reminderDiv)
    })

    reminderList.replaceChildren(...reminders)
}

function loadCreateRemindersPage() {
    const createNewReminder = document.getElementById("create-new-reminder") as HTMLButtonElement

    createNewReminder.addEventListener('click', () => {
        saveActiveReminders()
        ipcRenderer.send('open-page', 'new_reminder')
    })

    window.addEventListener('update-reminder-list', () => listActiveReminders())

    window.dispatchEvent(new Event('update-reminder-list'))
}

function loadReminderCreationPage() {
    //#region interactive fields
    const startButton = document.getElementsByClassName("start-timer")[0] as HTMLButtonElement
    const messageField = document.getElementById("reminder-message") as HTMLTextAreaElement
    const intervalInput = document.getElementById("reminder-interval") as HTMLInputElement
    const isOverrideEnabled = document.getElementById("enable-reminder-start-override") as HTMLInputElement
    const startOverrideInput = document.getElementById("reminder-start-override") as HTMLInputElement
    const reminderPenaltyCheckbox = document.getElementById("enable-ignore-reminder-penalty") as HTMLInputElement
    const ignoredReminderPenalty = document.getElementById("reminder-ignore") as HTMLInputElement
    //#endregion interactive fields

    // Set default values
    intervalInput.value = "30"
    messageField.value = "Time for a break!"

    // Events -------------------------------
    startButton.addEventListener('click', () => {
        const reminderIntervalAmount = Constants.MINUTES_TO_MS * intervalInput.valueAsNumber;
        const ignoredReminderIntervalAmount = (reminderPenaltyCheckbox.checked && hasInput(ignoredReminderPenalty)) ? (ignoredReminderPenalty.valueAsNumber * Constants.MINUTES_TO_MS) : 0;

        const startDelta = (isOverrideEnabled.checked && hasInput(startOverrideInput)) ? (startOverrideInput.valueAsNumber * Constants.MINUTES_TO_MS) : reminderIntervalAmount;

        let reminder = new Reminder(reminderIntervalAmount, ignoredReminderIntervalAmount, messageField.value)
        reminder.setNextReminderTimeout(startDelta)

        activeReminders.push(reminder)

        saveActiveReminders()

        startButton.blur()
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
        case 'new_reminder.html':
            loadReminderCreationPage()
            break;
    }
}