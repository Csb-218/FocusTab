/*
    Proactive timer for wasteful websites.

*/

import { TaggedURL } from "../../types/TaggedURL";
import { insertTimer, removeTimer } from "../DOM_SCRIPTS/Timer";

export class ProactiveTimer {
  tag: number = 0;
  constructor() {
    chrome.storage.onChanged.addListener((changes) => {
      if (this.tag !== 3) {
        return;
      }
      if (changes["enableDistractingSiteTimer"]) {
        const val = changes["enableDistractingSiteTimer"].newValue;
        if (val) {
          removeTimer();
          insertTimer();
        } else {
          removeTimer();
        }
      }
    });
    chrome.storage.local.get(async (res:any) => {
      if (!res) {
        return;
      }
      if (typeof res.enableDistractingSiteTimer !== "boolean") {
        await chrome.storage.local.set({ enableDistractingSiteTimer: false });
        return;
      } else if (!res.enableDistractingSiteTimer) {
        return;
      }
      const websites: TaggedURL[] = res.taggedURLs;
      if (!websites) {
        return;
      }
      const url = window.location.origin;
      for (let i = 0; i < websites.length; i++) {
        if (websites[i].id === url) {
          this.tag = websites[i].tag;
          break;
        }
      }
      if (this.tag !== 3) {
        return;
      }
      const maxTimes = res.maxTimes || ({} as any);
      if (!maxTimes[url]) {
        maxTimes[url] = "20";
        await chrome.storage.local.set({ maxTimes: maxTimes });
      }
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(1);
        }, 2000);
      }); // sleep for 2 seconds
      insertTimer();
    });
  }
}
