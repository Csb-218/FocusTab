import { AITagging } from "./utils/chatGPT/AITagging";
import { dailyRecap } from "./utils/chatGPT/DailyRecap";
import { WebTime } from "./utils/main/WebTime";

let webTime: WebTime | undefined;

let hasOffscreen = false;

async function createOffscreenDocument(path: string) {
  if (hasOffscreen) return;
  
  try {
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
      documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
      hasOffscreen = true;
      return;
    }

    await chrome.offscreen.createDocument({
      url: path,
      reasons: ['AUDIO_PLAYBACK', 'BLOBS'] as chrome.offscreen.Reason[],
      justification: 'Playing focus music and managing audio state'
    });
    hasOffscreen = true;
    console.log('Created offscreen document');
  } catch (error) {
    console.error('Failed to create offscreen document:', error);
  }
}

// Handle messages from FocusMusic.tsx
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {

  console.log(await chrome.runtime.getContexts({}))

  if(request.target !== "background") return;

  try {
    await createOffscreenDocument('html/offscreen.html');
    
    switch (request.type) {
      case 'play':
        await chrome.runtime.sendMessage({
          type: 'play',
          target: "offscreen",
          source: "background",
          url: request.url,
          volume: 0.9
        });
        break;

      case 'pause':
        await chrome.runtime.sendMessage({
          type: 'pause',
          target: "offscreen",
          source: "background"
        });
        break;

      case 'loop':
        await chrome.runtime.sendMessage({
          type: 'loop',
          target: "offscreen",
          source: "background",
          enabled: request.enabled
        });
        break;

      case 'GET_AUDIO_STATE':
        await chrome.runtime.sendMessage({
          type: 'GET_STATE',
          target: "offscreen",
          source: "background"
        });
        break;
    }
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to handle music control:', error);
    sendResponse({ success: false, error: String(error) });
  }
  return true;
});

// Handle messages from offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.source === "offscreen") {
    // Forward audio state to popup
    chrome.runtime.sendMessage({
      ...message,
      target: "popup",
      source: "background"
    });
  }

  // Handle GET_AUDIO_STATE request from popup
  if (message.type === 'GET_AUDIO_STATE' && message.source === 'popup') {
    chrome.runtime.sendMessage({
      type: 'GET_STATE',
      target: "offscreen",
      source: "background"
    });
  }

  return true;
});

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'DOCUMENT_CLOSED') {
    hasOffscreen = false;
    // Recreate if audio is still playing
    if (message.isPlaying) {
      await createOffscreenDocument('html/offscreen.html');
    }
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.redirect) {
    if (checkDisable()) {
      return;
    }
    chrome.tabs.update(sender.tab!.id!, { url: request.redirect + `?from=${sender.tab?.url}` });
  } else if (request.summarize === "prevDay") {
    dailyRecap()
      .then(function (result) {
        sendResponse({ success: true, result });
      })
      .catch(function (error) {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates that response will be sent asynchronously
  }
});

var isExtensionDisabled: boolean = false;
var isExtensionDisabledOnWeekend: boolean = true;
var isWeekend: boolean = [0, 6].includes(new Date().getDay());

function checkDisable(): boolean {
  return isExtensionDisabled || isExtensionDisabledOnWeekend;
}

async function handleExtensionEnable() {
  isExtensionDisabledOnWeekend =
    ((await chrome.storage.local.get("isDisabledOnWeekend"))
      .isDisabledOnWeekend ||
      false) &&
    isWeekend;
  chrome.storage.local.get("isDisabled", (data) => {
    if (data === undefined) {
      chrome.storage.local.set({ isDisabled: false });
      isExtensionDisabled = false;
      return;
    }
    isExtensionDisabled = data.isDisabled;
    if (webTime) {
      webTime.setDisable(checkDisable());
    }
  });

  chrome.storage.onChanged.addListener(
    async (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes["isDisabled"]) {
        isExtensionDisabled = changes["isDisabled"].newValue;
      }
      if (changes["isDisabledOnWeekend"]) {
        isExtensionDisabledOnWeekend =
          changes["isDisabledOnWeekend"].newValue && isWeekend;
      }
      if (webTime) {
        webTime.setDisable(checkDisable());
      }
    }
  );
}

async function tagWebsite() {
  if (checkDisable()) {
    return;
  }
  await AITagging();
}

handleExtensionEnable();

function loadData() {
  fetch("../data/funny_lines.json").then((response) => {
    response.json().then((data) => {
      chrome.storage.local.set({ funnyLines: data });
    });
  });
  fetch("../data/tagged_urls.json").then((response) => {
    response.json().then((data) => {
      chrome.storage.local.set({ preTaggedUrls: data });
    });
  });
}

chrome.runtime.onInstalled.addListener((reason) => {
  if (reason.reason === "install") {
    chrome.tabs.create({ url: "https://recenter.netlify.app/docs" });
  }
});

async function checkAlarm() {
  let alarm = await chrome.alarms.get("tagWebsite");
  if (alarm) {
    await chrome.alarms.clear("tagWebsite");
  }
  await chrome.alarms.create("tagWebsite", { periodInMinutes: 0.75 });
  alarm = await chrome.alarms.get("updateFocusMode");
  if (!alarm) {
    const scheduledTime = (await chrome.storage.local.get("focusModeEndTime"))
      .focusModeEndTime;
    if (scheduledTime) {
      const time = scheduledTime - new Date().getTime();
      await chrome.alarms.create("updateFocusMode", {
        when: new Date().getTime() + time,
      });
    }
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "tagWebsite") {
    tagWebsite();
  }
  if (alarm.name === "updateFocusMode") {
    await chrome.storage.local.set({ enableSuperFocusMode: false });
    await chrome.storage.local.remove("focusModeEndTime");
    await chrome.storage.local.remove("focusModeDuration");
  }
});

checkAlarm();

chrome.storage.local.get((res:any) => {
  const dailyTime = res.dailyTime || [];
  const weeklyTime = res.weeklyTime || [];
  const monthlyTime = res.monthlyTime || [];
  const hourlyTime = res.hourlyTime || [];
  webTime = new WebTime(
    dailyTime,
    weeklyTime,
    monthlyTime,
    hourlyTime,
    checkDisable()
  );
});

chrome.runtime.onStartup.addListener(() => {});

chrome.action.setBadgeBackgroundColor({ color: [0, 255, 0, 0] });

loadData();

export {};
