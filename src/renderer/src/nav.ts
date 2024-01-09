import { Reminders } from "../../common/reminder";

export { };

function initNav() {
    const body = document.getElementsByTagName("body")[0];
    const radios = Array.from(document.getElementsByClassName("nav__app-tab")) as HTMLInputElement[];

    radios.forEach((radio) => {
        const radioAppTabId = radio.getAttribute("value");

        const location = window.location.href.split("/").pop();
        const isPageRadio = location?.startsWith(radioAppTabId || "") ?? false;
        radio.checked = isPageRadio;
        if(isPageRadio)
            body.addEventListener("clearPreload", () => { radio.focus(); });

        if(radioAppTabId?.length ?? 0 > 0) {
            radio.addEventListener("change", () => {
                window.api.openPage(`${radioAppTabId}`);

                // Fixes issue where changing tabs wouldn't clear the reminder being edited
                Reminders.setEditReminder(-1);
            });
        }
    });
}

window.addEventListener("load", () => {
    initNav();
})