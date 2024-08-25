import Store, { Schema } from "electron-store";

export type Theme = "system" | "light" | "dark";

export interface Preferences {
    theme: Theme,
    activityTracking: boolean,
    activityDetectionNotificationAudio: string
}

const preferencesSchema: Schema<Preferences> = {
    theme: {
        type: "string",
        enum: ["system", "light", "dark"],
        default: "system"
    },
    activityTracking: {
        type: "boolean",
        default: "true"
    },
    activityDetectionNotificationAudio: {
        type: "string",
        default: ""
    }
};

export const preferencesStore = new Store<Preferences>({ preferencesSchema } as any);