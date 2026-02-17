export const formatTime = (time: number) => {
  if (time < 60) {
    return `${time.toFixed(1)}s`;
  }

  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const formatClockTime = (iso: string) => {
  const date = new Date(iso);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
};

// export const getTimelineSteps = (duration: number) => {
//   // 1 hour boundary
//   if (duration >= 3600) {
//     return {
//       minorStep: 10 * 60, // 10 minutes
//       majorStep: 60 * 60, // 1 hour
//     };
//   }

//   // 30 minute boundary
//   if (duration >= 1800) {
//     return {
//       minorStep: 5 * 60, // 5 minutes between minor ticks
//       majorStep: 10 * 60, // 10 minutes for major tick
//     };
//   }

//   // 10 minute boundary
//   if (duration >= 600) {
//     return {
//       minorStep: 1 * 60, // 1 minutes
//       majorStep: 5 * 60, // 5 minutes
//     };
//   }

//   // Default (short videos)
//   return {
//     minorStep: 2, // 2 seconds
//     majorStep: 10, // 10 seconds
//   };
// };
