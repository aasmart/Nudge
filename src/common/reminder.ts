import { Constants } from "./constants"
import "../common/date"

import beepSound from "../renderer/assets/audio/beep-warning.mp3"
import alarmClockAudio from "../renderer/assets/audio/alarm-clock.mp3"
import attentionAudio from "../renderer/assets/audio/call-to-attention.mp3"
import emergencyAlarmAudio from "../renderer/assets/audio/emergency-alarm.mp3"

export enum ReminderNotificationType {
    SYSTEM = "System Notification",
    APP_WINDOW = "App Window Notification",
}

export enum NextReminderDisplayMode {
    EXACT,
    COUNTDOWN
}

const MAX_TIMER_DELAY_MINS = 24 * 24 * 60;

interface IReminder {
    nextReminder?: Date;
    reminderIntervalAmount: number;
    reminderStartOverrideAmount: number;
    ignoredReminderIntervalAmount: number;
    maxIgnoredReminders: number;
    ignoredReminders?: number;
    isIgnored?: boolean;
    notificationType: ReminderNotificationType;
    message: string;
    title: string;
    paused?: boolean;
    pausedTime?: Date;
    reminderAudioId: string;
    nextReminderDisplayMode?: NextReminderDisplayMode;
    pausedActivityNotification: boolean;
    sentPausedActivityNotification?: boolean;
}

type ReminderAudio = {
    name: string;
    id: string;
}

class ReminderImpl implements IReminder {
    reminderTimeout!: ReturnType<typeof setInterval>;
    nextReminder: Date;
    reminderIntervalAmount: number;
    reminderStartOverrideAmount: number;
    ignoredReminderIntervalAmount: number;
    maxIgnoredReminders: number;
    ignoredReminders: number;
    isIgnored: boolean;
    notificationType: ReminderNotificationType;
    message: string;
    title: string;
    paused: boolean;
    pausedTime: Date;
    reminderAudioId: string;
    nextReminderDisplayMode: NextReminderDisplayMode
    pausedActivityNotification: boolean;
    sentPausedActivityNotification: boolean;

    constructor(reminder: IReminder) {
        this.nextReminder = reminder.nextReminder || new Date()
        this.reminderIntervalAmount = reminder.reminderIntervalAmount;
        this.reminderStartOverrideAmount = reminder.reminderStartOverrideAmount
        this.ignoredReminderIntervalAmount = reminder.ignoredReminderIntervalAmount;
        this.maxIgnoredReminders = reminder.maxIgnoredReminders;
        this.ignoredReminders = reminder.ignoredReminders || 0;
        this.isIgnored = reminder.isIgnored || false
        this.notificationType = reminder.notificationType || ReminderNotificationType.SYSTEM;
        this.message = reminder.message;
        this.title = reminder.title;
        this.paused = reminder.paused || false;
        this.pausedTime = reminder?.pausedTime || new Date();
        this.reminderAudioId = reminder.reminderAudioId || "";
        this.nextReminderDisplayMode = reminder.nextReminderDisplayMode || NextReminderDisplayMode.EXACT;
        this.pausedActivityNotification = reminder.pausedActivityNotification || false;
        this.sentPausedActivityNotification = reminder.sentPausedActivityNotification || false;
    }

    setNextReminderDate(delayAmountMinutes: number) {
        delayAmountMinutes = Math.min(delayAmountMinutes, MAX_TIMER_DELAY_MINS);
        const delayAmount = delayAmountMinutes * Constants.MINUTES_TO_MS
        this.nextReminder = new Date().addMilliseconds(delayAmount);
        this.nextReminder.setMilliseconds(0);

        Reminders.saveActiveReminders()
        window.dispatchEvent(new Event('update-reminder-list'))
    }

    isTime(): Boolean {
        return new Date() >= this.nextReminder;
    }

    attemptReminder() {
        if(!this.isTime() || this.paused)
            return;

        if(this.reminderAudioId.length > 0) {
            try {
                const audio = new Audio(this.reminderAudioId);
                audio.play();
            } catch(err) { 
                console.log(err) 
            }
        }
        this.sendNotification(this.message)

        if(this.maxIgnoredReminders && this.ignoredReminders >= this.maxIgnoredReminders) {
            this.isIgnored = false
            this.ignoredReminders = 0
        } else if(this.ignoredReminderIntervalAmount > 0) {
            this.isIgnored = true
            this.ignoredReminders += 1
        }

        const nextReminderDelay = this.isIgnored ? 
            this.ignoredReminderIntervalAmount 
            : this.reminderIntervalAmount

        this.setNextReminderDate(nextReminderDelay)
    }

    private sendNotification(message: string) {
        switch(ReminderNotificationType[this.notificationType]) {
            case ReminderNotificationType.SYSTEM:
                new Notification(this.title, { body: message }).onclick = () => { 
                    if(this === null)
                        return
        
                    if(this.isIgnored)
                        this.setNextReminderDate(this.reminderIntervalAmount)
        
                    this.isIgnored = false
                    window.dispatchEvent(new Event('update-reminder-list'))
                    window.api.showWindow('main')
                };

                break;
            case ReminderNotificationType.APP_WINDOW:
                window.api.showModal({
                    title: this.title,
                    message: this.message,
                });
                break;
            default:
                console.error(`Invalid reminder notification type: ${this.notificationType}`);
                break;
        }
        
    }

    start() {
        this.setNextReminderDate(this.reminderIntervalAmount)
    }

    cancel() {
        if(this.reminderTimeout != null)
            clearTimeout(this.reminderTimeout)
        
        Reminders.saveActiveReminders()
    }

    setPaused(paused: boolean) {
        if(paused) {
            this.cancel()
            this.pausedTime = new Date()
            this.sentPausedActivityNotification = false;
        } else if(this.paused && !paused) {
            const nextPlay = (new Date(this.nextReminder).valueOf() - new Date(this.pausedTime).valueOf()) * Constants.MS_TO_MINUTES;
            this.setNextReminderDate(nextPlay)
        }

        this.paused = paused;

        Reminders.saveActiveReminders()
        window.dispatchEvent(new Event('update-reminder-list'))
    }

    addPausedReminderNotificationHandler() {
        if(!this.sentPausedActivityNotification) {
            window.api.addSingleActivityTrackingListener(() => {
                if(this.paused) {
                    window.api.showModal({
                        title: "Paused Reminders",
                        message: "It looks like you're active at your computer but have paused reminders!" +
                                " You will only receive this message once for the reminders that are currently" +
                                " in a pause state and have this feature enabled."
                    });
                    this.sentPausedActivityNotification = true;
                }
            })
        }
    }

    reset() {
        this.isIgnored = false;
        this.paused = false;
        this.setNextReminderDate(this.reminderIntervalAmount);
        window.dispatchEvent(new Event('update-reminder-list'));
    }

    toJSON(): IReminder {
        return this;
    }
}

module Reminders {
    export let activeReminders: ReminderImpl[] = []

    const updateAllReminders = () => {
        activeReminders.forEach((reminder) => {
            reminder.attemptReminder();
        });
        saveActiveReminders();
    }

    function setReminderCheckTimeout() {
        updateAllReminders();
        
        const nextSecondDate: Date = new Date().addMilliseconds(1000);
        nextSecondDate.setMilliseconds(0);
        const nextSecondDelay = nextSecondDate.valueOf() - Date.now();

        setTimeout(() => {
            setReminderCheckTimeout();
        }, nextSecondDelay);
    }

    export function saveActiveReminders() {
        sessionStorage.setItem("active_reminders", JSON.stringify(activeReminders))
    }
    
    export function loadReminders() {
        let remindersObjs: Array<IReminder> = JSON.parse(sessionStorage.getItem("active_reminders")!) ?? []
    
        activeReminders = remindersObjs.map(obj => {
            const reminder = new ReminderImpl(obj)
            return reminder;
        })
    
        const editReminder = getEditReminder()
    
        activeReminders.forEach(reminder => {
            if((editReminder !== null && reminder === editReminder) || reminder.paused)
                return;
            const nextStart = Math.max(new Date(reminder.nextReminder).valueOf() - new Date().valueOf(), 0) * Constants.MS_TO_MINUTES
            reminder.setNextReminderDate(nextStart)
        })
    
        saveActiveReminders()
        setReminderCheckTimeout();
    }
    
    export function setEditReminder(index: number) {
        sessionStorage.setItem('edit-reminder-index', index.toString())
    }
    
    export function getEditIndex(): number {
        return parseInt(sessionStorage.getItem('edit-reminder-index') || '-1')
    }
    
    export function getEditReminder(): ReminderImpl {
        const editIndex = getEditIndex()
        return activeReminders[editIndex] || null
    }

    // Audio stuff

    function formatAudioName(fileName: string): string {
        let splitName: string[] = fileName.split(/[-_]/)
        splitName = splitName.map(val => {
            return `${val[0].toUpperCase()}${val.substring(1)}`;
        })

        const joined = splitName.join(" ");
        const finalName = joined.substring(0, joined.lastIndexOf("."));

        return finalName;
    }   

    export async function getReminderAudio(): Promise<ReminderAudio[]> {
        const defaultAudio: ReminderAudio[] = [
            {name: "Beep", id: beepSound},
            {name: "Alarm Clock", id: alarmClockAudio},
            {name: "Call to Attention", id: attentionAudio},
            {name: "Emergency Alarm", id: emergencyAlarmAudio}
        ];

        const audioDirectory = `${await window.api.getUserPath()}/audio`;
        
        const audioFiles: string[] = await window.api.readUserDirectory("audio");
        const audio = audioFiles.filter(id => id.length > 0).map((id): ReminderAudio => {
            return {
                name: formatAudioName(id),
                id: `${audioDirectory}/${id}`
            }
        });

        return defaultAudio.concat(audio);
    }
}

export { type IReminder, ReminderImpl, Reminders, type ReminderAudio, MAX_TIMER_DELAY_MINS }