window.addEventListener("load", () => {
    const title = document.getElementById("modal-title");
    const body = document.getElementById("modal-body");

    if(!title || !body)
        return;

    window.api.getModalParams().then(res => {
        title.innerText = res.title;
        body.innerText = res.message;
    })
})