import { isDocumentFragment } from "./utils";
import selectStyle from '../renderer/assets/style-select.css?inline'

export module OptionsProvider {
    const providers: Record<string, any> = {};
    const changeListeners: Map<string, ((options: Record<string, any>) => void)[]> = new Map();

    /**
     * Sets an option provider or updates an existing one. The update event can be subscribed to by {@link addUpdateListener}. 
     * @param key The name of the key the select menu will look for. For example, "options-from": "fooBar" will look for the key
     *              "fooBar"
     * @param options The options associated with the given key
     */
    export function setOrUpdateProvider(key: string, options: Record<string, any>) {
        providers[key] = options;
        changeListeners.get(key)?.forEach((listener) => {
            listener(options);
        });
    }

    /**
     * Retrieves the options associated with a given key
     * @param key The key to retrieve
     * @returns A record containing the options
     */
    export function getOptions(key: string): Record<string, any> {
        return providers[key];
    }

    /**
     * Adds a callback that is called whenever a provider is changed.
     * @param key The key of the provider to listen to
     * @param callback The callback function
     */
    export function addUpdateListener(key: string, callback: (options: Record<string, any>) => void) {
        if(key in providers && providers[key] === "static")
            throw new Error(`Key '${key}' is static`);
        if(!changeListeners.has(key))
            changeListeners.set(key, []);
        changeListeners.get(key)?.push(callback);
    }

    /**
     * Removes an update listener
     * @param key The key of the listener ot remove
     * @param callback The callback associated with the existing listener
     */
    export function removeUpdateListener(key: string, callback: (options: Record<string, any>) => void): void {
        if(!changeListeners.has(key) || key !in providers)
            throw new Error(`Key '${key}' is not a registered provider`);

        const index = changeListeners.get(key)?.indexOf(callback) ?? -1;
        if(index < 0)
            return;
        changeListeners.set(key, changeListeners.get(key)?.slice(0, index).concat(changeListeners.get(key)?.slice(index + 1) ?? []) || []);
    }
}

/**
 * A custom select menu that supports CSS styling and is programatically filled with options
 * 
 * WHAT THIS DOES NOT YET SUPPORT AS IT HAS NOT BEEN NEEDED (TENATIVE):
 * * Being disabled
 * * 
 */
export class BetterSelectMenu extends HTMLElement {
    selectInput!: HTMLInputElement;
    listbox!: HTMLElement;
    optionIds: string[] = [];
    stateSvg!: SVGElement;
    
    initialSelectedId!: string;

    interactingWithListbox!: boolean;
    searchString!: string | null;

    private static controlKeys = ['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'];

    constructor() {
        super();
    }

    connectedCallback() {
        this.render();

        const input = this.shadowRoot?.getElementById(`${this.id}`);
        if(!input)
            throw new Error("Select menu must have an input");
        this.selectInput = input as HTMLInputElement;

        // Get the container for the options
        const listboxId = this.selectInput.getAttribute("aria-controls") ?? "";
        const listbox = this.shadowRoot?.getElementById(listboxId);
        if(!listbox)
            throw new Error(`Select menu must have a listbox element with the id: ${listboxId}.`);
        this.listbox = listbox;

        const setOptions = (options: Record<string, any>) => {
            const optionStrings = Object.keys(options);

            // Setup all of the options
            this.createOptions(optionStrings, options);
            this.optionIds = Array.from(this.listbox.getElementsByTagName("li")).map(option => option.id);

            // Setup selection stuff
            let selected = this.getSelectedOptionId();
            const defaultSelected = this.selectInput.getAttribute("default-selected");
            if(selected.length == 0) {
                if(defaultSelected !== null)
                    selected = optionStrings.hasOwnProperty(defaultSelected) 
                        ? `${this.selectInput.id}--${defaultSelected}` 
                        : this.optionIds[0] ?? "";
                else
                    selected = this.optionIds[0] ?? "";
            }
            this.setSelectedOption(selected);
        }

        // retrieve options
        const optionsFrom = this.getAttribute("options-from");
        if(!optionsFrom)
            throw new Error("Select menu does not specify option provider");
        const optionsEnum = OptionsProvider.getOptions(optionsFrom);
        
        if(optionsEnum)
            setOptions(optionsEnum);

        this.initialSelectedId = "";
        OptionsProvider.addUpdateListener(optionsFrom, (options: Record<string, any>) => {
            setOptions(options);
            this.initialSelectedId = "";
        });

        // Get the state svg arrow
        const stateSvg = this.shadowRoot?.querySelector("svg");
        if(!stateSvg)
            throw new Error("Select must have an SVG to indicate its expansion state.");
        this.stateSvg = stateSvg as SVGElement;

        // Initialize controls
        this.initControls();
        this.initAutocomplete();

        // Autocomplete controls
        this.interactingWithListbox = false;
        this.searchString = null;

        // why wont this work?
        this.selectInput.addEventListener("change", () => {
            this.dispatchEvent(new Event("change"));
        });
    }

    /**
     * Creates most of the internal HTML for the select menu
     */
    private render() {
        const shadow = this.attachShadow({ mode: "open"});

        const template: HTMLTemplateElement | null = document.querySelector("#select-template");
        if(!template)
            throw new Error("Failed to retrieve select template");

        const clone: Node = template.content.cloneNode(true);
        if(!isDocumentFragment(clone))
            return;

        const listboxWrapper = clone.querySelector(".listbox-wrapper");
        const listboxUl = listboxWrapper?.querySelector("ul");
        listboxUl?.setAttribute("id", this.id + "--listbox");

        const input = clone.querySelector("input");
        input?.setAttribute("aria-controls", `${this.id}--listbox`);
        (input as HTMLInputElement).id = `${this.id}`;

        // I love shadows
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(selectStyle);
        shadow.adoptedStyleSheets = [sheet];

        shadow.appendChild(clone);
    }

    /**
     * Initializes the various controls for the custom select
     */
    private initControls(): void {
        this.selectInput?.addEventListener("mousedown", () => {
            this.selectInput.focus();
            if(!this.getIsExpanded())
                this.resetSearch();
            this.setExpanded(true);
        });
    
        this.stateSvg?.addEventListener("mousedown", e => {
            e.preventDefault();
            this.selectInput.focus();
            if(!this.getIsExpanded())
                this.resetSearch();
            this.setExpanded(!this.getIsExpanded());
        })
    
        this.selectInput?.addEventListener("blur", () => {
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
        this.selectInput.addEventListener("keydown", (e: KeyboardEvent) => {
            const filteredOptions = Array.from(this.listbox.getElementsByTagName("li"))
                .filter(opt => opt.getAttribute("data-filtered") === "false" || !opt.hasAttribute("data-filtered"))
                .map(opt => opt.id);
            
            // Get the index of the currently selected ID and clamp it between 0 and the size of the filtered options
            const selectedIndex = Math.max(
                0, 
                Math.min(
                    filteredOptions.findIndex(opt => opt === this.getSelectedOptionId()),
                    filteredOptions.length
                )
            );

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

            if(BetterSelectMenu.controlKeys.includes(e.key)) {
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
        this.selectInput.addEventListener("keyup", e => {
            if(BetterSelectMenu.controlKeys.includes(e.key) && (e.key !== ' ' || this.interactingWithListbox)) {
                e.preventDefault();
                return;
            } else if(!this.searchString?.length && (e.key === "Tab" || e.key === "Shift"))
                return;

            this.searchString = this.selectInput.value;

            const options = Array.from(this.listbox.getElementsByTagName("li"))
            const matchedOptions = fuzzyMatchOptions(this.searchString, options.map(opt => opt.innerText), 0);

            options.forEach((opt, _) => {
                    const matched = matchedOptions.includes(opt.innerText);
                    opt.setAttribute("data-filtered", `${!matched || matchedOptions.length == 0}`);
            });

            matchedOptions.forEach(optName => {
                    const element = options.find(e => e.innerHTML === optName);
                    if(element)
                        this.listbox.appendChild(element);
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
        this.listbox.replaceChildren(...optionStrings.map((option) => {
            const optionElement = document.createElement("li");
            optionElement.innerText = optionsEnum[option]; // Get enum name as string
            optionElement.setAttribute("value", option);
            optionElement.id = `${this.selectInput.id}--${option}`;
            optionElement.setAttribute("part", "item");
    
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
        
        const options = allOptions;
        const option = options.filter(opt => opt.id === id)[0] ?? null;
        if(!option) {
            console.error(`No option with id \'${id}\'`);
            return;
        }
    
        options.forEach(e => {
            e.setAttribute("selected", "false");
        });
    
        this.selectInput.setAttribute("aria-activedescendant", id);
        option.setAttribute("selected", "true");
        if(option.parentElement)
            option.parentElement.scrollTop = option.offsetTop;

        if(updateInputVisually)
            this.selectInput.value = option.textContent ?? "";
    
        this.selectInput.dispatchEvent(new Event("change"));
    }

    /**
     * Sets the select's currently selected option without being prefixed by the select input's ID
     * @param id The option to set as selected
     * @param updateInputVisually True if the input's value should be updated
     */
    setSelectedOptionWithoutId(id: string, updateInputVisually: boolean = true): void {
        this.setSelectedOption(`${this.selectInput.id}--${id}`, updateInputVisually);
    }

    /**
     * Gets the select's currently selected option's id. If there is none,
     * the ID is blank. This ID will be in the form of `${selectInput.id}--${optionName}`
     * 
     * @returns The currently selected option's ID
     */
    getSelectedOptionId(): string {
        return this.selectInput.getAttribute("aria-activedescendant") ?? "";
    }

    /**
     * @returns The currently selected option's ID without the select input's ID
     */
    getSelectedOptionWithoutId(): string {
        const selectedId = this.selectInput.getAttribute("aria-activedescendant");
        const selected = selectedId?.replace(`${this.selectInput.id}--`, "");
        return selected ?? "";
    }

    /**
     * Sets the expansion state of the select element
     * 
     * @param expand True to expand
     */
    setExpanded(expand: boolean): void {
        if(expand && ((this.selectInput.getAttribute("aria-expanded") ?? 'false') === 'false')) {
            this.initialSelectedId = this.getSelectedOptionId();
            this.interactingWithListbox = false;
        }

        this.selectInput.setAttribute("aria-expanded", `${expand}`);
    }
    
    /**
     * @returns The expansion state of the select
     */
    getIsExpanded(): boolean {
        return this.selectInput.getAttribute("aria-expanded") === "true";
    }

    resetSearch(): void {
        this.searchString = null;

        const options = Array.from(this.listbox.getElementsByTagName("li"));
        options.forEach(option => {
            option.setAttribute("data-filtered", "false");
        });
    }

    reset() {
        this.setSelectedOption(this.optionIds[0]);
        this.initialSelectedId = "";
        this.interactingWithListbox = false;
        this.searchString = null;
    }

    static isBetterSelectMenu(element: HTMLElement | Element): element is BetterSelectMenu {
        return element instanceof BetterSelectMenu;
    };
}

customElements.define("better-select-menu", BetterSelectMenu);

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
// Future todo: convert to dp, but this really isn't necessary atm
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