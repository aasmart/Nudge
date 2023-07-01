async function fetchSvgOrAsImage(path: string): Promise<SVGElement | HTMLImageElement> {
    return fetch(path)
        .then(res => res.text())
        .then(text => new DOMParser().parseFromString(text, "text/xml"))
        .then(html => html.getElementsByTagName("svg")[0])
        .catch(() => {
            const img = document.createElement("img");
            img.src = path;

            return img;
        })
}

export { fetchSvgOrAsImage }