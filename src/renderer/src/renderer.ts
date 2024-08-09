import deleteSvgPath from "../assets/delete.svg"
import editSvgPath from "../assets/edit.svg"
import pauseSvgPath from "../assets/pause.svg"
import playSvgPath from "../assets/play.svg"
import notificationSvgPath from "../assets/notification_important.svg"
import refreshSvgPath from "../assets/refresh.svg"
import { NextReminderDisplayMode, ReminderImpl, Reminders } from "../../common/reminder"
import { Preloads } from "../../common/preloads"
import { createPopupButton, showPopup } from "../../common/popup"
import { fetchSvgOrAsImage } from "../../common/svgUtils"
import { DateUtils } from "../../common/date"
import { addNavFromPageListener, addNavToPageListener, navPage } from "./nav"
import { MouseInputEvent } from "electron"

let deleteSvg: SVGElement | HTMLImageElement;
let editSvg: SVGElement | HTMLImageElement;
let pauseSvg: SVGElement | HTMLImageElement;
let playSvg: SVGElement | HTMLImageElement;
let notifcationSvg: SVGElement | HTMLImageElement;
let refreshSvg: SVGElement | HTMLImageElement;

function isDocumentFragment(node: Node | undefined): node is DocumentFragment {
    return node?.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

function listReminders() {
    const reminderList = (document.getElementById("reminder-list") as HTMLElement).children[1] as HTMLElement
    
    let reminders: Array<Node> = []

    const nudgeTemplate: HTMLTemplateElement | null = document.querySelector("#nudge-template");
    
    const contextMenu = document.getElementById("reminder__context-menu");

    Reminders.activeReminders.forEach(reminder => {
        const templateClone: Node | undefined = nudgeTemplate?.content.cloneNode(true);
        
        if(!isDocumentFragment(templateClone))
            return;

        const reminderLi = templateClone.querySelector(".reminder");
        if(reminderLi) {
            if(reminder.isIgnored)
                reminderLi?.classList.add("ignored");
            
            reminderLi.addEventListener("contextmenu", (e: any) => {
                let relX = e.clientX;
                let relY = e.clientY;

                contextMenu?.setAttribute("visible", "true");

                const contextMenuRect = contextMenu?.getBoundingClientRect();
                if(relX + contextMenuRect?.width >= window.innerWidth)
                    relX -= contextMenuRect?.width ?? 0;
                if(relY + contextMenuRect?.height >= window.innerHeight)
                    relY -= contextMenuRect?.height ?? 0;

                (contextMenu as HTMLElement).style.top = `${relY}px`;
                (contextMenu as HTMLElement).style.left = `${relX}px`;

                const index = Reminders.activeReminders.indexOf(reminder);
                contextMenu?.setAttribute("reminder-index", `${index}`);
            });
        }

        const title = templateClone.querySelector(".reminder__name");
        if(title)
            title.textContent = reminder.title;

        // Set the span displaying the next trigger time
        const nudgeTimeSpan = templateClone.querySelector(".next-timer-play");
        if(nudgeTimeSpan && nudgeTimeSpan) {
            const setTimeDisplay = () => {
                if(reminder.nextReminderDisplayMode === NextReminderDisplayMode.EXACT) {
                    nudgeTimeSpan.textContent = reminder.nextReminder.toLocaleString()
                } else {
                    nudgeTimeSpan.textContent = `in ${DateUtils.getTimeDifferenceString(new Date(), reminder.nextReminder)}`;
                }
            }

            if(reminder.paused)
                nudgeTimeSpan.textContent = "this reminder is paused"
            else {
                setTimeDisplay();
            }
            (nudgeTimeSpan as HTMLElement).title = "Click to toggle display mode";

            nudgeTimeSpan.addEventListener("click", () => {
                if(reminder.nextReminderDisplayMode === NextReminderDisplayMode.EXACT)
                    reminder.nextReminderDisplayMode = NextReminderDisplayMode.COUNTDOWN;
                else
                reminder.nextReminderDisplayMode = NextReminderDisplayMode.EXACT;

                Reminders.saveActiveReminders();
                if(!reminder.paused)
                    setTimeDisplay();
            });
        }

        // Create the pause toggle
        const pauseToggle = templateClone.querySelector(".reminder__pause-toggle");
        const pauseToggleInput = templateClone.querySelector(".reminder__pause-toggle__input");
        const pauseToggleLabel = templateClone.querySelector(".reminder__pause-toggle__label");
        if(pauseToggleInput && pauseToggleLabel) {
            pauseToggle?.setAttribute("visible", `${!reminder.isIgnored}`);

            (pauseToggleInput as HTMLElement).title = (reminder.paused ? 'Unpause reminder' : 'Pause reminder');
            (pauseToggleInput as HTMLInputElement).disabled = reminder.isIgnored;

            pauseToggleInput.id = `reminder__pause-toggle-${reminders.length}`;
            pauseToggleLabel.setAttribute("for", `reminder__pause-toggle-${reminders.length}`);

            (pauseToggleInput as HTMLInputElement).checked = !reminder.paused;
            if((pauseToggleInput as HTMLInputElement).checked) {
                (pauseToggle as HTMLElement).title = 'Pause reminder';
            } else {
                (pauseToggle as HTMLElement).title = 'Unpause reminder';
            }
            
            pauseToggleInput.addEventListener('click', () => {
                if(!(pauseToggleInput as HTMLInputElement).checked) {
                    (pauseToggle as HTMLElement).title = 'Pause reminder';
                    reminder.setPaused(true)
                } else {
                    (pauseToggle as HTMLElement).title = 'Unpause reminder';
                    reminder.setPaused(false)
                }
                window.api.resetActivityDetection();
            })
        }

        const acknowledgeButton = templateClone.querySelector(".reminder__acknowledge");
        if(acknowledgeButton) {
            acknowledgeButton?.setAttribute("visible", `${reminder.isIgnored}`);
            const notifImg = notifcationSvg.cloneNode(true);
            acknowledgeButton.append(notifImg);

            acknowledgeButton.addEventListener('click', () => {
                if(reminder.isIgnored)
                    reminder.acknowledgeIgnored()
            })
        }

        if(reminder.paused && reminder.pausedActivityNotification)
            reminder.addPausedReminderNotificationHandler();

        // // Create the base div
        // let reminderListElement = document.createElement("li")
        // reminderListElement.classList.add('reminder')
        // if(reminder.isIgnored)
        //     reminderListElement.classList.add("ignored")

        // const title = document.createElement("h4");
        // title.innerText = reminder.title;

        // // Create the display text
        // let text = document.createElement('p')
        // text.innerText = "Time: ";

        // const setTimeDisplay = () => {
        //     if(reminder.nextReminderDisplayMode === NextReminderDisplayMode.EXACT) {
        //         textSpan.innerText = reminder.nextReminder.toLocaleString()
        //     } else {
        //         textSpan.innerText = `in ${DateUtils.getTimeDifferenceString(new Date(), reminder.nextReminder)}`;
        //     }
        // }

        // let textSpan = document.createElement('span')
        // if(reminder.paused)
        //     textSpan.innerText = "this reminder is paused"
        // else {
        //     setTimeDisplay();
        // }
        // textSpan.classList.add("next-timer-play")
        // textSpan.title = "Click to toggle display mode";

        // textSpan.addEventListener("click", () => {
        //     if(reminder.nextReminderDisplayMode === NextReminderDisplayMode.EXACT)
        //         reminder.nextReminderDisplayMode = NextReminderDisplayMode.COUNTDOWN;
        //     else
        //     reminder.nextReminderDisplayMode = NextReminderDisplayMode.EXACT;

        //     Reminders.saveActiveReminders();
        //     if(!reminder.paused)
        //         setTimeDisplay();
        // });

        // text.append(textSpan)

        // // Create the delete button
        // const deleteImg = deleteSvg.cloneNode(true);

        // let deleteButton = document.createElement('button')
        // deleteButton.append(deleteImg)
        // deleteButton.setAttribute("action", "destructive")
        // deleteButton.title = 'Delete reminder'

        // deleteButton.addEventListener('click', () => {
        //     showPopup(
        //         "Confirm Nudge Deletion", 
        //         `Are you sure you want to delete the Nudge "${reminder.title}"?`,
        //         [
        //             createPopupButton("Confirm", "destructive", () => {
        //                 const index = Reminders.activeReminders.indexOf(reminder)
        //                 Reminders.activeReminders[index].cancel()
        //                 if(index >= 0)
        //                     Reminders.activeReminders.splice(index, 1)
        //                 Reminders.saveActiveReminders()
        //                 window.dispatchEvent(new Event('update-reminder-list'))
        //             }),
        //             createPopupButton("Cancel", "primary")
        //         ]
        //     )
        // })

        // // Create the edit button
        // const editImg = editSvg.cloneNode(true);

        // let editButton = document.createElement('button')
        // editButton.append(editImg)
        // editButton.classList.add("primary");
        // editButton.title = 'Edit reminder'

        // editButton.addEventListener('click', () => {
        //     const index = Reminders.activeReminders.indexOf(reminder)
        //     if(index < 0) {
        //         console.error("Failed to edit reminder for it does not exist");
        //         showPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder');
        //         return;
        //     }

        //     Reminders.setEditReminder(index)
        //     Reminders.saveActiveReminders()
        //     navPage("reminder")
        // })

        // const pauseSvgClone = pauseSvg.cloneNode(true);
        // const playSvgClone = playSvg.cloneNode(true);
        // const stateImage = reminder.paused ? playSvgClone : pauseSvgClone;

        // // Create the pause button
        // let pauseButton = document.createElement('button')
        // pauseButton.classList.add("primary");
        // pauseButton.setAttribute('aria-label', reminder.paused ? 'Unpause' : 'Pause')
        // pauseButton.append(stateImage)
        // pauseButton.title = reminder.paused ? 'Unpause reminder' : 'Pause reminder'
        // pauseButton.disabled = reminder.isIgnored

        // pauseButton.addEventListener('click', () => {
        //     if(pauseButton.getAttribute('aria-label') === 'Pause') {
        //         pauseButton.setAttribute('aria-label', 'Unpause')
        //         pauseButton.title = 'Pause reminder'
        //         reminder.setPaused(true)
        //         pauseButton.replaceChildren(playSvgClone);
        //     } else {
        //         pauseButton.setAttribute('aria-label', 'Pause')
        //         pauseButton.title = 'Unpause reminder'
        //         reminder.setPaused(false)
        //         pauseButton.replaceChildren(pauseSvgClone);
        //     }
        //     window.api.resetActivityDetection();
        // })

        // // Create the reset reminder button
        // const notifImg = notifcationSvg.cloneNode(true);
        // const refreshImg = refreshSvg.cloneNode(true);

        // let refreshButton = document.createElement('button');
        // refreshButton.classList.add("primary");
        // refreshButton.classList.add("acknowledge");

        // if(reminder.isIgnored) {
        //     refreshButton.append(notifImg);
        //     refreshButton.title = "Acknowledge ignored reminder";
        // } else {
        //     refreshButton.append(refreshImg);
        //     refreshButton.title = "Reset reminder timer";
        // }

        // refreshButton.addEventListener('click', () => {
        //     if(reminder.isIgnored)
        //         reminder.acknowledgeIgnored()
        //     else {
        //         showPopup(
        //             "Reset Reminder", 
        //             "Are you sure you want to reset this reminder?",
        //             [
        //                 createPopupButton("Confirm", "destructive", () => { reminder.reset() }),
        //                 createPopupButton("Cancel")
        //             ]
        //         );
        //     }
        // })

        // if(reminder.paused && reminder.pausedActivityNotification)
        //     reminder.addPausedReminderNotificationHandler();

        // const contextMenuButton = document.createElement("button");
        // contextMenuButton.classList.add("primary");
        // contextMenuButton.classList.add("reminder__context-menu-btn");


        // // Finish building the ui element
        // reminderListElement.append(title);
        // reminderListElement.append(text)
        // reminderListElement.append(refreshButton)
        // reminderListElement.append(pauseButton)
        // reminderListElement.append(editButton)
        // reminderListElement.append(deleteButton)
        // reminderListElement.append(contextMenuButton)

        reminders.push(templateClone);
    })

    if(reminders.length == 0) {
        const p = document.createElement("p");
        p.innerText = "There are currently no Nudges";
        reminderList.replaceChildren(p);
    } else {
        reminderList.replaceChildren(...reminders);
    }
}

function initContextMenu() {
    // setup the context menu
    const contextMenu = document.getElementById("reminder__context-menu");
    const contextDeleteBtn = contextMenu?.querySelector(".reminder__delete");
    contextDeleteBtn?.addEventListener('click', () => {
        // get the focused reminder
        const index = contextMenu?.getAttribute("reminder-index");
        if(!index)
            return;
        const reminder = Reminders.activeReminders[index];

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
    });

    const contextEditBtn = contextMenu?.querySelector(".reminder__edit");
    contextEditBtn?.addEventListener('click', () => {
        // get the focused reminder
        const indexStr = contextMenu?.getAttribute("reminder-index");
        if(!indexStr)
            return;

        const index = parseInt(indexStr);
        
        if(index as number < 0) {
            console.error("Failed to edit reminder for it does not exist");
            showPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder');
            return;
        }

        Reminders.setEditReminder(index)
        Reminders.saveActiveReminders()
        navPage("reminder")
    });

    const contextRefreshButton = contextMenu?.querySelector(".reminder__reset");
    contextRefreshButton?.addEventListener('click', () => {
        // get the focused reminder
        const index = contextMenu?.getAttribute("reminder-index");
        if(!index)
            return;
        const reminder: ReminderImpl = Reminders.activeReminders[index];

        if(reminder.isIgnored)
            return;

        showPopup(
            "Reset Reminder", 
            "Are you sure you want to reset this reminder?",
            [
                createPopupButton("Confirm", "destructive", () => { reminder.reset() }),
                createPopupButton("Cancel")
            ]
        );
    })
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
    initContextMenu();
    setTimeout(Preloads.clearPreloads, 1);

    // handles the secondary display mode for reminder countdowns
    setTimeout(
        updateReminderTimes, 
        new Date().addMilliseconds(60 * 1000).setSeconds(0).valueOf() - new Date().valueOf()
    )
});

window.addEventListener("click", (e: Event) => {
    const contextMenu = document.getElementById("reminder__context-menu");
    contextMenu?.setAttribute("visible", "false");
        
})