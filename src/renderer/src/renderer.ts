import deleteSvgPath from "../assets/delete.svg"
import editSvgPath from "../assets/edit.svg"
import pauseSvgPath from "../assets/pause.svg"
import playSvgPath from "../assets/play.svg"
import notificationSvgPath from "../assets/notification_important.svg"
import refreshSvgPath from "../assets/refresh.svg"
import { NextReminderDisplayMode, Reminders } from "../../common/reminder"
import { Preloads } from "../../common/preloads"
import { createPopupButton, showPopup } from "../../common/popup"
import { fetchSvgOrAsImage } from "../../common/svgUtils"
import { DateUtils } from "../../common/date"
import { addNavFromPageListener, addNavToPageListener, navPage } from "./nav"

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

        const title = document.createElement("h4");
        title.innerText = reminder.title;

        // Create the display text
        let text = document.createElement('p')
        text.innerText = "Time: ";

        const setTimeDisplay = () => {
            if(reminder.nextReminderDisplayMode === NextReminderDisplayMode.EXACT) {
                textSpan.innerText = reminder.nextReminder.toLocaleString()
            } else {
                textSpan.innerText = `in ${DateUtils.getTimeDifferenceString(new Date(), reminder.nextReminder)}`;
            }
        }

        let textSpan = document.createElement('span')
        if(reminder.paused)
            textSpan.innerText = "this reminder is paused"
        else {
            setTimeDisplay();
        }
        textSpan.classList.add("next-timer-play")
        textSpan.title = "Click to toggle display mode";

        textSpan.addEventListener("click", () => {
            if(reminder.nextReminderDisplayMode === NextReminderDisplayMode.EXACT)
                reminder.nextReminderDisplayMode = NextReminderDisplayMode.COUNTDOWN;
            else
            reminder.nextReminderDisplayMode = NextReminderDisplayMode.EXACT;

            Reminders.saveActiveReminders();
            if(!reminder.paused)
                setTimeDisplay();
        });

        text.append(textSpan)

        // Create the delete button
        const deleteImg = deleteSvg.cloneNode(true);

        let deleteButton = document.createElement('button')
        deleteButton.append(deleteImg)
        deleteButton.setAttribute("action", "destructive")
        deleteButton.title = 'Delete reminder'

        deleteButton.addEventListener('click', () => {
            showPopup(
                "Confirm Nudge Deletion", 
                `Are you sure you want to delete the Nudge "${reminder.title}"?`,
                [
                    createPopupButton("Confirm", "destructive", () => {
                        const index = Reminders.activeReminders.indexOf(reminder)
                        Reminders.activeReminders[index].cancel()
                        if(index >= 0)
                            Reminders.activeReminders.splice(index, 1)
                        Reminders.saveActiveReminders()
                        window.dispatchEvent(new Event('update-reminder-list'))
                    }),
                    createPopupButton("Cancel", "primary")
                ]
            )
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
            navPage("reminder")
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
            window.api.resetActivityDetection();
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
                reminder.acknowledgeIgnored()
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

        if(reminder.paused && reminder.pausedActivityNotification)
            reminder.addPausedReminderNotificationHandler();

        // Finish building the ui element
        reminderListElement.append(title);
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
        navPage("reminder");
    });

    window.addEventListener('update-reminder-list', () => {
        listReminders();
    });
    window.dispatchEvent(new Event('update-reminder-list'));
}

function updateReminderTimes() {
    window.dispatchEvent(new Event("update-reminder-list"));
    setTimeout(
        updateReminderTimes, 
        new Date().addMilliseconds(60 * 1000).setSeconds(0).valueOf() - new Date().valueOf()
    );
}

addNavToPageListener("index", () => {
    listReminders();
});

addNavFromPageListener("index", () => {
    Reminders.saveActiveReminders();
})

window.addEventListener("load", async () => {
    deleteSvg = await fetchSvgOrAsImage(deleteSvgPath);
    editSvg = await fetchSvgOrAsImage(editSvgPath);
    pauseSvg = await fetchSvgOrAsImage(pauseSvgPath);
    playSvg = await fetchSvgOrAsImage(playSvgPath);
    notifcationSvg = await fetchSvgOrAsImage(notificationSvgPath);
    refreshSvg = await fetchSvgOrAsImage(refreshSvgPath);

    Reminders.loadReminders();
    loadReminderListPage()
    setTimeout(Preloads.clearPreloads, 1);

    // handles the secondary display mode for reminder countdowns
    setTimeout(
        updateReminderTimes, 
        new Date().addMilliseconds(60 * 1000).setSeconds(0).valueOf() - new Date().valueOf()
    )
});