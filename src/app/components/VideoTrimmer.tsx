"use client";

import { useEffect, useRef, useState } from "react";
import { Range } from "react-range";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { FaPlay } from "react-icons/fa6";
import { IoMdPause } from "react-icons/io";

export default function VideoTrimmer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [values, setValues] = useState([0, 0]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime); // Update playhead position

      // Handle Looping logic
      if (video.currentTime >= values[1]) {
        video.currentTime = values[0];
        if (!video.paused) video.play();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [values]);

  // Load FFmpeg
  useEffect(() => {
    const load = async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      ffmpegRef.current = ffmpeg;
    };
    load();
  }, []);

  // Convert ANY format to MP4
  const handleFileUpload = async (file: File) => {
    if (!ffmpegRef.current) return;

    setIsUploading(true); // START upload loading
    setLoading(true);

    try {
      const ffmpeg = ffmpegRef.current;

      const inputExt =
        file.name.substring(file.name.lastIndexOf(".")) || ".mp4";
      const inputName = `input${inputExt}`;
      const outputName = "converted.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      await ffmpeg.exec([
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "faststart",
        "-pix_fmt",
        "yuv420p",
        "-profile:v",
        "baseline",
        "-level",
        "3.0",
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);

      const blob = new Blob([new Uint8Array(data as Uint8Array)], {
        type: "video/mp4",
      });

      const convertedFile = new File([blob], "video.mp4", {
        type: "video/mp4",
      });

      setProcessedFile(convertedFile);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false); // END upload loading
      setLoading(false);
    }
  };

  // Generate preview URL
  useEffect(() => {
    if (!processedFile) return;

    const url = URL.createObjectURL(processedFile);
    setVideoUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [processedFile]);

  // Generate thumbnails
  useEffect(() => {
    if (!processedFile) return;

    const video = document.createElement("video");
    const url = URL.createObjectURL(processedFile);
    video.src = url;

    video.onerror = () => {
      console.error("Failed to load video");
      console.error("Video error code:", video.error);
    };

    video.onloadedmetadata = async () => {
      console.log("Metadata loaded");
      console.log("Duration:", video.duration);
      setDuration(video.duration);
      setValues([0, video.duration]);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 160;
      canvas.height = 90;

      const thumbs: string[] = [];
      const interval = video.duration / 8;

      for (let i = 0; i < 8; i++) {
        video.currentTime = i * interval;
        await new Promise((res) => {
          video.onseeked = () => {
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL("image/jpeg"));
            res(null);
          };
        });
      }

      setThumbnails(thumbs);
      URL.revokeObjectURL(url);
    };
  }, [processedFile]);

  // Loop playback between selected range
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
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [values]);

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

  // Trim MP4 → MP4
  const handleTrim = async () => {
    if (!processedFile || !ffmpegRef.current) return;

    setLoading(true);
    const ffmpeg = ffmpegRef.current;

    await ffmpeg.writeFile("input.mp4", await fetchFile(processedFile));

    await ffmpeg.exec([
      "-ss",
      values[0].toString(),
      "-to",
      values[1].toString(),
      "-i",
      "input.mp4",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-movflags",
      "faststart",
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

  return (
    <div style={{ padding: 30, maxWidth: 800 }}>
      <h2>Video Trimmer</h2>

      <input
        type="file"
        disabled={isUploading}
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/3gpp,.3gp,.3gpp,video/*"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) handleFileUpload(selected);
        }}
      />

      {isUploading && (
        <div className="mt-4 text-orange-500 font-semibold">
          Video Uploading... Please wait..
        </div>
      )}

      {processedFile && duration > 0 && (
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

          <div className="relative">
            <div className="relative w-full h-8 mt-6 flex items-end">
              {Array.from({ length: Math.floor(duration / 2) + 1 }).map(
                (_, i) => {
                  const currentTime = i * 2;
                  const isMajorTick = currentTime % 10 === 0;
                  const leftPercent = (currentTime / duration) * 100;

                  // Don't render if it exceeds the actual video duration
                  if (currentTime > duration) return null;

                  return (
                    <div
                      key={i}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${leftPercent}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      {isMajorTick ? (
                        <>
                          <span className="text-[10px] text-gray-400 font-bold mb-1">
                            {currentTime}s
                          </span>
                          <div className="w-0.5 h-2 bg-gray-400"></div>
                        </>
                      ) : (
                        <div className="mb-1">
                          {/* Small dot for 2s, 4s, 6s, 8s marks */}
                          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>

            {/* MOVING PLAYHEAD (Auto-run seek) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_5px_rgba(0,0,0,0.5)] z-[60] pointer-events-none"
              style={{
                left: `${(currentTime / duration) * 100}%`,
                transition: isPlaying ? "none" : "left 0.1s ease-out", // Smooth transition when paused/seeking
              }}
            >
              {/* Optional: Small triangle/handle at the top of playhead */}
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rotate-45" />
            </div>
            <div className="flex overflow-hidden mt-5 rounded-lg pointer-events-none">
              {thumbnails.map((thumb, i) => (
                <img
                  key={i}
                  src={thumb}
                  className="w-[12.5%] object-cover pointer-events-none"
                />
              ))}
            </div>
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
                      {...props}
                      className="relative h-full w-full"
                    >
                      <div
                        className="absolute top-0 h-full bg-black/70"
                        style={{ width: `${startPercent}%` }}
                      />
                      <div
                        className="absolute top-0 h-full bg-black/70"
                        style={{
                          left: `${endPercent}%`,
                          width: `${100 - endPercent}%`,
                        }}
                      />
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
                      style={{ ...(rest.style || {}) }}
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
