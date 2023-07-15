export class SelectMenuElement {
    selectMenuElement: HTMLInputElement;
    selectWrapper: HTMLDivElement;
    listbox: HTMLElement;
    optionIds: string[];
    stateSvg: SVGElement;
    
    initialSelectedId: string;

    isTyping: boolean;
    searchString: string | null;

    constructor(
        selectMenuInputElement: HTMLInputElement,
        optionStrings: string[], 
        optionsEnum: any
    ) {
        this.selectMenuElement = selectMenuInputElement;

        if(!this.selectMenuElement.parentElement)
            throw new Error("Select menu must have parent element.");

        this.selectWrapper = <HTMLDivElement>this.selectMenuElement.parentElement;
        
        const listbox = document.getElementById(`${this.selectMenuElement.id}--listbox`);
        if(!listbox)
            throw new Error(`Select menu must have a listbox element with the id: ${this.selectMenuElement.id}--listbox.`);
        this.listbox = listbox;

        this.createOptions(optionStrings, optionsEnum);
        this.optionIds = Array.from(this.listbox.getElementsByTagName("li")).map(option => option.id);

        const stateSvg = this.selectWrapper.getElementsByTagName("svg")[0];
        if(!stateSvg)
            throw new Error("Select must have an SVG to indicate its expansion state.");
        this.stateSvg = stateSvg;

        let selected = this.getSelectedOptionId();
        if(selected.length == 0)
            selected = this.optionIds[0] ?? "";
        this.setSelectedOption(selected);
        this.initialSelectedId = "";

        this.initControls();

        // Autocomplete controls
        this.isTyping = false;
        this.searchString = null;
    }

    /**
     * Initializes the various controls for the custom select
     */
    private initControls(): void {
        this.selectMenuElement?.addEventListener("mousedown", () => {
            this.selectMenuElement.focus();
            this.setExpanded(true);
            this.resetSearch();
        });
    
        this.stateSvg?.addEventListener("mousedown", e => {
            e.preventDefault();
            this.selectMenuElement.focus();
            this.setExpanded(!this.getIsExpanded());
            this.resetSearch();
        })
    
        this.selectMenuElement?.addEventListener("blur", () => {
            this.setExpanded(false);
            this.setSelectedOption(this.getSelectedOptionId());
            this.resetSearch();
        });

        const controlKeys = ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'];

        /*
        Keyboard controls for the custom select menu:
        - Up and down change the selected option and open the menu if it's closed
        - Enter keeps the selected option and closes the menu
        - Space toggles the visibility and keeps the selected option
        - Escape closes the menu without keeping the selected option
        */
        this.selectMenuElement.addEventListener("keydown", (e: KeyboardEvent) => {
            const filteredOptions = Array.from(this.listbox.getElementsByTagName("li"))
                .filter(opt => opt.getAttribute("data-filtered") === "false")
                .map(opt => opt.id);
            
            // Get the index of the currently selected ID and clamp it between 0 and the size of the filtered options
            const selectedIndex = 
                Math.max(0, Math.min(filteredOptions.findIndex(opt => opt === this.getSelectedOptionId()), filteredOptions.length));

            let newSelectedId: string | null = null;

            switch(e.key) {
                case "ArrowUp":
                    newSelectedId = filteredOptions[selectedIndex - 1] ?? null;
                    this.setExpanded(true);
                    break;
                case "ArrowDown":
                    newSelectedId = filteredOptions[selectedIndex + 1] ?? null;
                    this.setExpanded(true);
                    break;
                case "Enter":
                    this.setExpanded(false);
                    break;
                case " ":
                    // if(!this.isTyping) {
                        this.setExpanded(!this.getIsExpanded());
                    // }
                    break;
                case "Escape":
                    newSelectedId = this.initialSelectedId;
                    this.setExpanded(false);
                    break;
            }

            if(controlKeys.includes(e.key)) {
                if(e.key !== " ")
                    this.isTyping = false;

                if(newSelectedId)
                    this.setSelectedOption(newSelectedId);
                
                e.preventDefault();
                return false;
            }

            return true;
        });
    }

    /**
     * Creates the select's options elements based on a string enum
     * 
     * @param optionStrings The list of the enum names
     * @param optionsEnum The enum itself
     */
    private createOptions(
        optionStrings: string[], 
        optionsEnum: any
    ): void {
        this.listbox.append(...optionStrings.map((option) => {
            const optionElement = document.createElement("li");
            optionElement.innerText = optionsEnum[option]; // Get enum name as string
            optionElement.setAttribute("value", option);
            optionElement.id = `${this.selectMenuElement.id}--${option}`;
    
            optionElement.addEventListener("mousedown", e => {
                // Stop the select menu from being blurred
                e.preventDefault();
    
                this.setSelectedOption(optionElement.id);
                this.setExpanded(false);
                // this.resetSearch();
            })
        
            return optionElement;
        }));
    }
    
    /**
     * Sets the select's currently selected option
     * @param id The option ID to set as selected
     */
    setSelectedOption(id: string): void {
        const allOptions = Array.from(this.listbox.getElementsByTagName("li"));
        SelectMenuElement.setSelectMenuSelectedOption(
            this.selectMenuElement,
            allOptions,
            id
        );
    }

    /**
     * Allows the select menu's value to be set if you have the input element,
     * the options, and the ID you want selected
     * 
     * @param selectMenuElement The input element acting as a select menu
     * @param options The array of select options
     * @param id The id to select
     */
    static setSelectMenuSelectedOption(
        selectMenuElement: HTMLInputElement,
        options: HTMLLIElement[],
        id: string
    ): void {
        const option = options.filter(opt => opt.id === id)[0] ?? null;
        if(!option) {
            console.error(`No option with id \'${id}\'`);
            return;
        }
    
        options.forEach(e => {
            e.setAttribute("selected", "false");
        });
    
        selectMenuElement.setAttribute("aria-activedescendant", id);
        option.setAttribute("selected", "true");
        selectMenuElement.value = option.innerText;
    }

    /**
     * Gets the select's currently selected option's id. If there is none,
     * the ID is blank
     * 
     * @returns The currently selected option's ID
     */
    getSelectedOptionId(): string {
        return this.selectMenuElement.getAttribute("aria-activedescendant") ?? "";
    }

    /**
     * Sets the expansion state of the select element
     * 
     * @param expand True to expand
     */
    setExpanded(expand: boolean): void {
        if(expand)
            this.initialSelectedId = this.getSelectedOptionId();
        // initialSelected = Math.max(optionElements.findIndex(e => {
        //     e.id === selectInput.getAttribute("aria-activedescendant")
        // }), 0);
        this.isTyping = false;

        this.selectMenuElement.setAttribute("aria-expanded", `${expand}`);
    }
    
    /**
     * @returns The expansion state of the select
     */
    getIsExpanded(): boolean {
        return this.selectMenuElement.getAttribute("aria-expanded") === "true";
    }

    resetSearch(): void {
        this.searchString = null;

        const options = Array.from(this.listbox.getElementsByTagName("li"));
        options.forEach(option => {
            option.setAttribute("data-filtered", "false");
        });
    }

    static isCustomSelect(element: HTMLElement): boolean {
        return element as HTMLInputElement && element.getAttribute("role") === "combobox"
    }
}