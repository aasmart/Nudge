import { uIOhook } from "uiohook-napi";
import { preferencesStore } from "../common/preferences";

const interactionIntervalMs = 4 * 1000;
const numInteractionIntervals = 10;
const minInteractionIntervals = 6;
class ActivityDetection {
  // if input has occured within at least x of y intervals that are z seconds long,
  // then the user is considered active
  interactionDateTime: Date | undefined = undefined;
  hitInteractionTotal: number = 1;
  interactionTotal: number = 1;

  constructor(win: any) {
    uIOhook.on("input", (_) => {
      if(!this.interactionDateTime) {
        this.interactionDateTime = new Date(new Date().valueOf() + interactionIntervalMs);
        return;
      }

      if(win.isFocused()) {
        this.interactionDateTime = new Date(new Date().valueOf() + interactionIntervalMs);
        this.hitInteractionTotal = 1;
        this.interactionTotal = 1;
        return;
      }
  
      const timeDelta = new Date().valueOf() - this.interactionDateTime.valueOf();
      if(timeDelta >= 0) {
        ++this.hitInteractionTotal;
        this.interactionTotal += Math.floor(timeDelta / interactionIntervalMs) + 1;
        if(this.hitInteractionTotal >= minInteractionIntervals) {
          win.webContents.send("continuous-activity");
          this.hitInteractionTotal = 1;
          this.interactionTotal = 1;
        } else if(this.interactionTotal >= numInteractionIntervals) {
          this.hitInteractionTotal = 1;
          this.interactionTotal = 1;
        }
        this.interactionDateTime = new Date(new Date().valueOf() + interactionIntervalMs);
      }
    });

    if(preferencesStore.get("activityTracking"))
      uIOhook.start();
  }

  reset() {
    this.interactionDateTime = new Date();
    this.hitInteractionTotal = 1;
    this.interactionTotal = 1;
  }
}

export { ActivityDetection }