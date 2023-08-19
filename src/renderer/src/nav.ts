import { Reminders } from "../../common/reminder";

function initHomeButton() {
    const homeButtons = Array.from(document.getElementsByClassName("home-button"));
    homeButtons.forEach(button => {
        button.addEventListener("click", () => {
            Reminders.saveActiveReminders()
            window.api.openPage('index')
        });
    });
}

function initSettingsButton() {
    const settingsButtons = Array.from(document.getElementsByClassName("settings-button"));
    settingsButtons.forEach(button => {
        button.addEventListener("click", () => {
            Reminders.saveActiveReminders()
            window.api.openPage('settings')
        });
    });
}

window.addEventListener("load", () => {
    initSettingsButton();
    initHomeButton();
})