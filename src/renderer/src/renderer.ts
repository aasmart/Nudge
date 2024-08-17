import { showPopup } from "../../common/popup";
import { ReminderNotificationType, Reminders } from "../../common/reminder";
import { OptionsProvider } from "../../common/selectInputs";

function initPlaySelectedAudioButtons() {
    const PLAY_AUDIO_BUTTON_CLASS = "play-audio";

    const buttons = document.getElementsByClassName(PLAY_AUDIO_BUTTON_CLASS);
    Array.from(buttons).forEach(button => {
        button.addEventListener("click", () => {
            const audioSourceId = button.getAttribute("audioSource");
            if(!audioSourceId) {
                console.error(`Audio source ID not set for play button`);
                return;
            }

            const audioInput = document.getElementById(audioSourceId);
            if(audioInput === null) {
                console.error(`Failed to find audio combobox \'${audioSourceId}\'`);
                return;
            }
    
            const selected = (audioInput.getAttribute("aria-activedescendant") ?? "").replaceAll(`${audioSourceId}--`, "");
            if(selected === "")
                return;
            
            try {
                new Audio(selected).play();
            } catch(err) { console.error(err); }
        })
    });
}

async function updateReminderAudioProvider() {
    // Create audio map
    const reminderAudio = await Reminders.getReminderAudio();
    const audioMap = new Map<string, string>();
    audioMap[""] = "No Audio";
    reminderAudio.forEach(audio => {
        audioMap[audio.id] = audio.name;
    });

    OptionsProvider.setOrUpdateProvider("reminderAudio", audioMap);
}

function initAddAudioButtons() {
    const UPLOAD_AUDIO_BUTTON_CLASS = "upload-reminder-audio";

    const buttons = document.getElementsByClassName(UPLOAD_AUDIO_BUTTON_CLASS);
    Array.from(buttons).forEach(button => {
        button.addEventListener("click", () => {
            window.api.showFileDialog([
                {name: "Sound", extensions: ["mp3", "wav", "webm", "ogg"]}
            ]).then(res => {
                if(res.canceled)
                    return;
                const filePath = res.filePaths[0] ?? "";
                if(filePath.length === 0)
                    return;
    
                const splitPath = filePath.split("\\");
                const name = splitPath[splitPath.length - 1];
    
                window.api.getUserPath().then(userPath => {
                    window.api.copyFile(res.filePaths[0], `${userPath}/audio/${name}`).then(res => {
                        if(res) {
                            showPopup("Audio File Uploaded!", `Sucessfully uploaded ${name}`);
                            updateReminderAudioProvider();
                        } else
                            showPopup("Failed to Uploaded Audio!", `Failed to upload ${name}`)
                    });
                });
            })
        })
    });
}

window.addEventListener("load", () => {
    updateReminderAudioProvider();
    OptionsProvider.setOrUpdateProvider("reminderNotificationType", ReminderNotificationType);
});

window.addEventListener("navload", () => {
    initAddAudioButtons();
    initPlaySelectedAudioButtons();
})