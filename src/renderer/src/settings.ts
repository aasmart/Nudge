import { Preferences } from "../../common/preferences";
import { Reminders } from "../../common/reminder";

function initTabs() {
    const tabs = document.getElementsByClassName("settings-tab");
    const radios = <HTMLCollectionOf<HTMLInputElement>>document.getElementsByClassName("settings-tab-radio");

    Array.from(radios).forEach(radio => {
        const radioTabId = radio.getAttribute("value");

        radio.addEventListener("change", () => {
            Array.from(tabs).forEach(element => {
                element.setAttribute("visible", `${radioTabId === element.id}`)
            });
        });
    });
}

function initSettings() {
    const fields = document.getElementsByTagName("fieldset");
    Array.from(fields).forEach(element => {
        const groupStoreId = element.getAttribute("data-store-id");
        const inputs = element.getElementsByTagName("input");

        Array.from(inputs).forEach(async input => {
            const type = input.getAttribute("type");
            const storeId = (element.getAttribute("data-store-id") ?? groupStoreId ?? "") as keyof Preferences;

            const storedValue = await window.api.preferences.get(storeId) as Preferences[keyof Preferences];

            switch(type) {
                case "radio":
                    const value = input.getAttribute("value") as Preferences[keyof Preferences];
                    input.toggleAttribute("checked", value === storedValue);     
                    
                    input.addEventListener("change", () => {
                        window.api.preferences.set(storeId, value ?? "");
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
    document.documentElement.style.setProperty("--sidebar-width", "15em");
    initSettings();
    initTabs();
    initBack();
    
    window.api.preferences.addChangeListener("theme", value => {
        window.api.setTheme(value);
    });
});