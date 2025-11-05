"use client";
import YTPlayer from './components/YTPlayer';
import { useYouTubePlayer } from './components/YouTubePlayerContext';

export default function YTPlayerPage() {
    const { playVideo } = useYouTubePlayer();

    return <YTPlayer onPlayVideo={playVideo} />;
}