declare type ModalTemplates = "nudge" | "simple";
type NudgeModalTemplateArgs = {
    title: string,
    body: string,
    reminder_count: string,
    ignored_reminder: {
        count: string | undefined
        minutes: int | undefined
    } | undefined
}

type SimpleModalTemplateArgs = {
    title: string,
    body: string,
}

declare type Modal<Template extends ModalTemplates> = {
    template: ModalTemplates,
    templateArgs: Template extends "nudge" ? NudgeModalTemplateArgs : Template extends "simple" ? SimpleModalTemplateArgs : never,
    winWidth?: number,
    winHeight?: number,
    intrusive: boolean,
}

