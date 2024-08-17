import "../common/htmlElement"
import "../common/htmlFormElement"
import "../common/date"
import { FormInputElement, simplifyInputName } from "../common/htmlFormElement";
import { BetterSelectMenu } from "./selectInputs";

function isInputElement(_obj: any): _obj is FormInputElement  {
    return true;
}

class InputForm {
    formElement: HTMLFormElement
    inputs: Map<String, FormInputElement>
    customSelectInputs: Map<String, BetterSelectMenu>

    constructor(
        formClass: string, 
        onSubmit: (json: unknown) => void, 
        onReset: (e: Event) => void,
    ) {
        this.inputs = new Map();
        this.customSelectInputs = new Map();
        this.formElement = <HTMLFormElement>document.getElementsByClassName(formClass)[0];

        this.formElement.addEventListener('submit', e => {
            e.preventDefault();

            const json = JSON.parse(this.formElement.toJSON());

            // Update custom select menus to use option values, not name
            Array.from(this.inputs.values()).filter(e => {
                return e as HTMLInputElement && e.getAttribute("role") === "combobox";
            }).forEach(select => {
                const selectedId = select.getAttribute("aria-activedescendant");
                const selected = selectedId?.replace(`${select.id}--`, "");

                json[simplifyInputName(select.id)] = selected;
            });

            onSubmit(json);

            return false;
        });

        this.formElement.addEventListener('reset', e => {
            e.preventDefault();
            onReset(e);

            return false;
        });

        const inputElements: Array<FormInputElement>
             = Array.from(this.formElement.querySelectorAll("input, button, textarea, select"))

        inputElements.forEach(e => {
            const id = e.getAttribute('id');
            const type = e.getAttribute('type')

            if(id == null)
                return

            // Handle the error message
            if(isInputElement(e) && type !== "checkbox" && e.getAttribute("role") !== "combobox") {
                const errorMessage = document.createElement('p')
                errorMessage.classList.add('error-message')

                const updateValidationMessage = () => { errorMessage.innerText = e.validationMessage }

                e.insertAdjacentElement("afterend", errorMessage)

                e.onkeyup = updateValidationMessage
                e.onmousedown = updateValidationMessage
                updateValidationMessage()

                e.oninvalid = () => {
                    e.setDirty(true)
                    updateValidationMessage()
                }
            }

            // Add unit selection dropdowns
            const useUnits = e.getAttribute('use-units')
            if(useUnits) {
                switch(useUnits) {
                    case 'time':
                        const units = document.createElement('span')
                        units.id = `${id}-units`
                        units.classList.add('units')
                        e.insertAdjacentElement("afterend", units)

                        units.innerText = "minutes";
                        break;
                }
            }

            switch(type) {
                case 'checkbox':
                    const toggles = e.getAttribute('toggles')
                    if(toggles == null || !(e instanceof HTMLInputElement))
                        break

                    e.onchange = () => { 
                        const input = this.inputs.get(toggles)
                        if(input == null)
                            return;
                        
                        input.disabled = !e.checked
                    }

                    break
                default:
                    break
            }

            e.onkeydown = () => e.setDirty(true)
            e.onmousedown = () => e.setDirty(true)

            this.inputs.set(id, e)
        })
    }

    clear() {
        this.inputs.forEach(input => {
            const type = input.getAttribute('type');
            if(BetterSelectMenu.isCustomSelect(input)) {
                return;
            }

            // add different ways to handle different input types here
            switch(type) {
                case "checkbox":
                    (input as HTMLInputElement).checked = false;
                    break;
                default:
                    input.value = "";
                    input.setDirty(false);
            }
        });

        this.customSelectInputs.forEach(input => input.reset());
    }

    setValue(input: string, value: any) {
        const element: any = this.getInputElement(input)

        if(element == null)
            return

        if(!element.disabled)
            element.value = value.toString();
        else
            element.value = ''
    }

    getValue(input: string, checkActive: boolean = false) {
        if(checkActive && !this.activeAndFilled(input))
            return ''

        return this.getInputElement(input)?.value || ''
    }

    getValueAsNumber(input: string, checkActive: boolean = false) {
        if(checkActive && !this.activeAndFilled(input))
            return ''

        const element = this.getInputElement(input)
        if(!element || !(element instanceof HTMLInputElement))
            return ''

        return element.valueAsNumber
    }

    hasValue(input: string) {
        return (this.inputs.get(input)?.value?.length || 0) > 0
    }

    activeAndFilled(input: string): boolean {
        const inputElement = this.getInputElement(input)
        if(inputElement == null)
            return false;

        return !inputElement.disabled && inputElement.value.length > 0
    }

    setChecked(input: String, checked: boolean) {
        const element = this.inputs.get(input)
        if(!element || !(element instanceof HTMLInputElement) || element.getAttribute('type') !== 'checkbox')
            return
        
        element.checked = checked
        element.dispatchEvent(new Event('change'))
    }

    getInputElement(input: String): FormInputElement | undefined  {
        return this.inputs.get(input) || undefined
    }

    setFromJson(json: string): void {
        const camelCaseRegex = /.([a-z])+/g
    
        // Set all the fields
        const obj = JSON.parse(json);
        for(let key in obj) {
            const id = key.match(camelCaseRegex)?.flatMap(s => s.toLowerCase()).join('-') || ''
            const element = <FormInputElement>document.getElementById(id);

            if(element == null)
                continue

            // 
            if(BetterSelectMenu.isCustomSelect(element)) {
                if(!element.parentElement?.parentElement)
                    continue;
                const options = Array.from(element.parentElement.parentElement.getElementsByTagName("li"));
                const optionId = options.filter(e => e.getAttribute("value")?.endsWith(obj[key]))[0]?.id;
                BetterSelectMenu.setSelectMenuSelectedOption(element as HTMLInputElement, options, optionId)
            } else if(element as HTMLInputElement) {
                if(element.getAttribute("type") === "checkbox" && element)
                    (element as HTMLInputElement).checked = obj[key];
                else
                    element.value = obj[key]
            } else if(element as HTMLTextAreaElement | HTMLSelectElement) {
                element.value = obj[key]
            }
        }

        // Set the toggle checkboxes
        Array.from(this.inputs.values()).forEach(input => {
            const type = input.getAttribute('type') 
            if(type !== 'checkbox')
                return
            
            const toggles = input.getAttribute('toggles')
            if(toggles == null)
                return

            this.setChecked(input.id, this.hasValue(toggles))
        })
    }
}

export { InputForm }