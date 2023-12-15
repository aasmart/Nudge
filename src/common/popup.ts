function createPopupButton(
    content: string,
    action: "primary" | "destructive" = "primary",
    onClick: () => void = () => {}
): HTMLButtonElement {
    const button = <HTMLButtonElement>document.createElement("button");
    button.innerText = content;
    button.setAttribute("formmethod", "dialog");
    button.addEventListener("click", onClick);
    button.setAttribute("action", action);

    return button;
}

function showPopup(
    title: string, 
    content: string,
    buttons: HTMLButtonElement[] = [createPopupButton("Okay")]
) {
    const popup = document.getElementById("popup") as HTMLDialogElement;

    if(!popup) {
        console.error("No dialog elemetn found");
        return;
    }

    const titleElement = popup.getElementsByClassName("title")[0] as HTMLElement;
    const bodyElement = popup.getElementsByClassName("content")[0] as HTMLElement;
    const form = popup.getElementsByTagName("form")[0];

    while(form.lastElementChild)
        form.removeChild(form.lastElementChild);

    titleElement.innerText = title;
    bodyElement.innerText = content;

    buttons.forEach(btn => {
        form.appendChild(btn);
    })

    popup.showModal();
}

// function closePopup() {
//     const popup = document.getElementById("popup") as HTMLDialogElement;

//     if(!popup) {
//         console.error("No dialog elemetn found");
//         return;
//     }
    
//     popup.close();
// }

export { showPopup, createPopupButton }