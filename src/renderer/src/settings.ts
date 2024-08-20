import { Preferences } from "../../common/preferences";
import { isBetterSelectMenu } from "../../common/selectInputs";
import { addNavFromPageListener, addNavToPageListener } from "./nav";

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
            const storeId = (groupStoreId ?? input.getAttribute("data-store-id") ?? "") as keyof Preferences;

            const storedValue = await window.api.preferences.get(storeId) as Preferences[keyof Preferences];

            switch(type) {
                case "radio": {
                    const value = input.getAttribute("value") as Preferences[keyof Preferences];
                    input.toggleAttribute("checked", value === storedValue);     
                    
                    input.addEventListener("change", () => {
                        window.api.preferences.set(storeId, value ?? "");
                    });
                    break;
                }
                case "checkbox": {
                    input.checked = storedValue as boolean;
                    input.addEventListener("change", () => {
                        window.api.preferences.set(storeId, input.checked);
                    });
                    break;
                }
            }
        });

        // Handle select menus separately since they are special
        const selectMenus = element.getElementsByTagName("better-select-menu");
        Array.from(selectMenus).forEach(async selectMenu => {
            const storeId = (groupStoreId ?? selectMenu.getAttribute("data-store-id") ?? "") as keyof Preferences;
            const storedValue = await window.api.preferences.get(storeId) as Preferences[keyof Preferences];

            if(!isBetterSelectMenu(selectMenu)) return;

            selectMenu.setSelectedOptionWithoutId(storedValue as string);
            selectMenu.addEventListener("change", () => {
                window.api.preferences.set(storeId, selectMenu.getSelectOptionWithoutId());
            });
        });
    });
}

addNavToPageListener("settings", () => {
    document.documentElement.style.setProperty("--nav-foldout-width", "12em");
    document.getElementsByClassName("settings-nav")[0].setAttribute("visible", "true");
    initSettings();
    initTabs();
})

addNavFromPageListener("settings", () => {
    document.documentElement.style.setProperty("--nav-foldout-width", "0em");
    document.getElementsByClassName("settings-nav")[0].setAttribute("visible", "false");
})

window.addEventListener("load", () => {
    window.api.preferences.addChangeListener("theme", value => {
        window.api.setTheme(value);
    });
    
    window.api.preferences.addChangeListener("activityTracking", value => {
        window.api.setActivityDetection(value);
    });
});