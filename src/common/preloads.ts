module Preloads {
    export function clearPreloads() {
        const preloads = document.getElementsByClassName('preload')
        Array.from(preloads).forEach(e => {
            e.classList.toggle('preload', false)
            e.dispatchEvent(new Event("clearPreload"));
        });
    }
}

export { Preloads }