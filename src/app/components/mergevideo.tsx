"use client";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { useEffect, useRef, useState } from "react";
import { Range } from "react-range";
import { FaPlay } from "react-icons/fa6";
import { IoMdPause } from "react-icons/io";
import { formatClockTime, formatTime } from "./ui/formattime";
import Image from "next/image";

const videoSources = [
  {
    id: "9e6db6cb-c41c-4735-b37f-ce9262532b27",
    rtspUrl: "rtsp://rtspstream:1ol_d1v5ku3c6R6IbmeCC@zephyr.rtsp.stream/movie",
    status: "RUNNING",
    createdAt: "2026-02-16T10:32:18.142Z",
    chunks: [
      {
        id: "96849ba8-7791-4a95-aa5f-3d4a99cfe35e",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b27",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part1(split-video.com).mp4",
        duration: 60,
        sizeBytes: 67046,
        createdAt: "2026-02-16T10:32:28.533Z",
      },
      {
        id: "dc219123-d69d-43aa-bf2a-378462b743d0",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b27",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part2(split-video.com).mp4",
        duration: 60,
        sizeBytes: 843882,
        createdAt: "2026-02-16T10:34:03.636Z",
      },
      {
        id: "34f1ef88-c51f-422c-9ec3-f5f2b90d4161",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b27",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part3(split-video.com).mp4",
        duration: 60,
        sizeBytes: 958510,
        createdAt: "2026-02-16T10:35:34.132Z",
      },
      {
        id: "229f90b7-e8f7-41b2-bf59-4c7eee74491d",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b27",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part4(split-video.com).mp4",
        duration: 60,
        sizeBytes: 2333267,
        createdAt: "2026-02-16T10:37:24.402Z",
      },
      {
        id: "da0631f5-8eb9-4134-be4d-4a22ce93ecd0",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b27",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part1(split-video.com).mp4",
        duration: 60,
        sizeBytes: 1716194,
        createdAt: "2026-02-16T10:38:44.598Z",
      },
      {
        id: "96849ba8-7791-4a95-aa5f-3d4a99cfe35f",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b28",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part1(split-video.com).mp4",
        duration: 60,
        sizeBytes: 67046,
        createdAt: "2026-02-16T10:40:28.533Z",
      },
      {
        id: "dc219123-d69d-43aa-bf2a-378462b743d1",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b29",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part2(split-video.com).mp4",
        duration: 60,
        sizeBytes: 843882,
        createdAt: "2026-02-16T10:42:03.636Z",
      },
      {
        id: "34f1ef88-c51f-422c-9ec3-f5f2b90d4162",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b26",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part3(split-video.com).mp4",
        duration: 60,
        sizeBytes: 958510,
        createdAt: "2026-02-16T10:44:34.132Z",
      },
      {
        id: "229f90b7-e8f7-41b2-bf59-4c7eee74491e",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b29",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part4(split-video.com).mp4",
        duration: 60,
        sizeBytes: 2333267,
        createdAt: "2026-02-16T10:46:24.402Z",
      },
      {
        id: "da0631f5-8eb9-4134-be4d-4a22ce93ecd2",
        streamId: "9e6db6cb-c41c-4735-b37f-ce9262532b30",
        filePath:
          "https://kfxzpeongnxuojiabmjz.supabase.co/storage/v1/object/public/video%20store/part1(split-video.com).mp4",
        duration: 60,
        sizeBytes: 1716194,
        createdAt: "2026-02-16T10:48:44.598Z",
      },
    ],
  },
];

const allChunks = videoSources.flatMap((v) => v.chunks);

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
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartX = useRef(0);
  const panStartScroll = useRef(0);

  // 2. Define the Window Size (10 minutes)
  const WINDOW_SIZE = 600;

  // Load FFmpeg.wasm once on component mount
  useEffect(() => {
    const load = async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      ffmpegRef.current = ffmpeg;
    };
    load();
  }, []);

  // Load Video Durations (Metadata Only)
  useEffect(() => {
    const loadDurations = async () => {
      const loaded: number[] = [];

      for (let src of videoSources
        .map((v) => v.chunks)
        .flat()
        .map((c) => c.filePath)) {
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

  // Thumbnail Generation
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

      for (const chunk of allChunks) {
        await generateThumbnailsForVideo(chunk.filePath);
      }
    };

    generateAll();

    return () => {
      isCancelled = true;
    };
  }, [durations]);

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

  // Time Tracking Loop of Seekbar
  useEffect(() => {
    const video = videoRef.current;
    if (!video || durations.length === 0) return;

    let animationFrameId: number;

    const update = () => {
      if (!videoRef.current) return;
      const video = videoRef.current;

      if (!isSwitchingVideoRef.current) {
        const before = durations
          .slice(0, currentIndex)
          .reduce((sum, d) => sum + d, 0);

        const global = before + video.currentTime;

        const trimStart = values[0];
        const trimEnd = values[1];

        // ✅ STOP when reaching trim end
        if (global >= trimEnd - 0.01) {
          video.pause();
          setIsPlaying(false);

          // Lock exactly at trimEnd
          seekToGlobalTime(trimEnd, false);
          setCurrentTime(trimEnd);

          return; // 🚫 Stop animation loop
        }

        // Optional safety clamp (if user seeks before trim)
        if (global < trimStart) {
          seekToGlobalTime(trimStart, false);
          setCurrentTime(trimStart);
          animationFrameId = requestAnimationFrame(update);
          return;
        }

        setCurrentTime(global);

        const currentVideoDuration = durations[currentIndex];

        // ✅ Only allow chunk switching if still inside trim
        if (
          video.currentTime >= currentVideoDuration - 0.05 &&
          currentIndex < allChunks.length - 1
        ) {
          isSwitchingVideoRef.current = true;

          const nextIndex = currentIndex + 1;
          const wasPlaying = !video.paused;

          setCurrentIndex(nextIndex);

          requestAnimationFrame(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;

              if (wasPlaying) {
                videoRef.current.play().catch(() => {});
              }
            }

            isSwitchingVideoRef.current = false;
          });

          return;
        }
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentIndex, durations, totalDuration, values]);

  // Auto Resume When Switching Video
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

    if (nextIndex >= allChunks.length) return;

    const preloadVideo = document.createElement("video");
    preloadVideo.src = allChunks[nextIndex].filePath;
    preloadVideo.preload = "auto";
    preloadVideo.muted = true;

    preloadRef.current = preloadVideo;

    return () => {
      preloadRef.current = null;
    };
  }, [currentIndex]);

  // Play pause toggle function
  const togglePlay = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const trimStart = values[0];
    const trimEnd = values[1];

    if (video.paused) {
      if (currentTime >= trimEnd - 0.01) {
        seekToGlobalTime(trimStart, false);
        setCurrentTime(trimStart);
      }

      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };
  
  // Drag Playhead functions
  const updateTimeFromPosition = (clientX: number) => {
    if (
      !timelineRef.current ||
      !scrollContainerRef.current ||
      totalDuration === 0
    )
      return;

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();

    const relativeX = clientX - rect.left;
    const edgeThreshold = rect.width * 0.1;

    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);

    if (relativeX > rect.width - edgeThreshold) {
      autoScrollTimer.current = setInterval(() => {
        container.scrollLeft += 10;
      }, 16);
    } else if (relativeX < edgeThreshold) {
      autoScrollTimer.current = setInterval(() => {
        container.scrollLeft -= 10;
      }, 16);
    }

    const absoluteX = relativeX + container.scrollLeft;
    const timelineTotalWidth = timelineRef.current.offsetWidth;
    const percentage = Math.min(Math.max(absoluteX / timelineTotalWidth, 0), 1);

    let newTime = percentage * totalDuration;
    newTime = Math.max(values[0], Math.min(newTime, values[1]));

    setPreviewTime(newTime);
  };

  // Mouse move and up listeners for dragging playhead
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDraggingPlayhead) return;
      updateTimeFromPosition(e.clientX);
    };

    const handleUp = () => {
      if (!isDraggingPlayhead) return;

      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
        autoScrollTimer.current = null;
      }

      if (previewTime !== null) {
        seekToGlobalTime(previewTime, true);
        setPreviewTime(null);
      }

      setIsDraggingPlayhead(false);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDraggingPlayhead, previewTime]);

  // Timeline panning handlers
  const handlePanStart = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    if ((e.target as HTMLElement).closest(".playhead")) return;

    setIsPanning(true);
    panStartX.current = e.clientX;
    panStartScroll.current = scrollContainerRef.current.scrollLeft;
  };

  const handlePanMove = (e: MouseEvent) => {
    if (!isPanning || !scrollContainerRef.current) return;

    const dx = e.clientX - panStartX.current;
    scrollContainerRef.current.scrollLeft = panStartScroll.current - dx;
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handlePanMove);
    window.addEventListener("mouseup", handlePanEnd);

    return () => {
      window.removeEventListener("mousemove", handlePanMove);
      window.removeEventListener("mouseup", handlePanEnd);
    };
  }, [isPanning]);

  // FFmpeg Cleanup Helper
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
    for (let i = 0; i < allChunks.length; i++) {
      const videoStartGlobal = accumulated;
      const videoEndGlobal = accumulated + durations[i];

      const overlapStart = Math.max(start, videoStartGlobal);
      const overlapEnd = Math.min(end, videoEndGlobal);

      if (overlapStart < overlapEnd) {
        const localStart = overlapStart - videoStartGlobal;
        const localDuration = overlapEnd - overlapStart;

        const inputName = `input${i}.mp4`;
        const outputName = `segment${segmentIndex}.mp4`;

        await ffmpeg.writeFile(
          inputName,
          await fetchFile(allChunks[i].filePath),
        );

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
              src={allChunks[currentIndex]?.filePath}
              width="100%"
              playsInline
              className="w-full rounded-lg h-125 object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
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

          <div
            ref={scrollContainerRef}
            onMouseDown={handlePanStart}
            className="overflow-x-auto [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
            style={{ width: "100%" }}
          >
            {/* TIMELINE */}
            <div
              ref={timelineRef}
              className="relative h-24"
              style={{
                width: `${(totalDuration / WINDOW_SIZE) * 100}%`,
                minWidth: "100%",
              }}
            >
              <div className="relative w-full h-5 mt-10 pointer-events-none select-none ">
                {(() => {
                  let accumulated = 0;
                  const elements: React.ReactNode[] = [];

                  allChunks.forEach((chunk, i) => {
                    const startTime = accumulated;
                    const duration = durations[i] || 0;
                    const endTime = startTime + duration;

                    const leftPercent = (startTime / totalDuration) * 100;
                    const timeLabel = formatClockTime(chunk.createdAt);

                    elements.push(
                      <div
                        key={`major-${chunk.id}`}
                        className="absolute flex flex-col items-center"
                        style={{
                          left: `${leftPercent}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        <span className="text-[10px] text-gray-400 font-bold mb-1">
                          {timeLabel}
                        </span>
                        <div className="w-0.5 h-2 bg-gray-400"></div>
                      </div>,
                    );

                    const minuteStep = 60;

                    for (
                      let t = startTime + minuteStep;
                      t < endTime;
                      t += minuteStep
                    ) {
                      const percent = (t / totalDuration) * 100;

                      elements.push(
                        <div
                          key={`minor-${chunk.id}-${t}`}
                          className="absolute"
                          style={{
                            left: `${percent}%`,
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div className="w-1 h-1 bg-gray-300 rounded-full mt-3"></div>
                        </div>,
                      );
                    }

                    accumulated = endTime;
                  });

                  return elements;
                })()}
              </div>

              {/* Playhead */}
              <div
                onMouseDown={(e) => {
                  e.stopPropagation(); // prevent pan conflict
                  setIsDraggingPlayhead(true);
                  updateTimeFromPosition(e.clientX);
                }}
                className="absolute top-0 bottom-0 w-1 bg-white z-50 cursor-grab pointer-events-auto"
                style={{
                  left: `${
                    ((previewTime ?? currentTime) / totalDuration) * 100
                  }%`,
                }}
              >
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rotate-45" />
              </div>

              {/* Thumbnails */}
              <div className="flex w-full mt-5 rounded-lg overflow-hidden select-none! pointer-events-none h-14">
                {thumbnails.map((thumb, i) => (
                  <div
                    key={i}
                    className="flex-1 select-none! pointer-events-none"
                  >
                    <Image
                      alt="thumbnail"
                      width={100}
                      height={100}
                      src={thumb}
                      className="w-full h-full object-cover select-none! pointer-events-none!"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>

              {/* Trim Range */}
              {totalDuration > 0 && (
                <div className="absolute left-0 right-0 h-14 bottom-0 pointer-events-none">
                  <Range
                    step={0.1}
                    min={0}
                    max={totalDuration}
                    values={values}
                    onChange={(vals) => setValues(vals)}
                    onFinalChange={(vals) => {
                      if (currentTime < vals[0]) {
                        seekToGlobalTime(vals[0], true);
                      } else if (currentTime > vals[1]) {
                        seekToGlobalTime(vals[1], true);
                      }
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
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            rest.onMouseDown?.(e);
                          }}
                          style={{ ...(rest.style || {}) }}
                          className="h-14 w-2 bg-orange-500 pointer-events-auto cursor-ew-resize!"
                        />
                      );
                    }}
                  />
                </div>
              )}
            </div>
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
