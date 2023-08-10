import Store, { Schema } from "electron-store";

export type Theme = "system" | "light" | "dark";

export interface Preferences {
    theme: Theme,
}

const preferencesSchema: Schema<Preferences> = {
    theme: {
        type: "string",
        enum: ["system", "light", "dark"],
        default: "system"
    }
};

export const preferencesStore = new Store<Preferences>({ preferencesSchema } as any);