import deleteSvgPath from "../assets/delete.svg"
import editSvgPath from "../assets/edit.svg"
import pauseSvgPath from "../assets/pause.svg"
import playSvgPath from "../assets/play.svg"
import notificationSvgPath from "../assets/notification_important.svg"
import refreshSvgPath from "../assets/refresh.svg"
import { Reminders } from "../../common/reminder"
import { Preloads } from "../../common/preloads"
import { createPopupButton, showPopup } from "../../common/popup"
import { fetchSvgOrAsImage } from "../../common/svgUtils"

let deleteSvg: SVGElement | HTMLImageElement;
let editSvg: SVGElement | HTMLImageElement;
let pauseSvg: SVGElement | HTMLImageElement;
let playSvg: SVGElement | HTMLImageElement;
let notifcationSvg: SVGElement | HTMLImageElement;
let refreshSvg: SVGElement | HTMLImageElement;

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
        const deleteImg = deleteSvg.cloneNode(true);

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
        const editImg = editSvg.cloneNode(true);

        let editButton = document.createElement('button')
        editButton.append(editImg)
        editButton.classList.add("primary");
        editButton.title = 'Edit reminder'

        editButton.addEventListener('click', () => {
            const index = Reminders.activeReminders.indexOf(reminder)
            if(index < 0) {
                console.error("Failed to edit reminder for it does not exist");
                showPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder');
                return;
            }

            Reminders.setEditReminder(index)
            Reminders.saveActiveReminders()
            window.api.openPage('reminder')
        })

        const pauseSvgClone = pauseSvg.cloneNode(true);
        const playSvgClone = playSvg.cloneNode(true);
        const stateImage = reminder.paused ? playSvgClone : pauseSvgClone;

        // Create the pause button
        let pauseButton = document.createElement('button')
        pauseButton.classList.add("primary");
        pauseButton.setAttribute('aria-label', reminder.paused ? 'Unpause' : 'Pause')
        pauseButton.append(stateImage)
        pauseButton.title = reminder.paused ? 'Unpause reminder' : 'Pause reminder'
        pauseButton.disabled = reminder.isIgnored

        pauseButton.addEventListener('click', () => {
            if(pauseButton.getAttribute('aria-label') === 'Pause') {
                pauseButton.setAttribute('aria-label', 'Unpause')
                pauseButton.title = 'Pause reminder'
                reminder.setPaused(true)

                pauseButton.replaceChildren(playSvgClone);
            } else {
                pauseButton.setAttribute('aria-label', 'Pause')
                pauseButton.title = 'Unpause reminder'
                reminder.setPaused(false)
                pauseButton.replaceChildren(pauseSvgClone);
            }
        })

        // Create the reset reminder button
        const notifImg = notifcationSvg.cloneNode(true);
        const refreshImg = refreshSvg.cloneNode(true);

        let refreshButton = document.createElement('button');
        refreshButton.classList.add("primary");
        refreshButton.classList.add("acknowledge");

        if(reminder.isIgnored) {
            refreshButton.append(notifImg);
            refreshButton.title = "Acknowledge ignored reminder";
        } else {
            refreshButton.append(refreshImg);
            refreshButton.title = "Reset reminder timer";
        }

        refreshButton.addEventListener('click', () => {
            if(reminder.isIgnored)
                reminder.reset()
            else {
                showPopup(
                    "Reset Reminder", 
                    "Are you sure you want to reset this reminder?",
                    [
                        createPopupButton("Confirm", "destructive", () => { reminder.reset() }),
                        createPopupButton("Cancel")
                    ]
                );
            }
        })

        // Finish building the ui element
        reminderListElement.append(text)
        reminderListElement.append(refreshButton)
        reminderListElement.append(pauseButton)
        reminderListElement.append(editButton)
        reminderListElement.append(deleteButton)

        reminders.push(reminderListElement)
    })

    reminderList.replaceChildren(...reminders)
}

function loadReminderListPage() {
    const createNewReminder = <HTMLButtonElement>document.getElementById("create-new-reminder");

    createNewReminder.addEventListener('click', () => {
        Reminders.saveActiveReminders();
        window.api.openPage('reminder');
    });

    window.addEventListener('update-reminder-list', () => listReminders());

    window.dispatchEvent(new Event('update-reminder-list'));
}

window.onload = async () => {
    deleteSvg = await fetchSvgOrAsImage(deleteSvgPath);
    editSvg = await fetchSvgOrAsImage(editSvgPath);
    pauseSvg = await fetchSvgOrAsImage(pauseSvgPath);
    playSvg = await fetchSvgOrAsImage(playSvgPath);
    notifcationSvg = await fetchSvgOrAsImage(notificationSvgPath);
    refreshSvg = await fetchSvgOrAsImage(refreshSvgPath);

    // document.documentElement.style.setProperty("--nav-foldout-width", "4em");

    Reminders.loadActiveReminders()
    loadReminderListPage()
    setTimeout(Preloads.clearPreloads, 1);
}