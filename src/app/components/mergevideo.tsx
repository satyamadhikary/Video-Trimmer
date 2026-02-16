"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { useEffect, useRef, useState } from "react";
import { Range } from "react-range";
import { FaPlay } from "react-icons/fa6";
import { IoMdPause } from "react-icons/io";
import { formatTime, getTimelineSteps } from "./ui/formattime";
import Image from "next/image";

const videoSources = [
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part1(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part2(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part3(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part4(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part1(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part2(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part3(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part4(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part1(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part2(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part3(split-video.com).mp4",
  "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part4(split-video.com).mp4",
  //   "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part1(split-video.com).mp4",
  //   "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part2(split-video.com).mp4",
  //   "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part3(split-video.com).mp4",
  //   "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part4(split-video.com).mp4",
];

export default function VideoMerge() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [durations, setDurations] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [values, setValues] = useState([0, 0]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const wasPlayingRef = useRef(false);
  const preloadRef = useRef<HTMLVideoElement | null>(null);
  const isSwitchingVideoRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      ffmpegRef.current = ffmpeg;
    };
    load();
  }, []);

  const cleanupFiles = async (segmentFiles: string[], videoCount: number) => {
    const ffmpeg = ffmpegRef.current!;

    for (const file of segmentFiles) {
      try {
        await ffmpeg.deleteFile(file);
      } catch {}
    }

    for (let i = 0; i < videoCount; i++) {
      try {
        await ffmpeg.deleteFile(`input${i}.mp4`);
      } catch {}
    }

    try {
      await ffmpeg.deleteFile("concat.txt");
    } catch {}
    try {
      await ffmpeg.deleteFile("final.mp4");
    } catch {}
  };

  // Load Durations
  useEffect(() => {
    const loadDurations = async () => {
      const loaded: number[] = [];

      for (let src of videoSources) {
        const video = document.createElement("video");
        video.src = src;
        video.preload = "metadata";

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            loaded.push(video.duration);
            resolve();
          };
        });
      }

      const total = loaded.reduce((sum, d) => sum + d, 0);

      setDurations(loaded);
      setTotalDuration(total);
      setValues([0, total]);
    };

    loadDurations();
  }, []);

  // Global Seek
  const seekToGlobalTime = (time: number, isManual = false) => {
    let accumulated = 0;

    for (let i = 0; i < durations.length; i++) {
      if (time < accumulated + durations[i]) {
        if (!isManual) isSwitchingVideoRef.current = true; // block auto-switch

        setCurrentIndex(i);

        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = time - accumulated;
          }
          if (!isManual) isSwitchingVideoRef.current = false; // release after auto seek
        });

        break;
      }
      accumulated += durations[i];
    }
  };

  // Time Update of Seekbar
  useEffect(() => {
    const video = videoRef.current;
    if (!video || durations.length === 0) return;

    const handleTimeUpdate = () => {
      if (isSwitchingVideoRef.current) return;

      const before = durations
        .slice(0, currentIndex)
        .reduce((sum, d) => sum + d, 0);

      const global = before + video.currentTime;
      setCurrentTime(global);

      if (global >= values[1]) {
        seekToGlobalTime(values[0]);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [currentIndex, durations, values]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      if (wasPlayingRef.current) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener("loadeddata", handleLoaded);
    return () => video.removeEventListener("loadeddata", handleLoaded);
  }, [currentIndex]);

  // Preload the next video of the index
  useEffect(() => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= videoSources.length) return;

    const preloadVideo = document.createElement("video");
    preloadVideo.src = videoSources[nextIndex];
    preloadVideo.preload = "auto";
    preloadVideo.muted = true;

    preloadRef.current = preloadVideo;

    return () => {
      preloadRef.current = null;
    };
  }, [currentIndex]);

  // Thumbnail Genertion Function
  useEffect(() => {
    if (durations.length === 0) return;

    let isCancelled = false;

    const generateThumbnailsForVideo = async (src: string) => {
      const video = document.createElement("video");
      video.src = src;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.preload = "metadata";

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = 320;
      canvas.height = 120;

      const capturePoints = [video.duration * 0.25, video.duration * 0.75];

      for (let point of capturePoints) {
        video.currentTime = point;

        await new Promise<void>((resolve) => {
          video.onseeked = () => {
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = canvas.toDataURL("image/webp", 0.3);

            if (!isCancelled) {
              setThumbnails((prev) => [...prev, image]);
            }

            resolve();
          };
        });
      }
    };

    const generateAll = async () => {
      setThumbnails([]);

      videoSources.forEach((src) => {
        generateThumbnailsForVideo(src);
      });
    };

    generateAll();

    return () => {
      isCancelled = true;
    };
  }, [durations]);

  // Play pause toggle function
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Drag Playhead functions
  const updateTimeFromPosition = (clientX: number) => {
    if (!timelineRef.current || totalDuration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percentage = Math.min(Math.max(offsetX / rect.width, 0), 1);

    let newTime = percentage * totalDuration;
    newTime = Math.max(values[0], Math.min(newTime, values[1]));

    seekToGlobalTime(newTime, true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingPlayhead) return;
      updateTimeFromPosition(e.clientX);
    };

    const handleUp = () => setIsDraggingPlayhead(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDraggingPlayhead, totalDuration, values]);

  // Merge, trim and download using (FFMPEG)
  const handleTrimAndMerge = async () => {
    if (!ffmpegRef.current || durations.length === 0) return;

    setLoading(true);
    const ffmpeg = ffmpegRef.current;

    const start = values[0];
    const end = values[1];

    let accumulated = 0;
    let segmentIndex = 0;
    const segmentFiles: string[] = [];

    // 🔹 TRIM PHASE
    for (let i = 0; i < videoSources.length; i++) {
      const videoStartGlobal = accumulated;
      const videoEndGlobal = accumulated + durations[i];

      const overlapStart = Math.max(start, videoStartGlobal);
      const overlapEnd = Math.min(end, videoEndGlobal);

      if (overlapStart < overlapEnd) {
        const localStart = overlapStart - videoStartGlobal;
        const localDuration = overlapEnd - overlapStart;

        const inputName = `input${i}.mp4`;
        const outputName = `segment${segmentIndex}.mp4`;

        await ffmpeg.writeFile(inputName, await fetchFile(videoSources[i]));

        await ffmpeg.exec([
          "-ss",
          localStart.toString(),
          "-i",
          inputName,
          "-t",
          localDuration.toString(),
          "-c",
          "copy",
          outputName,
        ]);

        segmentFiles.push(outputName);
        segmentIndex++;
      }

      accumulated += durations[i];
    }

    // 🔹 CONCAT PHASE
    const concatFileContent = segmentFiles
      .map((file) => `file '${file}'`)
      .join("\n");

    await ffmpeg.writeFile(
      "concat.txt",
      new TextEncoder().encode(concatFileContent),
    );

    await ffmpeg.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "concat.txt",
      "-c",
      "copy",
      "final.mp4",
    ]);

    setLoading(false);

    const data = await ffmpeg.readFile("final.mp4");

    const blob = new Blob([new Uint8Array(data as Uint8Array)], {
      type: "video/mp4",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "merged-trimmed-video.mp4";
    a.click();

    URL.revokeObjectURL(url);

    setTimeout(() => {
      cleanupFiles(segmentFiles, videoSources.length);
    }, 0);
  };

  return (
    <div style={{ padding: 30, maxWidth: 900 }}>
      <h2 className="text-xl font-bold">Multi Video Trimmer</h2>

      {durations.length > 0 && (
        <>
          <div className="relative group mt-5 h-125">
            <video
              ref={videoRef}
              src={videoSources[currentIndex]}
              width="100%"
              playsInline
              className="w-full rounded-lg h-125 object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                if (currentIndex < videoSources.length - 1) {
                  const nextIndex = currentIndex + 1;

                  isSwitchingVideoRef.current = true; // block playhead updates
                  setCurrentIndex(nextIndex);

                  const handleNextVideoLoaded = () => {
                    isSwitchingVideoRef.current = false; // release lock
                    videoRef.current?.play().catch(() => {});
                    videoRef.current?.removeEventListener(
                      "loadeddata",
                      handleNextVideoLoaded,
                    );
                  };

                  videoRef.current?.addEventListener(
                    "loadeddata",
                    handleNextVideoLoaded,
                  );
                }
              }}
            />

            {/* {isLoading && (
              <div className="mt-4 text-orange-500 font-semibold">
                Processing video... Please wait..
              </div>
            )} */}

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

          {/* TIMELINE */}
          <div ref={timelineRef} className="relative mt-6 pointer-events-none">
            <div className="relative w-full h-8 mt-6 flex items-end pointer-events-none select-none">
              {(() => {
                const { minorStep, majorStep } =
                  getTimelineSteps(totalDuration);

                const totalTicks = Math.floor(totalDuration / minorStep) + 1;

                return Array.from({ length: totalTicks }).map((_, i) => {
                  const currentTickTime = i * minorStep;

                  if (currentTickTime > totalDuration) return null;

                  const isMajorTick = currentTickTime % majorStep === 0;
                  const leftPercent = (currentTickTime / totalDuration) * 100;

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
                            {formatTime(currentTickTime)}
                          </span>
                          <div className="w-0.5 h-2 bg-gray-400"></div>
                        </>
                      ) : (
                        <div className="mb-1">
                          <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            {/* Playhead */}
            <div
              onMouseDown={(e) => {
                setIsDraggingPlayhead(true);
                updateTimeFromPosition(e.clientX);
              }}
              className="absolute top-0 bottom-0 w-0.5 bg-white 
             shadow-[0_0_5px_rgba(0,0,0,0.5)] 
             z-60 cursor-ew-resize pointer-events-auto"
              style={{
                left: `${(currentTime / totalDuration) * 100}%`,
              }}
            >
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rotate-45" />
            </div>

            {/* Thumbnails */}
            <div className="flex w-full mt-5 rounded-lg overflow-hidden select-none pointer-events-none h-14">
              {thumbnails.map((thumb, i) => (
                <div key={i} className="flex-1 select-none pointer-events-none">
                  <Image
                    alt="thumbnail"
                    width={100}
                    height={100}
                    src={thumb}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {/* Trim Range */}
            {totalDuration > 0 && (
              <div className="absolute top-0 left-0 right-0 h-full">
                <Range
                  step={0.1}
                  min={0}
                  max={totalDuration}
                  values={values}
                  onChange={(vals) => {
                    setValues(vals);
                    seekToGlobalTime(vals[0]);
                  }}
                  renderTrack={({ props, children }) => {
                    const trackProps = props as any;
                    const { key, ...rest } = trackProps;
                    const startPercent = (values[0] / totalDuration) * 100;
                    const endPercent = (values[1] / totalDuration) * 100;

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
            )}
          </div>

          <div className="flex items-center justify-between w-full mt-3">
            <div className="flex items-center gap-1">
              <p>Trimmed Part:</p>
              <strong>
                {formatTime(values[0])} - {formatTime(values[1])}
              </strong>
            </div>

            <div className="flex items-center gap-1">
              <p>Total Video Duration:</p>{" "}
              <strong>{formatTime(totalDuration)}</strong>
            </div>
          </div>

          <button
            onClick={handleTrimAndMerge}
            disabled={loading}
            className="mt-4 bg-orange-500 text-white px-4 py-2 rounded cursor-pointer"
          >
            {loading ? "Processing..." : "Download Trimmed Merge"}
          </button>
        </>
      )}
    </div>
  );
}
