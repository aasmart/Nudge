export {}

declare global {
    interface HTMLElement {
        setDirty(isDirty: boolean): void
        isDirty(): boolean
    }
}

HTMLElement.prototype.setDirty = function(isDirty: boolean): void {
    if(isDirty)
        this.setAttribute('dirty', '')
    else
        this.removeAttribute('dirty')
}

HTMLElement.prototype.isDirty = function(): boolean {
    return this.getAttribute('dirty') != null
}