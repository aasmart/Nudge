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

interface HTMLFormElement {
    toJSON(): string
}

HTMLFormElement.prototype.toJSON = function(): string {
    const formData = new FormData(this)
    const formJson = Object.fromEntries(formData.entries())

    for(let key in formJson) {
        const keyArr = key.split("-")
        const keyNew: string = (keyArr.slice(0,1)
            .concat(keyArr.slice(1)
            .flatMap(s => s.substring(0,1).toUpperCase().concat(s.substring(1))))
            ).join("")

        if(keyNew === key)
            continue;
        
        // Replace old keys with the new keys
        if(formJson[key].toString().length > 0)
            formJson[keyNew] = formJson[key]
        delete formJson[key]
    }

    return JSON.stringify(formJson)    
}

interface HTMLElement {
    setDirty(isDirty: boolean): void
    isDirty(): boolean
}

HTMLElement.prototype.setDirty = function(isDirty: boolean): void {
    if(isDirty)
        this.setAttribute('dirty', '')
    else
        this.removeAttribute('dirty')
}

HTMLElement.prototype.isDirty = function(): boolean {
    return this.getAttribute('dirty') != null
}

class InputForm {
    formElement: HTMLFormElement
    formState: string
    inputs: Map<String, HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>

    constructor(formClass: string, onSubmit: (e: Event) => boolean, onReset: (e: Event) => boolean) {
        this.inputs = new Map()
        this.formElement = <HTMLFormElement>document.getElementsByClassName(formClass)[0]

        this.formElement.addEventListener('submit', e => onSubmit(e))
        this.formElement.addEventListener('reset', e => onReset(e))
        this.formState = 'default'

        const inputElements: Array<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>
             = Array.from(this.formElement.querySelectorAll('input,button,textarea'))

        inputElements.forEach(e => {
            const id = e.getAttribute('id');
            const type = e.getAttribute('type')

            if(id == null)
                return

            // Handle the error message
            if((e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement)) {
                const errorMessage = document.createElement('p')
                errorMessage.classList.add('error-message')

                const updateValidationMessage = () => { errorMessage.innerHTML = e.validationMessage }

                e.insertAdjacentElement("afterend", errorMessage)

                e.onkeyup = updateValidationMessage
                e.onmousedown = updateValidationMessage
                updateValidationMessage()

                e.oninvalid = () => {
                    e.setDirty(true)
                    updateValidationMessage()
                }
            }

            // Add unit selection dropdowns
            const useUnits = e.getAttribute('use-units')
            if(useUnits) {
                switch(useUnits) {
                    case 'time':
                        const units = document.createElement('span')
                        units.id = `${id}-units`
                        units.classList.add('units')
                        e.insertAdjacentElement("afterend", units)

                        units.innerHTML = 'minutes'
                        break;
                }
                
            }

            switch(type) {
                case 'checkbox':
                    const toggles = e.getAttribute('toggles')
                    if(toggles == null || !(e instanceof HTMLInputElement))
                        break

                    e.onchange = () => { 
                        const input = this.inputs.get(toggles)
                        if(input == null)
                            return;
                        
                        input.disabled = !e.checked
                    }

                    break
                default:
                    break
            }

            e.onkeydown = () => e.setDirty(true)
            e.onmousedown = () => e.setDirty(true)

            this.inputs.set(id, e)
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

        const element = this.getInputElement(input)
        if(!element || !(element instanceof HTMLInputElement))
            return ''

        return element.valueAsNumber
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
        if(!element || !(element instanceof HTMLInputElement) || element.getAttribute('type') !== 'checkbox')
            return
        
        element.checked = checked
        element.dispatchEvent(new Event('change'))
    }

    getInputElement(input: String): HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | undefined  {
        return this.inputs.get(input) || undefined
    }

    setFromJson(json: string): void {
        const camelCaseRegex = /.([a-z])+/g
    
        // Set all the fields
        const obj = JSON.parse(json)
        for(let key in obj) {
            const id = key.match(camelCaseRegex)?.flatMap(s => s.toLowerCase()).join('-') || ''
            const element = <HTMLInputElement>document.getElementById(id)

            if(element == null)
                continue

            if(element as HTMLInputElement | HTMLTextAreaElement) {}
                element.value = obj[key]
        }

        // Set the toggle checkboxes
        Array.from(this.inputs.values()).forEach(input => {
            const type = input.getAttribute('type') 
            if(type !== 'checkbox')
                return
            
            const toggles = input.getAttribute('toggles')
            if(toggles == null)
                return

            this.setChecked(input.id, this.hasValue(toggles))
        })
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

    setNextReminderTimeout(delayAmountMinutes: number) {
        clearTimeout(this.reminderTimeout)

        const delayAmount = delayAmountMinutes * Constants.MINUTES_TO_MS
    
        this.reminderTimeout = setTimeout(() => {
            this.sendBreakNotification(this.message)

            const nextReminderDelay = this.ignoredReminderIntervalAmount > 0 ? 
                this.ignoredReminderIntervalAmount 
                : this.reminderIntervalAmount

            this.setNextReminderTimeout(nextReminderDelay)
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
            window.api.showWindow('main')
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
            const nextPlay = (this.nextReminder.valueOf() - this.pausedTime.valueOf()) * Constants.MS_TO_MINUTES;
            this.setNextReminderTimeout(nextPlay)
        }

        this.paused = paused;
        window.dispatchEvent(new Event('update-reminder-list'))
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
        const nextStart = Math.max(reminder.nextReminder.valueOf() - new Date().valueOf(), 0) * Constants.MS_TO_MINUTES
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
        const DELETE_SVG_PATH = './images/delete.svg'
        const deleteImg = document.createElement('img')
        deleteImg.src = DELETE_SVG_PATH
        deleteImg.alt = 'Delete reminder'

        let deleteButton = document.createElement('button')
        deleteButton.append(deleteImg)
        deleteButton.setAttribute("action", "destructive")
        deleteButton.title = 'Delete reminder'

        deleteButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder)
            activeReminders[index].cancel()
            if(index >= 0)
                activeReminders.splice(index, 1)
            saveActiveReminders()
            window.dispatchEvent(new Event('update-reminder-list'))
        })

        // Create the edit button
        const EDIT_SVG_PATH = './images/edit.svg'
        const editImg = document.createElement('img')
        editImg.src = EDIT_SVG_PATH
        editImg.alt = 'Edit reminder'

        let editButton = document.createElement('button')
        editButton.append(editImg)
        editButton.title = 'Edit reminder'

        editButton.addEventListener('click', () => {
            const index = activeReminders.indexOf(reminder)
            if(index < 0) {
                console.error("Failed to edit reminder for it does not exist")
                sendPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder')
                return;
            }

            setEditReminder(index)
            saveActiveReminders()
            window.api.openPage('reminder')
        })

        const PLAY_SVG_PATH = './images/play.svg'
        const PAUSE_SVG_PATH = './images/pause.svg'
        const stateImage = document.createElement('img')
        stateImage.src = reminder.paused ? PLAY_SVG_PATH : PAUSE_SVG_PATH
        stateImage.alt = reminder.paused ? 'Play reminder' : 'Pause Reminder'

        // Create the pause button
        let pauseButton = document.createElement('button')
        pauseButton.setAttribute('aria-label', reminder.paused ? 'Unpause' : 'Pause')
        pauseButton.append(stateImage)
        pauseButton.title = reminder.paused ? 'Unpause reminder' : 'Pause reminder'

        pauseButton.addEventListener('click', () => {
            if(pauseButton.getAttribute('aria-label') === 'Pause') {
                pauseButton.setAttribute('aria-label', 'Unpause')
                pauseButton.title = 'Pause reminder'
                reminder.setPaused(true)
                stateImage.src = PAUSE_SVG_PATH
                stateImage.alt = 'Pause reminder'
            } else {
                pauseButton.setAttribute('aria-label', 'Pause')
                pauseButton.title = 'Unpause reminder'
                reminder.setPaused(false)
                stateImage.src = PLAY_SVG_PATH
                stateImage.alt = 'Unpause reminder'
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
        window.api.openPage('reminder')
    })

    window.addEventListener('update-reminder-list', () => listActiveReminders())

    window.dispatchEvent(new Event('update-reminder-list'))
}

function loadReminderCreationPage() {
    const CREATE_BUTTON = 'create-reminder'

    const form = new InputForm('reminder-form', (e: Event): boolean => {
        e.preventDefault()

        const reminderFormJson: Reminder = JSON.parse(form.formElement.toJSON())
        const reminder = new Reminder(
            reminderFormJson?.reminderIntervalAmount,
            reminderFormJson?.reminderStartOverrideAmount,
            reminderFormJson?.ignoredReminderIntervalAmount,
            reminderFormJson?.message,
            reminderFormJson?.title
        )

        const startDelta = reminder?.reminderStartOverrideAmount ?? reminder.reminderIntervalAmount
        reminder.setNextReminderTimeout(startDelta)

        if(editIndex >= 0) {
            activeReminders[editIndex] = reminder;
            sessionStorage.setItem('edit-reminder-index', '-1')
        } else
            activeReminders.push(reminder)

        saveActiveReminders()

        window.api.openPage('index')

        return false;
    }, (e: Event) => {
        e.preventDefault()

        sessionStorage.setItem('edit-reminder-index', '-1')
        saveActiveReminders()
        window.api.openPage('index')

        return false;
    })

    // Update display if the user is editing
    const editIndex = parseInt(sessionStorage.getItem('edit-reminder-index') || '-1')
    if(editIndex >= 0) {
        const editReminder = activeReminders[editIndex]

        form.setFromJson(JSON.stringify(editReminder))

        const createButton = form.getInputElement(CREATE_BUTTON)
        if(!createButton)
            return

        createButton.innerHTML = createButton.getAttribute('when-editing') || createButton.innerHTML
    }
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