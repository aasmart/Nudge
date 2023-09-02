export { };

window.addEventListener("load", () => {
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");
    const button = document.getElementById("modal-button");

    if(!title || !body)
        return;

    window.api.getModalParams().then(res => {
        title.innerText = res.title;
        body.innerText = res.message;
    });

    button?.addEventListener("click", () => {
        window.api.hideModal();
    });
})