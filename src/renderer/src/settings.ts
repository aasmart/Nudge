import { Preferences } from "../../common/preferences";
import { Reminders } from "../../common/reminder";

function initTabs() {
    const tabs = Array.from(document.getElementsByClassName("settings-tab"));
    const radios = Array.from(document.getElementsByClassName("settings-tab-radio")) as HTMLInputElement[];

    radios.forEach((radio, index) => {
        const radioTabId = radio.getAttribute("value");

        // Make sure the settings always return to the default thing
        if(index === 0) {
            radio.checked = true;
            tabs.forEach(element => {
                element.setAttribute("visible", `${radioTabId === element.id}`)
            });
        } else
            radio.checked = false;

        radio.addEventListener("change", () => {
            tabs.forEach(element => {
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
    });
}

window.addEventListener("load", async () => {
    document.documentElement.style.setProperty("--nav-foldout-width", "12em");
    initSettings();
    initTabs();
    
    window.api.preferences.addChangeListener("theme", value => {
        window.api.setTheme(value);
    });
});