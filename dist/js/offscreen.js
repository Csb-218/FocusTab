/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
let audioPlayer = document.getElementById('audio-player');
if (!audioPlayer) {
    audioPlayer = document.createElement('audio');
    audioPlayer.id = 'audio-player';
    document.body.appendChild(audioPlayer);
}
// Add event listeners for audio state changes
audioPlayer.addEventListener('ended', () => {
    chrome.runtime.sendMessage({
        target: 'background',
        source: 'offscreen',
        type: 'AUDIO_ENDED',
        url: audioPlayer.src
    });
});
audioPlayer.addEventListener('play', () => {
    chrome.runtime.sendMessage({
        target: 'background',
        source: 'offscreen',
        type: 'AUDIO_PLAYING',
        url: audioPlayer.src
    });
});
audioPlayer.addEventListener('pause', () => {
    chrome.runtime.sendMessage({
        target: 'background',
        source: 'offscreen',
        type: 'AUDIO_PAUSED',
        url: audioPlayer.src
    });
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Offscreen received message:', message);
    if (message.target !== "offscreen")
        return;
    try {
        switch (message.type) {
            case 'play':
                audioPlayer.src = message.url;
                audioPlayer.volume = message.volume || 0.9;
                audioPlayer.loop = true; // Always enable loop
                console.log('Playing audio:', message.url);
                audioPlayer.play()
                    .then(() => {
                    console.log('Audio started playing');
                    sendResponse({ success: true });
                })
                    .catch(error => {
                    console.error('Play failed:', error);
                    sendResponse({ success: false, error: String(error) });
                });
                return true; // Add return true for async operation
            case 'pause':
                audioPlayer.pause();
                console.log('Audio paused');
                sendResponse({ success: true });
                break;
            case 'loop':
                audioPlayer.loop = message.enabled;
                console.log('Loop mode:', message.enabled ? 'enabled' : 'disabled');
                sendResponse({ success: true });
                break;
            case 'GET_STATE':
                if (audioPlayer.src) {
                    chrome.runtime.sendMessage({
                        target: 'background',
                        source: 'offscreen',
                        type: audioPlayer.paused ? 'AUDIO_PAUSED' : 'AUDIO_PLAYING',
                        url: audioPlayer.src,
                        offscreen: true
                    });
                }
                else {
                    chrome.runtime.sendMessage({
                        target: 'background',
                        source: 'offscreen',
                        type: 'AUDIO_PAUSED',
                        offscreen: true
                    });
                }
                sendResponse({ success: true });
                break;
            default:
                console.warn('Unknown message type:', message.type);
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    }
    catch (error) {
        console.error('Audio operation failed:', error);
        sendResponse({ success: false, error: String(error) });
    }
    return true; // Keep message channel open for all cases
});
// Notify background that offscreen is ready
chrome.runtime.sendMessage({
    target: 'background',
    type: 'OFFSCREEN_READY'
});


/******/ })()
;