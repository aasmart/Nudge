import { InputForm } from "../../common/inputForm";
import { ReminderImpl, Reminders } from "../../common/reminder";
import { addNavToPageListener, getCurrentPageMain, navPage } from "./nav";

async function loadReminderCreationPage() {
    const CREATE_BUTTON = 'create-reminder';

    const form = new InputForm('reminder-form', (json: unknown) => {
        const reminderFormJson: ReminderImpl = json as ReminderImpl;
        const reminder = new ReminderImpl(reminderFormJson);

        const startDelta = reminder?.reminderStartOverrideAmount ?? reminder.reminderIntervalAmount
        reminder.setNextReminderDate(startDelta)

        const editIndex = Reminders.getEditIndex();
        if(editIndex >= 0) {
            Reminders.activeReminders[editIndex] = reminder;
            Reminders.setEditReminder(-1)
        } else
            Reminders.activeReminders.push(reminder)

        Reminders.saveActiveReminders()
        navPage("index");
    }, (_e: Event) => {
        Reminders.setEditReminder(-1)
        Reminders.saveActiveReminders()
        navPage("index");
    });

    const checkEdit = () => {
        // Update display if the user is editing
        const editIndex = Reminders.getEditIndex()
        if(editIndex >= 0) {
            const editReminder = Reminders.activeReminders[editIndex]
    
            form.setFromJson(JSON.stringify(editReminder))
    
            const createButton = form.getInputElement(CREATE_BUTTON)
            if(!createButton)
                return
    
            createButton.innerText = createButton.getAttribute('when-editing') || createButton.innerText
        } else {
            form.clear();
        }

        getCurrentPageMain()?.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant"
        });
    }

    addNavToPageListener("reminder", checkEdit);
    checkEdit();
}

window.addEventListener("navload", () => {
    loadReminderCreationPage()
});