"use client";

import { useEffect, useRef, useState } from "react";
import { Range } from "react-range";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { FaPlay } from "react-icons/fa6";
import { IoMdPause } from "react-icons/io";
import ProgressBar from "@ramonak/react-progress-bar";

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
  const [progress, setProgress] = useState(0);

  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      ffmpegRef.current = ffmpeg;
    };
    load();
  }, []);

  // Single timeupdate listener (loop + playhead)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      if (video.currentTime >= values[1]) {
        video.currentTime = values[0];
        if (!video.paused) video.play();
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [values]);

  // Optimized Upload + Conversion
  const handleFileUpload = async (file: File) => {
    if (!ffmpegRef.current) return;

    setIsUploading(true);
    setLoading(true);

    const ffmpeg = ffmpegRef.current;

    ffmpeg.on("progress", ({ progress }) => {
      setProgress(progress);
    });

    try {
      if (file.type === "video/mp4") {
        setProcessedFile(file);
        return;
      }

      const inputExt =
        file.name.substring(file.name.lastIndexOf(".")) || ".mp4";

      const inputName = `input${inputExt}`;
      const outputName = "converted.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      await ffmpeg.exec([
        "-i",
        inputName,
        "-fflags",
        "+genpts",
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "faststart",
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
      console.error("Conversion failed:", error);
    } finally {
      setIsUploading(false);
      setLoading(false);
    }
  };

  // Create preview URL
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

    video.onloadedmetadata = async () => {
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

  const togglePlay = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    if (video.currentTime < values[0] || video.currentTime > values[1]) {
      video.currentTime = values[0];
    }

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  // Optimized Trim (FAST SEEK)
  const handleTrim = async () => {
    if (!processedFile || !ffmpegRef.current) return;

    setLoading(true);
    const ffmpeg = ffmpegRef.current;

    await ffmpeg.writeFile("input.mp4", await fetchFile(processedFile));

    await ffmpeg.exec([
      "-ss",
      values[0].toString(), // Seek BEFORE input (faster)
      "-i",
      "input.mp4",
      "-t",
      (values[1] - values[0]).toString(),
      "-c",
      "copy", // No re-encode
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

  const updateTimeFromPosition = (clientX: number) => {
    if (!timelineRef.current || !videoRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);

    // Map percentage to video time
    let newTime = percentage * duration;

    // Clamp to trim range
    newTime = Math.max(values[0], Math.min(newTime, values[1]));

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPlayhead) return;
      updateTimeFromPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPlayhead, duration]);

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
          Processing video... Please wait..
        </div>
      )}

      {loading && (
        <div className="mt-4">
          <ProgressBar
            completed={Math.round(progress * 100)}
            bgColor="#f97316"
            height="12px"
            isLabelVisible={true}
            labelAlignment="outside"
            labelClassName="text-sm ml-2 w-[20px]"
          />
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
              transition-opacity duration-300"
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

          <div ref={timelineRef} className="relative pointer-events-none">
            <div className="relative w-full h-8 mt-6 flex items-end pointer-events-none select-none">
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
                },
              )}
            </div>

            {/* MOVING PLAYHEAD */}
            <div
              onMouseDown={(e) => {
                setIsDraggingPlayhead(true);
                updateTimeFromPosition(e.clientX);
              }}
              className="absolute top-0 bottom-0 w-0.5 bg-white 
             shadow-[0_0_5px_rgba(0,0,0,0.5)] 
             z-60 cursor-ew-resize pointer-events-auto"
              style={{
                left: `${(currentTime / duration) * 100}%`,
                transition: isDraggingPlayhead ? "none" : "left 0.1s ease-out",
              }}
            >
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rotate-45" />
            </div>

            <div className="flex overflow-hidden mt-5 rounded-lg">
              {thumbnails.map((thumb, i) => (
                <img
                  key={i}
                  src={thumb}
                  className="w-[12.5%] object-cover select-none pointer-events-none"
                  draggable={false}
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
                      className="h-full w-2 bg-orange-500 pointer-events-auto"
                    />
                  );
                }}
              />
            </div>
          </div>

          <div className="mt-3">
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
