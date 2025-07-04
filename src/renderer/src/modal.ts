import { countAsString } from "../../common/utils"

window.addEventListener("load", () => {
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const reminderCount = document.getElementById("modal-reminder_count__count");
    const reminderCountContainer = document.getElementById("modal-reminder_count");
    const button = document.getElementById("modal-button");

    if (!title) {
        console.log("Modal title element is null");
        return;
    }
    if (!body) {
        console.log("Modal body element is null");
        return;
    }

    if (!reminderCount) {
        console.log("Modal reminder count element is null");
        return;
    }

    window.api.getModalParams().then(res => {
        title.innerText = res.title;
        body.innerText = res.message;

        reminderCountContainer?.setAttribute(
            "visible",
            res.reminderCount ? "true" : "false"
        );
        if (res.reminderCount) {
            console.log("eeeeee")
            reminderCount.innerText = countAsString(res.reminderCount);
        }
    });

    button?.addEventListener("click", () => {
        window.api.hideModal();
    });
})
