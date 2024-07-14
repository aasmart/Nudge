import { createPopupButton, showPopup } from "../../common/popup";
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
            const changeWindow = () => { window.api.openPage(`${radioAppTabId}`); };
            radio.addEventListener("change", () => {
                if(Reminders.getEditIndex() !== -1) {
                    // undo the checking of the clicked radio button
                    const location = window.location.href.split("/").pop();
                    const currRadio = radios.find(r => location?.startsWith(r.getAttribute("value") || ""));
                    if(currRadio)
                        currRadio.checked = true;
                    showPopup(
                        "Unsaved Changes", 
                        "Are you sure you want to change pages? Any changes will be lost",
                        [
                            createPopupButton("Confirm", "destructive", () => { 
                                changeWindow();
                                Reminders.setEditReminder(-1);
                            }),
                            createPopupButton("Cancel")
                        ]
                    );
                } else {
                    changeWindow();
                }
            });
        }
    });
}

window.addEventListener("load", () => {
    initNav();
})