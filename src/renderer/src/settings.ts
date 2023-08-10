import { Preferences, Theme } from "../../common/preferences";
import { Reminders } from "../../common/reminder";

function initSettings() {
    const fields = document.getElementsByTagName("fieldset");
    Array.from(fields).forEach(element => {
        const groupStoreId = element.getAttribute("data-store-id");
        const inputs = element.getElementsByTagName("input");

        Array.from(inputs).forEach(async input => {
            const type = input.getAttribute("type");
            const storeId = (element.getAttribute("data-store-id") ?? groupStoreId ?? "") as keyof Preferences;

            const storedValue = await window.api.preferences.get(storeId);

            switch(type) {
                case "radio":
                    const value = input.getAttribute("value") as Theme;
                    input.toggleAttribute("checked", value === storedValue);     
                    
                    input.addEventListener("change", () => {
                        window.api.preferences.set(storeId, value ?? "system");
                    });
                    break;
            }
        });
        //preferencesStore.get(storeId)
    });
}

function initBack() {
    const backButton = <HTMLButtonElement>document.getElementsByClassName("back-button")[0];
    backButton.addEventListener("click", () => {
        Reminders.saveActiveReminders();
        window.api.openPage('index');
    })
}

window.addEventListener("load", async () => {
    initSettings();
    initBack();
    
    window.api.preferences.addChangeListener("theme", value => {
        window.api.setTheme(value);
    })
});