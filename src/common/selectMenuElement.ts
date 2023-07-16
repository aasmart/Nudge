export class SelectMenuElement {
    selectMenuElement: HTMLInputElement;
    selectWrapper: HTMLDivElement;
    listbox: HTMLElement;
    optionIds: string[];
    stateSvg: SVGElement;
    
    initialSelectedId: string;

    interactingWithListbox: boolean;
    searchString: string | null;

    private static controlKeys = ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'];

    constructor(
        selectMenuInputElement: HTMLInputElement,
        optionStrings: string[], 
        optionsEnum: any
    ) {
        this.selectMenuElement = selectMenuInputElement;
        if(!this.selectMenuElement.parentElement)
            throw new Error("Select menu must have parent element.");

        this.selectWrapper = <HTMLDivElement>this.selectMenuElement.parentElement;
        
        // Get the container for the options
        const listbox = document.getElementById(`${this.selectMenuElement.id}--listbox`);
        if(!listbox)
            throw new Error(`Select menu must have a listbox element with the id: ${this.selectMenuElement.id}--listbox.`);
        this.listbox = listbox;

        // Setup all of the options
        this.createOptions(optionStrings, optionsEnum);
        this.optionIds = Array.from(this.listbox.getElementsByTagName("li")).map(option => option.id);

        // Get the state svg arrow
        const stateSvg = this.selectWrapper.getElementsByTagName("svg")[0];
        if(!stateSvg)
            throw new Error("Select must have an SVG to indicate its expansion state.");
        this.stateSvg = stateSvg;

        // Setup selection stuff
        let selected = this.getSelectedOptionId();
        if(selected.length == 0)
            selected = this.optionIds[0] ?? "";
        this.setSelectedOption(selected);
        this.initialSelectedId = "";

        // Initialize controls
        this.initControls();
        this.initAutocomplete();

        // Autocomplete controls
        this.interactingWithListbox = false;
        this.searchString = null;
    }

    /**
     * Initializes the various controls for the custom select
     */
    private initControls(): void {
        this.selectMenuElement?.addEventListener("mousedown", () => {
            this.selectMenuElement.focus();
            if(!this.getIsExpanded())
                this.resetSearch();
            this.setExpanded(true);
        });
    
        this.stateSvg?.addEventListener("mousedown", e => {
            e.preventDefault();
            this.selectMenuElement.focus();
            if(!this.getIsExpanded())
                this.resetSearch();
            this.setExpanded(!this.getIsExpanded());
        })
    
        this.selectMenuElement?.addEventListener("blur", () => {
            this.setExpanded(false);
            this.setSelectedOption(this.getSelectedOptionId());
        });

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
                    newSelectedId = filteredOptions[selectedIndex - 1] ?? filteredOptions[filteredOptions.length - 1] ?? null;
                    this.setExpanded(true);
                    break;
                case "ArrowDown":
                    newSelectedId = filteredOptions[selectedIndex + 1] ?? filteredOptions[0] ?? null;
                    this.setExpanded(true);
                    break;
                case "Enter":
                    newSelectedId = this.getSelectedOptionId();
                    this.setExpanded(false);
                    break;
                case " ":
                    const expanded = this.getIsExpanded();
                    if(this.interactingWithListbox || !expanded) 
                        this.setExpanded(!expanded);

                    if(!expanded) {
                        this.interactingWithListbox = true;
                        this.resetSearch();
                    }
                    break;
                case "Escape":
                    newSelectedId = this.initialSelectedId;
                    this.setExpanded(false);
                    break;
            }

            if(SelectMenuElement.controlKeys.includes(e.key)) {
                if(e.key !== " ")
                    this.interactingWithListbox = true;

                if(newSelectedId)
                    this.setSelectedOption(newSelectedId);
                
                if(this.interactingWithListbox)
                    e.preventDefault();
                return false;
            }

            return true;
        });
    }

    /**
     * Initializes the select menu's autocomplete functionality
     */
    private initAutocomplete() {
        this.selectMenuElement.addEventListener("keyup", e => {
            if(SelectMenuElement.controlKeys.includes(e.key) && (e.key !== ' ' || this.interactingWithListbox)) {
                e.preventDefault();
                return;
            } else if(!this.searchString?.length && (e.key === "Tab" || e.key === "Shift"))
                return;

            this.searchString = this.selectMenuElement.value;

            const options = Array.from(this.listbox.getElementsByTagName("li"))
            const matchedOptions = fuzzyMatchOptions(this.searchString, options.map(opt => opt.innerText), 0);

            options.reverse()
                    .forEach((opt, _) => {
                        const matched = matchedOptions.includes(opt.innerText);
                        opt.setAttribute("data-filtered", `${!matched || matchedOptions.length == 0}`);

                        if(matched)
                            this.listbox.appendChild(opt);
                    });

            if(matchedOptions.length > 0) {
                const filteredOptions = Array.from(this.listbox.getElementsByTagName("li"))
                    .filter(opt => opt.getAttribute("data-filtered") === "false")
                    .map(opt => opt.id);

                /* If the filtered options does not have the currently selected option,
                set it to the first filtered option */
                const currentSelectedOptionId = this.getSelectedOptionId();
                if(!filteredOptions.find(id => id === currentSelectedOptionId)) {
                    this.setSelectedOption(
                        filteredOptions[0],
                        false
                    )
                }
            } 

            this.setExpanded(true);
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
            })
        
            return optionElement;
        }));
    }
    
    /**
     * Sets the select's currently selected option
     * @param id The option ID to set as selected
     * @param updateInputVisually True if the input's value should be updated
     */
    setSelectedOption(id: string, updateInputVisually: boolean = true): void {
        const allOptions = Array.from(this.listbox.getElementsByTagName("li"));
        SelectMenuElement.setSelectMenuSelectedOption(
            this.selectMenuElement,
            allOptions,
            id,
            updateInputVisually
        );
    }

    /**
     * Allows the select menu's value to be set if you have the input element,
     * the options, and the ID you want selected
     * 
     * @param selectMenuElement The input element acting as a select menu
     * @param options The array of select options
     * @param id The id to select
     * @param updateInputVisually True if the input's value should be updated
     */
    static setSelectMenuSelectedOption(
        selectMenuElement: HTMLInputElement,
        options: HTMLLIElement[],
        id: string,
        updateInputVisually: boolean = true
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
        if(option.parentElement)
            option.parentElement.scrollTop = option.offsetTop;

        if(updateInputVisually)
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
        if(expand) {
            this.initialSelectedId = this.getSelectedOptionId();
            this.interactingWithListbox = false;
        }

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

/**
 * Fuzzy matching for the select menu. Returns an array of option values sorted in
 * descending order based on their distances
 * 
 * @param queryString The string to search for
 * @param strings A list of strings to search
 * @param min The minimum weight to return
 * @returns The list of sorted strings matching queryString
 */
function fuzzyMatchOptions(
    queryString: string, 
    strings: string[],
    min: number
): string[] {
    // Calculate the distances for each string
    const distances = strings.map(str => {
        const dist = levenshteinDistance(queryString.toLowerCase(), str.toLowerCase());
        return 1 - (dist / Math.max(queryString.length, str.length));
    });

    const max = distances.reduce((prev, curr) => prev = Math.max(prev, curr));
    const minDistance = Math.max(Math.pow(2, max) - 1, min);
    
    /* Takes the matched strings and filters out the ones with distances
    greater than min distance, sorts them, and then returns their names */
    const matches = strings
        .map((val, i) => [val, distances[i]])
        .filter(pair => {
            const [_, distance] = pair;
            if(typeof(distance) === 'number')
                return distance >= minDistance
            return false;
        })
        .sort(([_a, aDist], [_b, bDist]) => {
            if(typeof(aDist) === "number" && typeof(bDist) === "number")
                return bDist - aDist;
            return -1;
        })
        .map(([id, _]) => id as string);

    return matches;
}

// https://en.wikipedia.org/wiki/Levenshtein_distance
function levenshteinDistance(str1: string, str2: string) {
    let v0: number[] = [];
    let v1: number[] = [];

    // Initializes v0 with 
    for(let i = 0; i < str2.length; i++)
        v0[i] = i;

    for(let i = 0; i < str1.length - 1; i++) {
        v1[0] = i + 1;
        for(let j = 0; j < str2.length - 1; j++) {
            const deletionCost = v0[j + 1] + 1;
            const insertionCost = v1[j] + 1;
            const substitutionCost = str1[i] === str2[j] ? v0[j] : v0[j] + 1;

            v1[j + 1] = Math.min(Math.min(deletionCost, insertionCost), substitutionCost);
        }

        [v0, v1] = [v1, v0];
    }

    return v0[str2.length - 1];
}