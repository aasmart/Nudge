import { Reminders } from "../../common/reminder";

function initBack() {
    const backButton = <HTMLButtonElement>document.getElementsByClassName("back-button")[0];
    backButton.addEventListener("click", () => {
        Reminders.saveActiveReminders();
        window.api.openPage('index');
    })
}

window.addEventListener("load", () => {
    initBack();
});