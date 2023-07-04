import { ReminderNotificationType } from "../../@types/reminder";
import { InputForm } from "../../common/inputForm";
import { Preloads } from "../../common/preloads";
import { ReminderImpl, Reminders } from "../../common/reminder";

function loadReminderCreationPage() {
    const CREATE_BUTTON = 'create-reminder'

    const form = new InputForm('reminder-form', (e: Event): boolean => {
        e.preventDefault()

        const reminderFormJson: ReminderImpl = JSON.parse(form.formElement.toJSON())
        const reminder = new ReminderImpl({
            reminderIntervalAmount: reminderFormJson?.reminderIntervalAmount,
            reminderStartOverrideAmount: reminderFormJson?.reminderStartOverrideAmount,
            ignoredReminderIntervalAmount: reminderFormJson?.ignoredReminderIntervalAmount,
            maxIgnoredReminders: reminderFormJson.maxIgnoredReminders,
            notificationType: reminderFormJson.notificationType,
            message: reminderFormJson?.message,
            title: reminderFormJson?.title
        })

        const startDelta = reminder?.reminderStartOverrideAmount ?? reminder.reminderIntervalAmount
        reminder.setNextReminderTimeout(startDelta)

        if(editIndex >= 0) {
            Reminders.activeReminders[editIndex] = reminder;
            Reminders.setEditReminder(-1)
        } else
            Reminders.activeReminders.push(reminder)

            Reminders.saveActiveReminders()

        window.api.openPage('index')

        return false;
    }, (e: Event) => {
        e.preventDefault()

        Reminders.setEditReminder(-1)
        Reminders.saveActiveReminders()
        window.api.openPage('index')

        return false;
    }, {
        reminderNotificationType: ReminderNotificationType
    });

    // Update display if the user is editing
    const editIndex = Reminders.getEditIndex()
    if(editIndex >= 0) {
        const editReminder = Reminders.activeReminders[editIndex]

        form.setFromJson(JSON.stringify(editReminder))

        const createButton = form.getInputElement(CREATE_BUTTON)
        if(!createButton)
            return

        createButton.innerText = createButton.getAttribute('when-editing') || createButton.innerText
    }
}

window.onload = () => {
    Reminders.loadActiveReminders()
    loadReminderCreationPage()
    setTimeout(Preloads.clearPreloads, 1)
}