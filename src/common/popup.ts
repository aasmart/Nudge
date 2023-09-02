function showPopup(title: string, content: string) {
    const popup = document.getElementById("popup") as HTMLDialogElement;

    if(!popup) {
        console.error("No dialog elemetn found");
        return;
    }

    const titleElement = popup.getElementsByClassName("title")[0] as HTMLElement;
    const bodyElement = popup.getElementsByClassName("content")[0] as HTMLElement;

    titleElement.innerText = title;
    bodyElement.innerText = content;

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

export { showPopup }