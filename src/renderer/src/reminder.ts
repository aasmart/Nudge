import { InputForm } from "../../common/inputForm";
import { showPopup } from "../../common/popup";
import { ReminderImpl, ReminderNotificationType, Reminders, NextReminderDisplayMode } from "../../common/reminder";
import { addNavToPageListener, getCurrentPageMain, navPage } from "./nav";

async function loadReminderCreationPage() {
    const CREATE_BUTTON = 'create-reminder';

    // Create audio map
    const reminderAudio = await Reminders.getReminderAudio();
    const audioMap = new Map<string, string>();
    audioMap[""] = "No Audio";
    reminderAudio.forEach(audio => {
        audioMap[audio.id] = audio.name;
    });

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
    }, {
        reminderNotificationType: ReminderNotificationType,
        reminderAudio: audioMap,
    });

    addNavToPageListener("reminder", () => {
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
    });

    initPlaySelectedAudioButton();
    initAddAudioButton();
}

function initPlaySelectedAudioButton() {
    const PLAY_AUDIO_BUTTON_ID = "play-reminder-audio";
    const AUDIO_COMBOBOX_ID = "reminder-audio-id";

    const button = document.getElementById(PLAY_AUDIO_BUTTON_ID);
    if(button === null) {
        console.error(`Failed to find button ${PLAY_AUDIO_BUTTON_ID}`);
        return;
    }

    button.addEventListener("click", () => {
        const audioInput = document.getElementById(AUDIO_COMBOBOX_ID);
        if(audioInput === null) {
            console.error(`Failed to find audio combobox \'${AUDIO_COMBOBOX_ID}\'`);
            return;
        }

        const selected = (audioInput.getAttribute("aria-activedescendant") ?? "").replaceAll(`${AUDIO_COMBOBOX_ID}--`, "");
        if(selected === "")
            return;
        
        try {
            new Audio(selected).play();
        } catch(err) { console.error(err); }
    })
}

function initAddAudioButton() {
    const UPLOAD_AUDIO_BUTTON_ID = "upload-reminder-audio";

    const button = document.getElementById(UPLOAD_AUDIO_BUTTON_ID);
    if(button === null) {
        console.error(`Failed to find button ${UPLOAD_AUDIO_BUTTON_ID}`);
        return;
    }

    button.addEventListener("click", () => {
        window.api.showFileDialog([
            {name: "Sound", extensions: ["mp3", "wav", "webm", "ogg"]}
        ]).then(res => {
            if(res.canceled)
                return;
;
            const filePath = res.filePaths[0] ?? "";
            if(filePath.length === 0)
                return;

            const splitPath = filePath.split("\\");
            const name = splitPath[splitPath.length - 1];

            window.api.getUserPath().then(userPath => {
                window.api.copyFile(res.filePaths[0], `${userPath}/audio/${name}`).then(res => {
                    if(res)
                        showPopup("Audio File Uploaded!", `Sucessfully uploaded ${name}`);
                    else
                        showPopup("Failed to Uploaded Audio!", `Failed to upload ${name}`)
                });
            });
        })
    })
}

window.addEventListener("load", () => {
    loadReminderCreationPage()
});