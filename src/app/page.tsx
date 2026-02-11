import Image from "next/image";
import VideoTrimmer from "./components/VideoTrimmer";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black/70">
      <VideoTrimmer />
    </div>
  );
}
