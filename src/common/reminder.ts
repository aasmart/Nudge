import { Constants } from "./constants"
import "../common/date"

export enum ReminderNotificationType {
    SYSTEM = "System Notification",
    APP_WINDOW = "App Window Notification",
}

const MAX_TIMER_DELAY_MINS = 24 * 24 * 60;

interface IReminder {
    nextReminder?: Date
    reminderIntervalAmount: number
    reminderStartOverrideAmount: number
    ignoredReminderIntervalAmount: number
    maxIgnoredReminders: number
    ignoredReminders?: number
    isIgnored?: boolean
    notificationType: ReminderNotificationType
    message: string
    title: string
    paused?: boolean
    pausedTime?: Date
}

class ReminderImpl implements IReminder {
    reminderTimeout!: ReturnType<typeof setInterval>
    nextReminder: Date
    reminderIntervalAmount: number
    reminderStartOverrideAmount: number
    ignoredReminderIntervalAmount: number
    maxIgnoredReminders: number
    ignoredReminders: number
    isIgnored: boolean
    notificationType: ReminderNotificationType
    message: string
    title: string
    paused: boolean
    pausedTime: Date

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
    }

    setNextReminderTimeout(delayAmountMinutes: number) {
        clearTimeout(this.reminderTimeout)

        delayAmountMinutes = Math.min(delayAmountMinutes, MAX_TIMER_DELAY_MINS);
        const delayAmount = delayAmountMinutes * Constants.MINUTES_TO_MS
    
        this.reminderTimeout = setTimeout(() => {
            this.sendNotification(this.message)

            // Handles the ignored reminders
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

            this.setNextReminderTimeout(nextReminderDelay)
        }, delayAmount)
    
        this.nextReminder = new Date().addMilliseconds(delayAmount);

        Reminders.saveActiveReminders()
        window.dispatchEvent(new Event('update-reminder-list'))
    }

    private sendNotification(message: string) {
        switch(ReminderNotificationType[this.notificationType]) {
            case ReminderNotificationType.SYSTEM:
                new Notification(this.title, { body: message }).onclick = () => { 
                    if(this === null)
                        return
        
                    if(this.isIgnored)
                        this.setNextReminderTimeout(this.reminderIntervalAmount)
        
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
        this.setNextReminderTimeout(this.reminderIntervalAmount)
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
        } else if(this.paused && !paused) {
            const nextPlay = (new Date(this.nextReminder).valueOf() - new Date(this.pausedTime).valueOf()) * Constants.MS_TO_MINUTES;
            this.setNextReminderTimeout(nextPlay)
        }

        this.paused = paused;

        Reminders.saveActiveReminders()
        window.dispatchEvent(new Event('update-reminder-list'))
    }

    reset() {
        this.isIgnored = false;
        this.paused = false;
        this.setNextReminderTimeout(this.reminderIntervalAmount);
        window.dispatchEvent(new Event('update-reminder-list'));
    }

    toJSON(): IReminder {
        return {
            nextReminder: this.nextReminder,
            reminderIntervalAmount: this.reminderIntervalAmount,
            reminderStartOverrideAmount: this.reminderStartOverrideAmount,
            ignoredReminderIntervalAmount: this.ignoredReminderIntervalAmount,
            maxIgnoredReminders: this.maxIgnoredReminders,
            ignoredReminders: this.ignoredReminders,
            isIgnored: this.isIgnored,
            notificationType: this.notificationType,
            message: this.message,
            title: this.title,
            paused: this.paused,
            pausedTime: this.pausedTime,
        }
    }
}

module Reminders {
    export let activeReminders: ReminderImpl[] = []

    export function saveActiveReminders() {
        sessionStorage.setItem("active_reminders", JSON.stringify(activeReminders))
    }
    
    export function loadActiveReminders() {
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
            reminder.setNextReminderTimeout(nextStart)
        })
    
        saveActiveReminders()
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
}

export { type IReminder, ReminderImpl, Reminders, MAX_TIMER_DELAY_MINS }