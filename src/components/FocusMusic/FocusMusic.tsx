import { useState, useRef, useEffect, useCallback } from "react";
import "./FocusMusic.scss";
import { FaPlay, FaPause, FaStepForward, FaStepBackward } from 'react-icons/fa';
import { Song } from "../../types/Song";
//songs
import songs from "../../data/songs.json"

const musicList: Song[] = songs;

function MusicPlayer() {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = () => {
    if (isPlaying) {
      chrome.runtime.sendMessage({
        type: "pause",
        target: "background",
        source: "popup"
      });
    } else {
      chrome.runtime.sendMessage({
        type: "play",
        target: "background",
        source: "popup",
        url: musicList[currentSongIndex].url,
        loop: true  // Always set loop to true
      });
    }
    setIsPlaying(!isPlaying);
  };


  const handleNext = useCallback(() => {
    const nextIndex = (currentSongIndex + 1) % musicList.length;
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
    chrome.runtime.sendMessage({
      type: "play",
      target: "background",
      source: "popup",
      url: musicList[nextIndex].url
    });
  }, [currentSongIndex]);

  const handlePrev = () => {
    const prevIndex = (currentSongIndex - 1 + musicList.length) % musicList.length;
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true);
    chrome.runtime.sendMessage({
      type: "play",
      target: "background",
      source: "popup",
      url: musicList[prevIndex].url
    });
  };

  useEffect(() => {
    const handleAudioState = (message: any) => {
      // Change from AND to OR since we need either condition
      if (message.target !== 'popup' || message.source !== 'background') return;

      console.log('Popup received message:', message);

      switch (message.type) {
        case 'AUDIO_PLAYING':
          setIsPlaying(true);
          // Find and update current song index
          const songIndex = musicList.findIndex(song => song.url === message.url);
          if (songIndex !== -1) {
            setCurrentSongIndex(songIndex);
          }
          break;
        case 'AUDIO_PAUSED':
          setIsPlaying(false);
          break;
        case 'AUDIO_ENDED':
          setIsPlaying(false);
          break;
      }
    };

    // Add listener for audio state updates
    chrome.runtime.onMessage.addListener(handleAudioState);

    // Request current audio state when popup opens
    chrome.runtime.sendMessage({
      type: 'GET_AUDIO_STATE',
      target: "background",
      source: "popup"
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleAudioState);
    };
  }, [musicList]); // Add musicList as dependency

  return (
    <div className="focus_music">
      <div className="focus_music__content">
        <div className="focus_music__content__header">
          Focus Sounds
        </div>
        <div className="focus_music__now_playing">
          <div className="focus_music__now_playing__info">
            <div className="focus_music__now_playing__info__title">
              {musicList[currentSongIndex].title}
            </div>
            <div className="focus_music__now_playing__info__artist">
              {musicList[currentSongIndex].artist}
            </div>
          </div>
          <div className="focus_music__controls">
            <button onClick={handlePrev} className="focus_music__controls__button">
              <FaStepBackward />
            </button>
            <button onClick={handlePlay} className="focus_music__controls__button focus_music__controls__button--play">
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button onClick={handleNext} className="focus_music__controls__button">
              <FaStepForward />
            </button>
          </div>
        </div>
        <audio ref={audioRef} />
      </div>
    </div>
  );
}

export default MusicPlayer;