import Store, { Schema } from "electron-store";

export interface Preferences {
    theme: string
}

const preferencesSchema: Schema<Preferences> = {
    theme: {
        type: "string",
        enum: ["system", "light", "dark"],
        default: "system"
    }
};
export const preferencesStore = new Store<Preferences>({ preferencesSchema } as any);