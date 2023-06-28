import { Constants } from "./constants"
import "../common/date"

interface IReminder {
    nextReminder?: Date
    reminderIntervalAmount: number
    reminderStartOverrideAmount: number
    ignoredReminderIntervalAmount: number
    maxIgnoredReminders: number
    ignoredReminders?: number
    isIgnored?: boolean
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
        this.message = reminder.message;
        this.title = reminder.title;
        this.paused = reminder.paused || false;
        this.pausedTime = reminder?.pausedTime || new Date();
    }

    setNextReminderTimeout(delayAmountMinutes: number) {
        clearTimeout(this.reminderTimeout)

        const delayAmount = delayAmountMinutes * Constants.MINUTES_TO_MS
    
        this.reminderTimeout = setTimeout(() => {
            this.sendBreakNotification(this.message)

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

    private sendBreakNotification(message: string) {
        new Notification(this.title, { body: message }).onclick =() => { 
            if(this === null)
                return

            if(this.isIgnored)
                this.setNextReminderTimeout(this.reminderIntervalAmount)

            this.isIgnored = false
            window.dispatchEvent(new Event('update-reminder-list'))
            window.api.showWindow('main')
        };
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

    acknowledgeIgnored() {
        this.isIgnored = false
        this.setNextReminderTimeout(this.reminderIntervalAmount)
        window.dispatchEvent(new Event('update-reminder-list'))
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

export { type IReminder, ReminderImpl, Reminders }