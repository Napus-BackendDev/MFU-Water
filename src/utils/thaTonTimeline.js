export function compatibleAfterFrames(frames, beforeIndex) {
  const before = frames[beforeIndex];
  if (!before) return [];
  return frames.filter((frame, index) => index > beforeIndex &&
    frame.orbitPass === before.orbitPass && Number(frame.relativeOrbit) === Number(before.relativeOrbit));
}

export function selectDefaultPair(frames, eventDate = '2024-09-11') {
  const pairs = [];
  frames.forEach((before, beforeIndex) => {
    compatibleAfterFrames(frames, beforeIndex).forEach((after) => {
      const afterIndex = frames.indexOf(after);
      const beforeDay = before.acquiredAt.slice(0, 10);
      const afterDay = after.acquiredAt.slice(0, 10);
      if (beforeDay < eventDate && afterDay >= eventDate) {
        pairs.push({ beforeIndex, afterIndex, beforeDay, afterDay });
      }
    });
  });
  pairs.sort((a, b) => b.beforeDay.localeCompare(a.beforeDay) || a.afterDay.localeCompare(b.afterDay));
  return pairs[0] ? { beforeIndex: pairs[0].beforeIndex, afterIndex: pairs[0].afterIndex } : null;
}
