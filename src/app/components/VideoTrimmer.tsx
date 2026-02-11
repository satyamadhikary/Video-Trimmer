"use client";

import { useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export default function VideoTrimmer() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState("0");
  const [endTime, setEndTime] = useState("5");
  const [loading, setLoading] = useState(false);

  function timeToSeconds(time: string) {
    const parts = time.split(":").map(Number);

    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    }

    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }

    return Number(time);
  }

  const handleTrim = async () => {
    if (!videoFile) return;

    setLoading(true);

    const ffmpeg = new FFmpeg();

    await ffmpeg.load();

    await ffmpeg.writeFile("input.mp4", await fetchFile(videoFile));

    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-ss",
      timeToSeconds(startTime).toString(),
      "-to",
      timeToSeconds(endTime).toString(),
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

  return (
    <div style={{ padding: 20 }}>
      <h2>Simple Video Trimmer</h2>

      <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
      />

      {videoFile && (
        <>
          <video
            src={URL.createObjectURL(videoFile)}
            controls
            width={500}
            style={{ marginTop: 20 }}
            className="h-[200px] w-[500px]"
          />

          <div style={{ marginTop: 20 }}>
            <label>
              Start (sec):
              <input
                type=""
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>

            <label style={{ marginLeft: 20 }}>
              End (sec):
              <input
                type=""
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>

          <button
            onClick={handleTrim}
            disabled={loading}
            style={{ marginTop: 20 }}
          >
            {loading ? "Processing..." : "Download Clip"}
          </button>
        </>
      )}
    </div>
  );
}
