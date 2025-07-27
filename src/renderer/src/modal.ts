export function createModal<T extends ModalTemplates>(template: T, params: Omit<Modal<T>, "template">) {
    return {
        template: template,
        ...params
    };
}

function flatten(obj: Record<any, any>) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        return [];
    }
    const entries = Object.entries(obj);
    if (entries.length === 0) {
        return [];
    }
    return entries.reduce((acc: [string, any][], curr) => {
        const res = flatten(curr[1]);
        if (res.length == 0) {
            acc.push(curr);
            return acc;
        }
        const resWithNames = res.map((v: [string, any]) => {
            return [`${curr[0]}_${v[0]}`, v[1]]
        });

        return acc.concat(resWithNames);
    }, []);
}

// realistically a composable interface would have been better for something like this,
// but yk...
window.addEventListener("load", () => {
    const button = document.getElementById("modal-button");
    const modal = document.getElementsByClassName("modal")[0];

    window.api.getModalParams().then(res => {
        const templatePrefix = `modal__${res.template}`;
        const template = document.getElementById(`${res.template}-template`) as HTMLTemplateElement | null;

        if (!template) {
            return;
        }

        const templateClone = template.content.cloneNode(true) as HTMLElement;
        if (!modal.firstChild) {
            return;
        }
        modal.replaceChild(templateClone, modal.firstChild);

        // fill in the arguments in the modal based on the modal__<template>__field
        // naming convention
        const args = flatten(res.templateArgs);
        console.log(args);
        args.forEach((k, _) => {
            const value = k[1];
            const elementId = `${templatePrefix}__${k[0]}`;
            const element = document.getElementById(elementId);

            // elements that can be hidden should have a container
            const containerId = `${elementId}-container`;
            const containerElement = document.getElementById(containerId);
            containerElement?.setAttribute(
                "visible",
                value ? "true" : "false"
            );
            if (!containerElement && !value) {
                console.error("Nullable modal element not within hidable container")
            }

            if (value && element) {
                element.innerText = `${value}`;
            }
        });
    });

    button?.addEventListener("click", () => {
        window.api.hideModal();
    });
})
