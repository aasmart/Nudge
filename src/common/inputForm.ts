import "../common/htmlElement"
import "../common/htmlFormElement"
import "../common/date"
import { FormInputElement, simplifyInputName } from "../common/htmlFormElement";

function isInputElement(_obj: any): _obj is FormInputElement  {
    return true;
}

class InputForm {
    formElement: HTMLFormElement
    inputs: Map<String, FormInputElement>
    selectInputOptionsProvider: Record<string, any> 

    constructor(
        formClass: string, 
        onSubmit: (json: unknown) => void, 
        onReset: (e: Event) => void,
        selectInputOptionsProvider: Record<string, any> = {}
    ) {
        this.inputs = new Map()
        this.formElement = <HTMLFormElement>document.getElementsByClassName(formClass)[0];
        this.selectInputOptionsProvider = selectInputOptionsProvider

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
            if(isInputElement(e)) {
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

            if(e instanceof HTMLSelectElement || e.getAttribute("role") === "combobox")
                initSelectMenu(e, selectInputOptionsProvider);

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
            if(element as HTMLInputElement && element.getAttribute("role") === "combobox") {
                if(!element.parentElement)
                    continue;
                const options = Array.from(element.parentElement.getElementsByTagName("li"));
                const index = options.findIndex(e => e.getAttribute("value")?.endsWith(obj[key]));
                setSelectMenuSelected(element as HTMLInputElement, options, index)
            } else if(element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
                element.value = obj[key]
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

function initSelectMenu(element: FormInputElement, selectInputOptionsProvider: Record<string, any> = {}) {
    const optionsFrom = element.getAttribute("options-from");
    if(!optionsFrom) {
        console.error(`Select element \'${element.name}\' does not have a valid \'options-from\` attribute.`);
        return;
    }

    // Convert the corresponding enum type to its keys
    const enumObj = selectInputOptionsProvider[optionsFrom];
    const options = Object.keys(enumObj);
    if(!options) {
        console.error(`Failed to find registered select options provider called \'${optionsFrom}\'`);
        return;
    }

    if(element.getAttribute("role") === "combobox") {
        const selectMenuElement = element as HTMLInputElement;
        const listbox = document.getElementById(`${selectMenuElement.id}--listbox`);
        if(!listbox) {
            console.error(`Failed to find a listbox for combobox \'${selectMenuElement.id}\'`);
            return;
        }

        const selectWrapper: HTMLDivElement | null = selectMenuElement.parentElement as HTMLDivElement;
        const stateSvg: SVGElement = selectWrapper.getElementsByTagName("svg")[0];

        selectMenuElement?.addEventListener("mousedown", () => {
            selectMenuElement.focus();
            setSelectMenuExpanded(selectMenuElement, true);
        });

        stateSvg?.addEventListener("mousedown", e => {
            e.preventDefault();
            selectMenuElement.focus();
            setSelectMenuExpanded(selectMenuElement, !isSelectMenuExpanded(selectMenuElement));
        })

        selectMenuElement?.addEventListener("blur", () => {
            setSelectMenuExpanded(selectMenuElement, false);
        });

        let prevSelected = 0;
        let selectedIndex = 0;

        /*
        Keyboard controls for the custom select menu:
        - Up and down change the selected option and open the menu if it's closed
        - Enter keeps the selected option and closes the menu
        - Space toggles the visibility and keeps the selected option
        - Escape closes the menu without keeping the selected option
        */
        (selectMenuElement as HTMLInputElement).addEventListener("keydown", (e: KeyboardEvent) => {
            if(!['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'].includes(e.key))
                return;

            e.preventDefault();

            const allOptions = Array.from(listbox.getElementsByTagName("li"));
            if(e.key === 'ArrowUp') {
                prevSelected = selectedIndex;
                selectedIndex = Math.max(0, selectedIndex - 1);
                setSelectMenuExpanded(selectMenuElement, true);
            } else if(e.key === 'ArrowDown') {
                prevSelected = selectedIndex;
                selectedIndex = Math.min(allOptions.length - 1, selectedIndex + 1);
                setSelectMenuExpanded(selectMenuElement, true);
            } else if(e.key === 'Enter')
                setSelectMenuExpanded(selectMenuElement, false);
            else if(e.key === ' ') {
                setSelectMenuExpanded(selectMenuElement, element.getAttribute("aria-expanded") !== "true" ?? false);
            } else if(e.key === 'Escape') {
                selectedIndex = prevSelected;
                setSelectMenuExpanded(selectMenuElement, false);
            }
            
            setSelectMenuSelected(
                selectMenuElement, 
                allOptions, 
                selectedIndex
            );

            return false;
        });

        // Add all the options to the listbox
        listbox.append(...options.map((option, index) => {
            const optionElement = document.createElement("li");
            optionElement.innerText = enumObj[option]; // Get enum name as string
            optionElement.setAttribute("value", option);
            optionElement.id = `${element.id}--${option}`;

            optionElement.addEventListener("mousedown", e => {
                // Stop the select menu from being blurred
                e.preventDefault();

                const allOptions = Array.from(listbox.getElementsByTagName("li"));
                setSelectMenuSelected(selectMenuElement as HTMLInputElement, allOptions, index);
                setSelectMenuExpanded(selectMenuElement, false);
            })
        
            return optionElement;
        }));

        setSelectMenuSelected(selectMenuElement as HTMLInputElement, Array.from(listbox.getElementsByTagName("li")), selectedIndex);
    } else {
        element.append(...options.map(option => {
            const optionElement = document.createElement("option");
            optionElement.innerText = enumObj[option]; // Get enum name as string
            optionElement.setAttribute("value", option);

            return optionElement;
        }));
    }
}

function setSelectMenuSelected(selectInput: HTMLInputElement, options: HTMLElement[], index: number) {
    const option = options[index];
    if(!option) {
        console.error("Option is null");
        return;
    }

    options.forEach(e => {
        e.setAttribute("selected", "false");
    });

    selectInput.setAttribute("aria-activedescendant", option.id);
    option.setAttribute("selected", "true");
    selectInput.value = option.innerText;
}

function setSelectMenuExpanded(selectInput: HTMLInputElement, expanded: boolean) {
    selectInput.setAttribute("aria-expanded", `${expanded}`);
}

function isSelectMenuExpanded(selectInput: HTMLInputElement): boolean {
    return selectInput.getAttribute("aria-expanded") === "true";
}

export { InputForm }