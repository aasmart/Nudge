import { NextReminderDisplayMode, ReminderImpl, Reminders } from "../../common/reminder"
import { Preloads } from "../../common/preloads"
import { createPopupButton, showPopup } from "../../common/popup"
import { DateUtils } from "../../common/date"
import { addNavFromPageListener, addNavToPageListener, navPage } from "./nav"

enum ContextMenuOpenMethod {
    CONTEXT,
    MORE
}

/**
 * The context menu that is displayed for reminders
 */
const contextMenu = document.getElementById("reminder__context-menu");

/**
 * Checks if a node is a document fragment
 * @param node The node to check
 * @returns True if the node is a document fragment
 */
function isDocumentFragment(node: Node | undefined): node is DocumentFragment {
    return node?.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

/**
 * Sets the current time display for a reminder
 * @param reminder The reminder to set the time display for
 * @param nudgeTimeSpan The span element to display the time in
 * @param nudgeTimeSpanPrefix The element for the text that comes before the time
 */
const setTimeDisplay = (reminder: ReminderImpl, nudgeTimeSpan: Element, nudgeTimeSpanPrefix: Element) => {
    if(reminder.nextReminderDisplayMode === NextReminderDisplayMode.EXACT) {
        nudgeTimeSpan.textContent = `${reminder.nextReminder.toLocaleString()}.`
        nudgeTimeSpanPrefix.textContent = "Next nudge at ";
    } else {
        nudgeTimeSpan.textContent = `${DateUtils.getTimeDifferenceString(new Date(), reminder.nextReminder)}`;
        nudgeTimeSpanPrefix.textContent = "Next nudge in ";
    }
}

/**
 * Toggles the countdown display mode for a reminder
 * @param reminder The reminder to toggle the time display for
 * @param nudgeTimeSpan The span element to display the time in
 * @param nudgeTimeSpanPrefix The element for the text that comes before the time
 */
const toggleCountdownDisplay = (reminder: ReminderImpl, nudgeTimeSpan: Element, nudgeTimeSpanPrefix: Element) => {
    if(reminder.nextReminderDisplayMode === NextReminderDisplayMode.EXACT)
        reminder.nextReminderDisplayMode = NextReminderDisplayMode.COUNTDOWN;
    else
        reminder.nextReminderDisplayMode = NextReminderDisplayMode.EXACT;

    Reminders.saveActiveReminders();
    if(!reminder.paused)
        setTimeDisplay(reminder, nudgeTimeSpan, nudgeTimeSpanPrefix);
}

/**
 * Loads all reminders as elements in the reminder list. Initializes any events and controls for the reminders.
 * Should be called whenever a reminder's underlying data is changed, such as when it is edited.
 * See {@link updateReminderList} instead for periodically updating the reminder's display elements,
 * like the time.
 */
function listReminders(): void {
    const reminderList = (document.getElementById("reminder-list") as HTMLElement).children[1] as HTMLElement
    
    let reminders: Array<Node> = []

    const nudgeTemplate: HTMLTemplateElement | null = document.querySelector("#nudge-template");
    
    Reminders.activeReminders.forEach((reminder, index) => {
        const templateClone: Node | undefined = nudgeTemplate?.content.cloneNode(true);
        
        if(!isDocumentFragment(templateClone))
            return;

        const reminderLi = templateClone.querySelector(".reminder");
        if(reminderLi) {
            reminderLi.addEventListener("contextmenu", (e: any) => {
                openReminderContextMenu(index, reminderList, e.clientX, e.clientY);
            });
        }

        reminderLi?.addEventListener("click", () => {
            if(!reminder.isIgnored)
                return;
            reminder.acknowledgeIgnored();
        });

        const reminderMenuMoreButton = templateClone.querySelector(".reminder__more-button");
        if(reminderMenuMoreButton) {
            reminderMenuMoreButton.addEventListener("click", (e: any) => {
                const rect = reminderMenuMoreButton.getBoundingClientRect();
                if(contextMenu?.getAttribute("visible") === "true" 
                    && `${index}` === contextMenu.getAttribute("reminder-index")
                    && contextMenu.getAttribute("open-method") === ContextMenuOpenMethod.MORE.toString()
                ) {
                    closeReminderContextMenu();
                } else {
                    openReminderContextMenu(index, reminderList, rect.x, rect.y, rect.width, 0, ContextMenuOpenMethod.MORE);
                }
                (reminderMenuMoreButton as HTMLElement).blur();
                e.preventDefault();
            });
        }

        // Set the span displaying the next trigger time
        const nudgeTimeSpan = templateClone.querySelector(".next-timer-play");
        const nudgeTimeSpanPrefix = templateClone.querySelector(".reminder__next-play-prefix");
        if(nudgeTimeSpan && nudgeTimeSpanPrefix) {
            nudgeTimeSpan.addEventListener("click", () => {
                toggleCountdownDisplay(reminder, nudgeTimeSpan, nudgeTimeSpanPrefix);
            });
        }

        // Create the pause toggle
        const pauseToggle = templateClone.querySelector(".reminder__pause-toggle");
        const pauseToggleInput = templateClone.querySelector(".reminder__pause-toggle__input");
        const pauseToggleLabel = templateClone.querySelector(".reminder__pause-toggle__label");
        if(pauseToggleInput && pauseToggleLabel) {
            pauseToggleInput.id = `reminder__pause-toggle-${reminders.length}`;
            pauseToggleLabel.setAttribute("for", `reminder__pause-toggle-${reminders.length}`);
            
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
            acknowledgeButton.addEventListener('click', () => {
                if(reminder.isIgnored)
                    reminder.acknowledgeIgnored()
            })
        }

        if(reminder.paused && reminder.pausedActivityNotification)
            reminder.addPausedReminderNotificationHandler();
        reminders.push(templateClone);
    })

    if(reminders.length == 0) {
        const p = document.createElement("p");
        p.innerText = "You do not have any nudges.";
        reminderList.replaceChildren(p);
    } else {
        reminderList.replaceChildren(...reminders);
        updateReminderList();
    }
}

/**
 * Updates the visuals for every reminder list item.
 */
function updateReminderList(): void {
    const reminderList = (document.getElementById("reminder-list") as HTMLElement).children[1] as HTMLElement
    const reminders = Array.from(reminderList.children).filter(e => e.classList.contains("reminder"));

    // completely redo the entire list if a new element is removed or added
    if(reminders.length !== Reminders.activeReminders.length) {
        listReminders();
        return;
    }

    reminders.forEach((e, index) => {
        const reminder = Reminders.activeReminders[index];
        const title = e.querySelector(".reminder__name");
        if(title) {
            title.textContent = reminder.title;
            title.setAttribute("title", reminder.title);
        }

        if(reminder.isIgnored)
            e.classList.add("ignored");
        else
            e.classList.remove("ignored")

        const nudgeTimeSpan = e.querySelector(".next-timer-play");
        const nudgeTimeSpanPrefix = e.querySelector(".reminder__next-play-prefix");
        if(nudgeTimeSpan && nudgeTimeSpanPrefix) {
            if(reminder.paused) {
                nudgeTimeSpanPrefix.textContent = "This reminder is paused.";
                nudgeTimeSpan.textContent = "";
            } else {
                setTimeDisplay(reminder, nudgeTimeSpan, nudgeTimeSpanPrefix);
            }
        }

        // Create the pause toggle
        const pauseToggle = e.querySelector(".reminder__pause-toggle");
        const pauseToggleInput = e.querySelector(".reminder__pause-toggle__input");
        const pauseToggleLabel = e.querySelector(".reminder__pause-toggle__label");
        if(pauseToggleInput && pauseToggleLabel) {
            pauseToggle?.setAttribute("visible", `${!reminder.isIgnored}`);

            (pauseToggleInput as HTMLElement).title = (reminder.paused ? 'Unpause reminder' : 'Pause reminder');
            (pauseToggleInput as HTMLInputElement).disabled = reminder.isIgnored;

            (pauseToggleInput as HTMLInputElement).checked = !reminder.paused;
            if((pauseToggleInput as HTMLInputElement).checked) {
                (pauseToggle as HTMLElement).title = 'Pause reminder';
            } else {
                (pauseToggle as HTMLElement).title = 'Unpause reminder';
            }
        }

        const acknowledgeButton = e.querySelector(".reminder__acknowledge");
        if(acknowledgeButton) {
            acknowledgeButton?.setAttribute("visible", `${reminder.isIgnored}`);
        }
    });
}

/**
 * Opens the context menu for a particular reminder at some position
 * 
 * @param reminderIndex The index of the reminder to open the menu for
 * @param reminderList The HTML reminder list element
 * @param mouseX The x position to place the top left corner of the menu
 * @param mouseY The y position to place the top left corner of the menu
 * @param offsetX Offset in the x-direction. Will be set to 0 if the menu is flipped horizontally
 * @param offsetY Offset in the y-direction. Will be set to 0 if the menu is flipped vertically
 * @param openMethod How the context menu was opened
 */
function openReminderContextMenu (
    reminderIndex: number,
    reminderList: HTMLElement,
    mouseX: number, 
    mouseY: number, 
    offsetX: number = 0, 
    offsetY: number = 0,
    openMethod: ContextMenuOpenMethod = ContextMenuOpenMethod.CONTEXT
): void {
    let relX = mouseX;
    let relY = mouseY;

    const selected = contextMenu?.querySelector('[aria-current="true"]');
    if(selected)
        selected.setAttribute("aria-current", "false");

    contextMenu?.setAttribute("visible", "true");
    const contextMenuRect = contextMenu?.getBoundingClientRect();
    if(!contextMenuRect)
        return;

    if(relX + contextMenuRect.width >= window.innerWidth) {
        relX -= contextMenuRect.width ?? 0;
        offsetX = 0;
    }
    if(relY + contextMenuRect.height >= window.innerHeight) {
        relY -= contextMenuRect.height ?? 0;
        offsetY = 0;
    }

    (contextMenu as HTMLElement).style.left = `${relX + offsetX}px`;
    (contextMenu as HTMLElement).style.top = `${relY + offsetY}px`;

    if(reminderIndex < 0 || reminderIndex >= reminderList.childElementCount)
        return;

    contextMenu?.setAttribute("reminder-index", `${reminderIndex}`);
    contextMenu?.setAttribute("open-method", openMethod.toString());
    reminderList.children[reminderIndex]?.classList.add("hasContext");
}

/**
 * Closes the reminder context menu.
 * @param checkRefocus If true, the reminder will attempt to refocus the reminder's more button
 *                      if the last interaction with the menu was via keyboard.
 */
function closeReminderContextMenu(checkRefocus: boolean = true): void {
    if(contextMenu?.hasAttribute("visible") && contextMenu?.getAttribute("visible") === "false")
        return;

    contextMenu?.setAttribute("visible", "false");
    const selected = contextMenu?.querySelector('[aria-current="true"]');
        if(selected)
            selected.setAttribute("aria-current", "false");

    const reminderList = (document.getElementById("reminder-list") as HTMLElement).children[1] as HTMLElement

    // Allows the reminder's more button to be focused if the last interation on the context menu
    // was using the keyboard
    if(checkRefocus && contextMenu?.hasAttribute("keyboard") && contextMenu.getAttribute("keyboard") === "true") {
        if(!reminderList)
            return;

        const reminderIndex = parseInt(contextMenu?.getAttribute("reminder-index") ?? "-1");
        if(reminderIndex < 0 || reminderIndex >= Reminders.activeReminders.length)
            return;

        const moreButton = reminderList.children[reminderIndex].querySelector(".reminder__more-button");
        if(!moreButton)
            return;

        (moreButton as HTMLElement).focus();
    }

    Array.from(reminderList.getElementsByClassName("hasContext")).forEach(e => {
        e.classList.remove("hasContext");
    });
}

/**
 * Initializes the controls of the context menu. Should only be called once during the application's
 * lifetime.
 */
function initReminderContextMenu() {
    const reminderList = (document.getElementById("reminder-list") as HTMLElement).children[1] as HTMLElement
    // setup the context menu
    const contextMenu = document.getElementById("reminder__context-menu");

    window.addEventListener("keydown", (e: KeyboardEvent) => {
        if(contextMenu?.getAttribute("visible") !== "true")
            return;
        
        if(e.key === "ArrowDown" || e.key === "ArrowUp") {
            const selected = contextMenu?.querySelector('[aria-current="true"]');
            if(!selected) {
                const first = contextMenu?.firstElementChild;
                if(!first)
                    return;

                first.setAttribute("aria-current", "true");
            } else {
                let sibling: Element | null;
                if(e.key === "ArrowDown") {
                    sibling  = selected.nextElementSibling ?? contextMenu?.firstElementChild;
                } else {
                    sibling  = selected.previousElementSibling ?? contextMenu.lastElementChild;
                }

                if(!sibling)
                    return;

                sibling.setAttribute("aria-current", "true");
                selected.setAttribute("aria-current", "false");
            }

            contextMenu?.setAttribute("keyboard", "true");
        } else if(e.key === "Escape") {
            closeReminderContextMenu();
        } else if(e.key === "Tab") {
            e.preventDefault();
        }
    });

    window.addEventListener("click", (e: Event) => {
        if((e.target as HTMLElement).classList.contains("reminder__more-button"))
            return;
        const isContextMenuButton = (e.target as HTMLElement).parentElement?.classList.contains("reminder__context-menu__item");
        closeReminderContextMenu(isContextMenuButton);
    });
    
    window.addEventListener("resize", () => {
        closeReminderContextMenu(false);
    });

    // deselect selected element if mouse leaves menu
    contextMenu?.addEventListener("mouseleave", _ => {
        const selected = contextMenu?.querySelector('[aria-current="true"]');
        if(selected)
            selected.setAttribute("aria-current", "false");
        contextMenu?.setAttribute("keyboard", "false");
    })

    contextMenu?.querySelectorAll(".reminder__context-menu__item").forEach(item => {
        // Select any items that are hovered over
        item.addEventListener("mouseover", _ => {
            const selected = contextMenu?.querySelector('[aria-current="true"]');
            if(selected)
                selected.setAttribute("aria-current", "false");
            item?.setAttribute("aria-current", "true");
            contextMenu?.setAttribute("keyboard", "false");
        });

        // Detect "button press" when using keyboard
        window.addEventListener("keydown", (event: KeyboardEvent) => {
            if(!item.hasAttribute("aria-current") || item.getAttribute("aria-current") === "false")
                return;
            if(event.key === "Enter" || event.key === " ") {
                (item.firstElementChild as HTMLElement)?.click();
                event.preventDefault();
            }
        })
    });

    const contextDeleteBtn = contextMenu?.querySelector(".reminder__delete");
    contextDeleteBtn?.addEventListener('click', e => {
        e.preventDefault();
        
        // get the focused reminder
        const indexStr = contextMenu?.getAttribute("reminder-index");
        if(!indexStr || indexStr === "" || isNaN(Number(indexStr)))
            return;

        const index = Number(indexStr);
        if(index < 0 || index >= reminderList.childElementCount)
            return;
        const reminder: ReminderImpl = Reminders.activeReminders[index];

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
    contextEditBtn?.addEventListener('click', e => {
        e.preventDefault();

        // get the focused reminder
        const indexStr = contextMenu?.getAttribute("reminder-index");
        if(!indexStr || indexStr === "" || isNaN(Number(indexStr)))
            return;

        const index = Number(indexStr);
        
        if(index < 0 || index >= reminderList.childElementCount) {
            console.error("Failed to edit reminder for it does not exist");
            showPopup('Encountered An Error', 'An error was encounter while trying to edit the reminder');
            return;
        }

        Reminders.setEditReminder(index)
        Reminders.saveActiveReminders()
        navPage("reminder")
    });

    const contextRefreshButton = contextMenu?.querySelector(".reminder__reset");
    contextRefreshButton?.addEventListener('click', e => {
        e.preventDefault();

        // get the focused reminder
        const indexStr = contextMenu?.getAttribute("reminder-index");
        if(!indexStr || indexStr === "" || isNaN(Number(indexStr)))
            return;

        const index = Number(indexStr);
        if(index < 0 || index >= reminderList.childElementCount)
            return;
        const reminder: ReminderImpl = Reminders.activeReminders[index];

        showPopup(
            "Reset Reminder", 
            "Are you sure you want to reset this reminder?",
            [
                createPopupButton("Confirm", "destructive", () => { reminder.reset() }),
                createPopupButton("Cancel")
            ]
        );
    })

    const contextTimerToggleButton = contextMenu?.querySelector(".reminder__update-display");
    contextTimerToggleButton?.addEventListener('click', e => {
        e.preventDefault();

        // get the focused reminder
        const indexStr = contextMenu?.getAttribute("reminder-index");
        if(!indexStr || indexStr === "" || isNaN(Number(indexStr)))
            return;

        const index = Number(indexStr);
        if(index < 0 || index >= reminderList.childElementCount)
            return;
        const reminder: ReminderImpl = Reminders.activeReminders[index];

        const nudgeTimeSpan = reminderList.children[index]
            .querySelector(".next-timer-play");
        const nudgeTimeSpanPrefix = reminderList.children[index]
            .querySelector(".reminder__next-play-prefix");

        if(!nudgeTimeSpan || !nudgeTimeSpanPrefix)
            return;

        toggleCountdownDisplay(reminder, nudgeTimeSpan, nudgeTimeSpanPrefix);
    })
}

function loadReminderListPage() {
    const createNewReminder = <HTMLButtonElement>document.getElementById("create-new-reminder");

    createNewReminder.addEventListener('click', () => {
        Reminders.saveActiveReminders();
        navPage("reminder");
    });

    window.addEventListener('update-reminder-list', () => {
        updateReminderList();
    });
    window.addEventListener('reset-reminder-list', () => {
        listReminders();
    });
    window.dispatchEvent(new Event('update-reminder-list'));
}

addNavToPageListener("index", () => {
    listReminders();
});

addNavFromPageListener("index", () => {
    Reminders.saveActiveReminders();
})

function updateReminderTimes() {
    window.dispatchEvent(new Event("update-reminder-list"));
    setTimeout(
        updateReminderTimes, 
        new Date().addMilliseconds(60 * 1000).setSeconds(0).valueOf() - new Date().valueOf()
    );
}

window.addEventListener("load", async () => {
    Reminders.loadReminders();
    loadReminderListPage()
    initReminderContextMenu();
    listReminders();
    setTimeout(Preloads.clearPreloads, 1);

    // handles the secondary display mode for reminder countdowns
    setTimeout(
        updateReminderTimes, 
        new Date().addMilliseconds(60 * 1000).setSeconds(0).valueOf() - new Date().valueOf()
    )
});