import { createPopupButton, showPopup } from "../../common/popup";
import { Reminders } from "../../common/reminder";

export { navPage, addNavFromPageListener, addNavToPageListener };

/*
Only changes the page without changing the navbar
*/
const changePage = (page: string) => { 
    const pages = Array.from(document.getElementsByTagName("main"));
    const currLocation = pages.find(page => page.getAttribute("visible") === "true");
    const nextLocation = document.getElementById(`page-${page}`);

    currLocation?.setAttribute("visible", "false");
    const unload = new Event(`nav-unload-${currLocation?.id.substring(currLocation?.id.indexOf("-") + 1)}`);
    window.dispatchEvent(unload);
    
    nextLocation?.setAttribute("visible", "true");
    const load = new Event(`nav-load-${page}`);
    window.dispatchEvent(load);

    window.sessionStorage.setItem("current-page", page);
};

/*
Updates the currently selected radio button in the nav bar and changes the page
*/
const navPage = (page: string) => { 
    const nextLocation = document.getElementById(`page-${page}`);
    const radios = Array.from(document.getElementsByClassName("nav__app-tab")) as HTMLInputElement[];
    radios.forEach((radio) => {
        const radioAppTabId = radio.getAttribute("value");
        const isPageRadio = nextLocation?.id.endsWith(radioAppTabId || "") ?? false;
        radio.checked = isPageRadio;
    });

    changePage(page);
};

function addNavToPageListener(page: string, consumer: () => void) {
    window.addEventListener(`nav-load-${page}`, consumer);
}

function addNavFromPageListener(page: string, consumer: () => void) {
    window.addEventListener(`nav-unload-${page}`, consumer);
}

function initNav() {
    const radios = Array.from(document.getElementsByClassName("nav__app-tab")) as HTMLInputElement[];

    // this is what we call a probable security vulnerability
    // (initializes all app pages and radio buttons)
    const pages = Array.from(document.getElementsByTagName("main"));
    const locationName = sessionStorage.getItem("current-page");
    radios.forEach(async (radio) => {
        const radioPageId = radio.getAttribute("value");
        // import the html file if it doesn't exist
        if(!pages.find(page => page.id.endsWith(radioPageId || ""))) {
            const data = await window.api.readFile(`src/renderer/${radioPageId}.html`);
            const doc = new DOMParser().parseFromString(data.toString(), "text/html");
            const main = doc.getElementsByTagName("main")[0];
            if(!main) {
                console.error(`Failed to find main in ${radioPageId}.html`);
                return;
            }

            // configure the main element
            main.id = `page-${radioPageId}`;
            main.setAttribute("visible", "false");
            pages[pages.length - 1].insertAdjacentElement("afterend", main);

            pages.push(main);
        }

        // if the current radio is the current page, update the display as such
        const isPageRadio = locationName?.endsWith(radioPageId || "") ?? false;
        if(isPageRadio)
            navPage(locationName ?? "index");

        // Add click listener
        if(radioPageId?.length ?? 0 > 0) {
            radio.addEventListener("change", () => {
                if(Reminders.getEditIndex() !== -1) {
                    // undo the checking of the clicked radio button
                    const currLocation = pages.find(page => page.getAttribute("visible") === "true");
                    const currRadio = radios.find(r => currLocation?.id.endsWith(r.getAttribute("value") || ""));
                    if(currRadio)
                        currRadio.checked = true;
                    showPopup(
                        "Unsaved Changes", 
                        "Are you sure you want to change pages? Any changes will be lost",
                        [
                            createPopupButton("Confirm", "destructive", () => { 
                                navPage(radioPageId ?? "");
                                Reminders.setEditReminder(-1);
                            }),
                            createPopupButton("Cancel")
                        ]
                    );
                } else {
                    changePage(radioPageId ?? "");
                }
            });
        }
    });
}

window.addEventListener("load", () => {
    initNav();
})