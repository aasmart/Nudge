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

class InputForm {
    container: HTMLElement
    inputs: Map<String, HTMLInputElement>
    buttons: Map<String, HTMLElement>
    textareas: Map<String, HTMLElement>

    constructor(formClass: string) {
        this.inputs = new Map()
        this.buttons = new Map()
        this.textareas = new Map()
        this.container = document.getElementsByClassName(formClass)[0] as HTMLElement

        Array.from(this.container.getElementsByTagName('input')).forEach(e => {
            const id = e.getAttribute('id');
            const type = e.getAttribute('type')

            if(id == null)
                return

            switch(type) {
                case 'checkbox':
                    const toggles = e.getAttribute('toggles')
                    if(toggles == null)
                        break

                    e.onchange = () => { 
                        const input = this.inputs.get(toggles)
                        if(input == null)
                            return;
                        
                        input.disabled = !e.checked
                    }

                    break
            }

            this.inputs.set(id, e)
        })

        Array.from(this.container.getElementsByTagName('button')).forEach(e => {
            const id = e.getAttribute('id');

            if(id == null)
                return;

            this.buttons.set(id, e)
        })

        Array.from(this.container.getElementsByTagName('textarea')).forEach(e => {
            const id = e.getAttribute('id');

            if(id == null)
                return;

            this.textareas.set(id, e)
        })
    }

    setValue(input: string, value: any) {
        const element: any = this.getInputElement(input)

        if(element == null)
            return

        if(!element.disabled)
            element.value = value.toString();
        else
            element.value = ''
    }

    getValue(input: string, checkActive: boolean = false) {
        if(checkActive && !this.activeAndFilled(input))
            return ''

        return this.getInputElement(input)?.value || ''
    }

    getValueAsNumber(input: string, checkActive: boolean = false) {
        if(checkActive && !this.activeAndFilled(input))
            return ''

        return this.getInputElement(input)?.valueAsNumber || ''
    }

    hasRequiredFields(): boolean {
        return Array.from(this.inputs.values()).filter(e => !e.checkValidity()).length <= 0
    }

    hasValue(input: string) {
        return (this.inputs.get(input)?.value?.length || 0) > 0
    }

    activeAndFilled(input: string): boolean {
        const inputElement = this.getInputElement(input)
        if(inputElement == null)
            return false;

        return !inputElement.disabled && inputElement.value.length > 0
    }

    setChecked(input: String, checked: boolean) {
        const element = this.inputs.get(input)
        if(element == null || element.getAttribute('type') !== 'checkbox')
            return
        
        element.checked = checked
        element.dispatchEvent(new Event('change'))
    }

    getInputElement(input: String): any {
        return this.inputs.get(input) 
            || this.textareas.get(input) 
            || this.buttons.get(input) 
            || null
    }
}

class Reminder {
    reminderTimeout!: ReturnType<typeof setInterval>
    nextReminder!: Date
    reminderIntervalAmount: number
    reminderStartOverrideAmount: number
    ignoredReminderIntervalAmount: number
    message: string
    title: string
    paused: boolean
    pausedTime: Date

    constructor(
        reminderIntervalAmount: number, 
        reminderStartOverrideAmount: number, 
        ignoredReminderIntervalAmount: number, 
        message: string,
        title: string,
        isPaused = false,
        pausedTime = new Date(),
    ) {
        this.reminderIntervalAmount = reminderIntervalAmount;
        this.reminderStartOverrideAmount = reminderStartOverrideAmount
        this.ignoredReminderIntervalAmount = ignoredReminderIntervalAmount;
        this.message = message;
        this.title = title;

        this.paused = isPaused;
        this.pausedTime = pausedTime;
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
        new Notification(this.title, { body: message }).onclick =() => { 
            if(this === null)
                return

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

    setPaused(paused: boolean) {
        if(paused) {
            this.cancel()
            this.pausedTime = new Date()
        } else if(this.paused && !paused) {
            const nextPlay = this.nextReminder.valueOf() - this.pausedTime.valueOf();
            this.setNextReminderTimeout(nextPlay)
        }

        this.paused = paused;
        window.dispatchEvent(new Event('update-reminder-list'))
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
        }
    }
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
            obj.message,
            obj.title,
            obj.paused,
            obj.pausedTime
        )
        reminder.nextReminder = new Date(obj.nextReminder.valueOf())
        return reminder;
    })

    const editReminder = getEditReminder()

    activeReminders.forEach(reminder => {
        if(editReminder !== null && reminder === editReminder || reminder.paused)
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
    const reminderList = (document.getElementById("reminder-list") as HTMLElement).children[1] as HTMLElement
    
    let reminders: Array<Node> = []

    activeReminders.forEach(reminder => {
        // Create the base div
        let reminderListElement = document.createElement("li")
        reminderListElement.classList.add('reminder')

        // Create the display text
        let text = document.createElement('p')
        text.innerHTML = "Next Reminder: "

        let textSpan = document.createElement('span')
        if(reminder.paused)
            textSpan.innerHTML = "this reminder is paused"
        else
            textSpan.innerHTML = reminder.nextReminder.toLocaleString()
        textSpan.classList.add("next-timer-play")

        text.append(textSpan)

        // Create the delete button
        let deleteButton = document.createElement('button')
        deleteButton.innerHTML = "Delete"
        deleteButton.setAttribute("action", "destructive")

        deleteButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder)
            activeReminders[index].cancel()
            if(index >= 0)
                activeReminders.splice(index, 1)
            saveActiveReminders()
            window.dispatchEvent(new Event('update-reminder-list'))
        })

        // Create the edit button
        let editButton = document.createElement('button')
        editButton.innerHTML = "Edit"

        editButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder)
            if(index < 0) {
                console.error("Failed to edit reminder for it does not exist")
                sendPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder')
                return;
            }

            setEditReminder(index)
            saveActiveReminders()
            ipcRenderer.send('open-page', 'reminder')
        })

        // Create the pause button
        let pauseButton = document.createElement('button')
        pauseButton.setAttribute('aria-label', reminder.paused ? 'Unpause' : 'Pause')
        pauseButton.innerHTML = reminder.paused ? 'Unpause' : 'Pause'

        pauseButton.addEventListener('click', () => {
            if(pauseButton.getAttribute('aria-label') === 'Pause') {
                pauseButton.setAttribute('aria-label', 'Unpause')
                reminder.setPaused(true)
                pauseButton.innerHTML = 'Unpause'
            } else {
                pauseButton.setAttribute('aria-label', 'Pause')
                reminder.setPaused(false)
                pauseButton.innerHTML = 'Pause'
            }
        })

        // Finish building the ui element
        reminderListElement.append(text)
        reminderListElement.append(pauseButton)
        reminderListElement.append(editButton)
        reminderListElement.append(deleteButton)

        reminders.push(reminderListElement)
    })

    reminderList.replaceChildren(...reminders)
}

function sendPopup(title: string, content: string) {
    const popupContainer = document.getElementsByClassName("popup-container")[0] as HTMLElement

    if(popupContainer === null) {
        console.error('Cannot create popup as the container does not exist')
        return;
    }

    const section = popupContainer.children[0] as HTMLElement
    const popupTitle = section.children[0] as HTMLElement
    const popupText = section.children[1] as HTMLElement
    const popupButton = section.children[2] as HTMLButtonElement

    popupTitle.innerHTML = title
    popupText.innerHTML = content

    function handleButton() {
        section.classList.remove('show-popup')
        section.classList.add('hide-popup')
        popupButton.style.visibility = 'hidden'
    }

    function hideContainer(e: AnimationEvent) {
        if(e.animationName === 'popup-out')
            popupContainer.style.visibility = 'hidden'    
    }

    popupButton.addEventListener('click', handleButton)
    popupContainer.addEventListener('animationend', hideContainer)

    // Show the popup
    popupContainer.style.visibility = 'visible'
    popupButton.style.visibility = 'visible'
    section.classList.remove('hide-popup')
    section.classList.add('show-popup')
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
    const form = new InputForm('reminder-form')

    const CREATE_BUTTON = 'create-reminder'
    const CANCEL_BUTTON = 'cancel'
    const MESSAGE_INPUT = 'reminder-message'
    const TITLE_INPUT = 'reminder-title'
    const REMINDER_INTERVAL_INPUT = 'reminder-interval'
    const START_OVERRIDE_CHECKBOX = 'toggle-reminder-start-override'
    const START_OVERRIDE_INPUT = 'reminder-start-override'
    const REMINDER_PENALTY_CHECKBOX = 'toggle-ignore-reminder-penalty'
    const IGNORED_REMINDER_INTERVAL_INPUT = 'ignored-reminder-interval'

    // Update display if the user is editing
    const editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1')
    if(editIndex >= 0) {
        const editReminder = activeReminders[editIndex]

        form.setValue(MESSAGE_INPUT, editReminder.message)
        form.setValue(TITLE_INPUT, editReminder.title)
        form.setValue(REMINDER_INTERVAL_INPUT, editReminder.reminderIntervalAmount * Constants.MS_TO_MINUTES)
        form.setChecked(START_OVERRIDE_CHECKBOX, editReminder.reminderStartOverrideAmount > 0)
        form.setValue(START_OVERRIDE_INPUT, editReminder.reminderStartOverrideAmount * Constants.MS_TO_MINUTES)
        form.setChecked(REMINDER_PENALTY_CHECKBOX, editReminder.ignoredReminderIntervalAmount > 0)
        form.setValue(IGNORED_REMINDER_INTERVAL_INPUT, editReminder.ignoredReminderIntervalAmount * Constants.MS_TO_MINUTES)

        const createButton = form.getInputElement(CREATE_BUTTON)
        createButton.innerHTML = createButton.getAttribute('when-editing') || createButton.innerHTML
    }

    // Events -------------------------------
    form.getInputElement(CREATE_BUTTON)?.addEventListener('click', () => {
        if(!form.hasRequiredFields()) {
            sendPopup('Cannot Create Reminder', 'One or more inputs are invalid')
            return;
        }

        const reminderIntervalAmount = Constants.MINUTES_TO_MS * form.getValueAsNumber(REMINDER_INTERVAL_INPUT);
        const ignoredReminderIntervalAmount = form.getValueAsNumber(IGNORED_REMINDER_INTERVAL_INPUT, true) * Constants.MINUTES_TO_MS;

        const startDelta = form.activeAndFilled(START_OVERRIDE_INPUT) ? form.getValueAsNumber(START_OVERRIDE_INPUT) * Constants.MINUTES_TO_MS : reminderIntervalAmount;

        let reminder = new Reminder(
            reminderIntervalAmount, 
            form.getValueAsNumber(START_OVERRIDE_INPUT) * Constants.MINUTES_TO_MS, 
            ignoredReminderIntervalAmount, 
            form.getValue(MESSAGE_INPUT),
            form.getValue(TITLE_INPUT),
            false
        )
        reminder.setNextReminderTimeout(startDelta)

        if(editIndex >= 0) {
            activeReminders[editIndex] = reminder;
            sessionStorage.setItem('edit-reminder-index', '-1')
        } else
            activeReminders.push(reminder)

        saveActiveReminders()

        ipcRenderer.send('open-page', 'index');
    })

    form.getInputElement(CANCEL_BUTTON)?.addEventListener('click', () => {
        sessionStorage.setItem('edit-reminder-index', '-1')
        saveActiveReminders()
        ipcRenderer.send('open-page', 'index');
    })
}

function clearPreloads() {
    const preloads = document.getElementsByClassName('preload')

    Array.from(preloads).forEach(e => e.classList.toggle('preload'))
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

    setTimeout(clearPreloads, 1)
}