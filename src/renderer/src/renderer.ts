import deleteSvg from "../assets/delete.svg"
import editSvg from "../assets/edit.svg"
import pauseSvg from "../assets/pause.svg"
import playSvg from "../assets/play.svg"
import notificationSvg from "../assets/notification_important.svg"
import { Reminders } from "../../common/reminder"
import { Preloads } from "../../common/preloads"
import { showPopup } from "../../common/popup"

function listReminders() {
    const reminderList = (document.getElementById("reminder-list") as HTMLElement).children[1] as HTMLElement
    
    let reminders: Array<Node> = []

    Reminders.activeReminders.forEach(reminder => {
        // Create the base div
        let reminderListElement = document.createElement("li")
        reminderListElement.classList.add('reminder')
        if(reminder.isIgnored)
            reminderListElement.classList.add("ignored")

        // Create the display text
        let text = document.createElement('p')
        text.innerText = "Next Reminder: "

        let textSpan = document.createElement('span')
        if(reminder.paused)
            textSpan.innerText = "this reminder is paused"
        else
            textSpan.innerText = reminder.nextReminder.toLocaleString()
        textSpan.classList.add("next-timer-play")

        text.append(textSpan)

        // Create the delete button
        const deleteImg = document.createElement('img')
        deleteImg.src = deleteSvg
        deleteImg.alt = 'Delete reminder'

        let deleteButton = document.createElement('button')
        deleteButton.append(deleteImg)
        deleteButton.setAttribute("action", "destructive")
        deleteButton.title = 'Delete reminder'

        deleteButton.addEventListener('click', () => {
            const index = Reminders.activeReminders.indexOf(reminder)
            Reminders.activeReminders[index].cancel()
            if(index >= 0)
                Reminders.activeReminders.splice(index, 1)
            Reminders.saveActiveReminders()
            window.dispatchEvent(new Event('update-reminder-list'))
        })

        // Create the edit button
        const editImg = document.createElement('img')
        editImg.src = editSvg
        editImg.alt = 'Edit reminder'

        let editButton = document.createElement('button')
        editButton.append(editImg)
        editButton.title = 'Edit reminder'

        editButton.addEventListener('click', () => {
            const index = Reminders.activeReminders.indexOf(reminder)
            if(index < 0) {
                console.error("Failed to edit reminder for it does not exist")
                showPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder')
                return;
            }

            Reminders.setEditReminder(index)
            Reminders.saveActiveReminders()
            window.api.openPage('reminder')
        })

        const stateImage = document.createElement('img')
        stateImage.src = reminder.paused ? playSvg : pauseSvg
        stateImage.alt = reminder.paused ? 'Play reminder' : 'Pause Reminder'

        // Create the pause button
        let pauseButton = document.createElement('button')
        pauseButton.setAttribute('aria-label', reminder.paused ? 'Unpause' : 'Pause')
        pauseButton.append(stateImage)
        pauseButton.title = reminder.paused ? 'Unpause reminder' : 'Pause reminder'
        pauseButton.disabled = reminder.isIgnored

        pauseButton.addEventListener('click', () => {
            if(pauseButton.getAttribute('aria-label') === 'Pause') {
                pauseButton.setAttribute('aria-label', 'Unpause')
                pauseButton.title = 'Pause reminder'
                reminder.setPaused(true)
                stateImage.src = pauseSvg
                stateImage.alt = 'Pause reminder'
            } else {
                pauseButton.setAttribute('aria-label', 'Pause')
                pauseButton.title = 'Unpause reminder'
                reminder.setPaused(false)
                stateImage.src = playSvg
                stateImage.alt = 'Unpause reminder'
            }
        })

        // Create the acknowledge reminder button
        const notifImg = document.createElement('img')
        notifImg.src = notificationSvg
        notifImg.alt = 'Acknowledge ignored reminder'

        let acknowledgeButton = document.createElement('button')
        acknowledgeButton.append(notifImg)
        acknowledgeButton.title = "Acknowledge ignored reminder"
        acknowledgeButton.classList.add("acknowledge");
        acknowledgeButton.disabled = !reminder.isIgnored

        acknowledgeButton.addEventListener('click', () => {
            reminder.acknowledgeIgnored()
        })

        // Finish building the ui element
        reminderListElement.append(text)
        reminderListElement.append(acknowledgeButton)
        reminderListElement.append(pauseButton)
        reminderListElement.append(editButton)
        reminderListElement.append(deleteButton)

        reminders.push(reminderListElement)
    })

    reminderList.replaceChildren(...reminders)
}

function loadReminderListPage() {
    const createNewReminder = document.getElementById("create-new-reminder") as HTMLButtonElement

    createNewReminder.addEventListener('click', () => {
        Reminders.saveActiveReminders()
        window.api.openPage('reminder')
    })

    window.addEventListener('update-reminder-list', () => listReminders())

    window.dispatchEvent(new Event('update-reminder-list'))
}

window.onload = () => {
    Reminders.loadActiveReminders()
    loadReminderListPage()
    setTimeout(Preloads.clearPreloads, 1)
}