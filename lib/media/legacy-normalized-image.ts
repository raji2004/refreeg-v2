export type LegacyNormalizedCrop = {
  left: number;
  width: number;
};

type RawImage = {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
};

/**
 * Finds the two symmetric full-height seams created by the retired uploader,
 * which placed a sharp portrait over a blurred 16:9 copy of itself.
 */
export function findLegacyNormalizedCenterCrop({
  data,
  width,
  height,
  channels,
}: RawImage): LegacyNormalizedCrop | null {
  if (width < 320 || height < 180 || channels < 3) return null;
  if (Math.abs(width / height - 16 / 9) > 0.025) return null;

  const rowStep = Math.max(1, Math.floor(height / 450));
  const sampledRows = Math.ceil(height / rowStep);
  const scoreCache = new Float64Array(width);

  const boundaryScore = (x: number) => {
    if (scoreCache[x] > 0) return scoreCache[x];
    let difference = 0;

    for (let y = 0; y < height; y += rowStep) {
      const right = (y * width + x) * channels;
      const left = right - channels;
      difference +=
        Math.abs(data[right] - data[left]) +
        Math.abs(data[right + 1] - data[left + 1]) +
        Math.abs(data[right + 2] - data[left + 2]);
    }

    const score = difference / (sampledRows * 3);
    scoreCache[x] = score;
    return score;
  };

  const candidates: Array<{
    left: number;
    right: number;
    leftScore: number;
    rightScore: number;
    score: number;
  }> = [];

  for (
    let left = Math.floor(width * 0.08);
    left <= Math.floor(width * 0.45);
    left += 1
  ) {
    const right = width - left;
    const centerAspect = (right - left) / height;
    if (centerAspect < 0.45 || centerAspect > 1.5) continue;

    const leftScore = boundaryScore(left);
    const rightScore = boundaryScore(right);
    candidates.push({
      left,
      right,
      leftScore,
      rightScore,
      score: leftScore + rightScore,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;

  const runnerUp = candidates.find(
    (candidate) => Math.abs(candidate.left - best.left) > 3,
  );
  const distinctiveness =
    best.score / Math.max(runnerUp?.score ?? 1, 1);
  const balance =
    Math.min(best.leftScore, best.rightScore) /
    Math.max(best.leftScore, best.rightScore);

  if (
    best.score < 55 ||
    best.leftScore < 24 ||
    best.rightScore < 24 ||
    balance < 0.3 ||
    distinctiveness < 1.8
  ) {
    return null;
  }

  return { left: best.left, width: best.right - best.left };
}
