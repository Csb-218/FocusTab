import { useState, useRef, useEffect } from "react";
import "./FocusMusic.scss";
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaRedo, FaRandom } from 'react-icons/fa';
import { Song } from "../../types/Song";
//songs
import songs from "../../data/songs.json"

const musicList: Song[] = songs;

function MusicPlayer() {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = musicList[currentSongIndex].url;
      audioRef.current.loop = isLooping;
    }
  }, [currentSongIndex, isLooping]);

  useEffect(() => {
    const audio = audioRef.current;
    const handleSongEnd = () => {
      if (autoplay && !isLooping) {
        handleNext();
      }
    };

    audio?.addEventListener('ended', handleSongEnd);
    return () => {
      audio?.removeEventListener('ended', handleSongEnd);
    };
  }, [autoplay, isLooping]);

  const handlePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    setCurrentSongIndex((prev) => (prev + 1) % musicList.length);
    setIsPlaying(true);
    setTimeout(() => audioRef.current?.play(), 0);
  };

  const handlePrev = () => {
    setCurrentSongIndex((prev) => (prev - 1 + musicList.length) % musicList.length);
    setIsPlaying(true);
    setTimeout(() => audioRef.current?.play(), 0);
  };

  const toggleLoop = () => {
    setIsLooping(!isLooping);
    if (audioRef.current) {
      audioRef.current.loop = !isLooping;
    }
  };

  const toggleAutoplay = () => {
    setAutoplay(!autoplay);
  };

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
          <div className="focus_music__settings">
            <button 
              onClick={toggleLoop} 
              className={`focus_music__controls__button ${isLooping ? 'active' : ''}`}
              title="Loop current track"
            >
              <FaRedo />
            </button>
            <button 
              onClick={toggleAutoplay} 
              className={`focus_music__controls__button ${autoplay ? 'active' : ''}`}
              title="Autoplay next track"
            >
              <FaRandom />
            </button>
          </div>
        </div>
        <audio ref={audioRef} />
      </div>
    </div>
  );
}

export default MusicPlayer;