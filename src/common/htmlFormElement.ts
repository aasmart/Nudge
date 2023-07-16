export {}

declare global {
    interface HTMLFormElement {
        toJSON(): string
    }
}

export type FormInputElement = 
        HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | HTMLSelectElement;

HTMLFormElement.prototype.toJSON = function(): string {
    const formData = new FormData(this)
    const formJson = Object.fromEntries(formData.entries())

    for(let key in formJson) {
        const keyNew = simplifyInputName(key);
        if(keyNew === key)
            continue;
        
        // Replace old keys with the new keys
        if(formJson[key].toString().length > 0)
            formJson[keyNew] = formJson[key]
        delete formJson[key]
    }

    return JSON.stringify(formJson)    
}

export function simplifyInputName(name: string): string {
    const keyArr = name.split("-")
    const keyNew: string = (keyArr.slice(0,1)
        .concat(keyArr.slice(1)
        .flatMap(s => s.substring(0,1).toUpperCase().concat(s.substring(1))))
        ).join("")

    return keyNew;
}
