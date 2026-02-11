"use client";

import { useEffect, useRef, useState } from "react";
import { Range } from "react-range";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { FaPlay } from "react-icons/fa6";
import { IoMdPause } from "react-icons/io";

export default function VideoTrimmer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [values, setValues] = useState([0, 0]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Handle video trimming and downloading
  const handleTrim = async () => {
    if (!file) return;

    setLoading(true);

    const ffmpeg = new FFmpeg();
    await ffmpeg.load();

    await ffmpeg.writeFile("input.mp4", await fetchFile(file));

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-ss",
      values[0].toString(),
      "-to",
      values[1].toString(),
      "-c",
      "copy",
      "output.mp4",
    ]);

    const data = await ffmpeg.readFile("output.mp4");

    const blob = new Blob([new Uint8Array(data as Uint8Array)], {
      type: "video/mp4",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "trimmed-video.mp4";
    a.click();

    setLoading(false);
  };

  // Generate thumbnails
  useEffect(() => {
    if (!file) return;

    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.crossOrigin = "anonymous";

    video.onloadedmetadata = async () => {
      setDuration(video.duration);
      setValues([0, video.duration]);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 160;
      canvas.height = 90;

      const thumbs: string[] = [];
      const interval = video.duration / 8; // 8 thumbnails

      for (let i = 0; i < 8; i++) {
        video.currentTime = i * interval;

        await new Promise((res) => {
          video.onseeked = () => {
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL());
            res(null);
          };
        });
      }

      setThumbnails(thumbs);
    };
  }, [file]);

  // Loop video playback between selected start and end times
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= values[1]) {
        video.currentTime = values[0];
        video.play();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [values]);

  // For Toggling Play/Pause when clicking on the video
  const togglePlay = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (video.paused) {
      video.currentTime = values[0];
      video.play();
    } else {
      video.pause();
    }
  };

  // Create Object URL for the selected video file
  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <div style={{ padding: 30, maxWidth: 800 }}>
      <h2>Video Trimmer</h2>

      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      {file && duration > 0 && (
        <>
          <div className="relative group mt-5">
            <video
              ref={videoRef}
              src={videoUrl || ""}
              width="100%"
              playsInline
              className="w-full rounded-lg"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Overlay Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center 
               bg-black/30 opacity-0 group-hover:opacity-100 
               transition-opacity duration-300 cursor-pointer"
            >
              <div className="bg-white/90 rounded-full p-4 shadow-lg">
                {isPlaying ? (
                  <IoMdPause className="text-xl text-black" />
                ) : (
                  <FaPlay className="text-xl text-black" />
                )}
              </div>
            </button>
          </div>

          {/* Thumbnail Strip */}
          <div className="relative">
            <div className="flex overflow-hidden mt-5 rounded-lg pointer-events-none">
              {thumbnails.map((thumb, i) => (
                <img
                  key={i}
                  src={thumb}
                  className="w-[12.5%] object-cover pointer-events-none"
                />
              ))}
            </div>

            {/* Timeline Slider */}
            <div className="absolute top-0 z-50 left-0 right-0 h-full w-full overflow-hidden rounded-lg">
              <Range
                step={0.1}
                min={0}
                max={duration}
                values={values}
                onChange={(vals) => {
                  setValues(vals);
                  if (videoRef.current) {
                    videoRef.current.currentTime = vals[0];
                  }
                }}
                renderTrack={({ props, children }) => {
                  const trackProps = props as any;
                  const { key, ...rest } = trackProps;

                  const startPercent = (values[0] / duration) * 100;
                  const endPercent = (values[1] / duration) * 100;

                  return (
                    <div
                      key={key}
                      {...rest}
                      className="relative h-full w-full"
                      style={{
                        ...(rest.style || {}),
                      }}
                    >
                      {/* LEFT OVERLAY */}
                      <div
                        className="absolute top-0 h-full bg-black/70 pointer-events-none"
                        style={{
                          width: `${startPercent}%`,
                        }}
                      />

                      {/* RIGHT OVERLAY */}
                      <div
                        className="absolute top-0 h-full bg-black/70 pointer-events-none"
                        style={{
                          left: `${endPercent}%`,
                          width: `${100 - endPercent}%`,
                        }}
                      />

                      {/* Children = thumbs */}
                      {children}
                    </div>
                  );
                }}
                renderThumb={({ props }) => {
                  const thumbProps = props as any;
                  const { key, ...rest } = thumbProps;

                  return (
                    <div
                      key={key}
                      {...rest}
                      style={{
                        ...(rest.style || {}),
                      }}
                      className="h-full w-2 bg-orange-500"
                    />
                  );
                }}
              />
            </div>
          </div>

          <div className="mt-2.5">
            <strong>
              {values[0].toFixed(1)}s - {values[1].toFixed(1)}s
            </strong>
          </div>

          <button onClick={handleTrim} disabled={loading} className="mt-5">
            {loading ? "Processing..." : "Download Clip"}
          </button>
        </>
      )}
    </div>
  );
}
