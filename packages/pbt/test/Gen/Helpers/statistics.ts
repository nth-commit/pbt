import { mean, variance, errorFunction } from 'simple-statistics';

const arrayRange = (startIndex: number, endIndex: number): number[] =>
  [...Array(endIndex).keys()].map((x) => x + startIndex);

export const analyzeUniformDistribution = (
  min: number,
  max: number,
  xs: number[],
): {
  uniformMean: number;
  uniformVariance: number;
  sampledMean: number;
  sampleSize: number;
  meanDifference: number;
  sampledZScore: number;
  pValue: number;
} => {
  const uniformMean = min + max / 2;
  const uniformVariance = variance(arrayRange(min, max + 1));

  const sampledMean = mean(xs);
  const sampleSize = xs.length;

  const meanDifference = sampledMean - uniformMean;
  const sampledZScore = meanDifference / Math.sqrt(uniformVariance / sampleSize);

  const sign = Math.sign(sampledZScore);
  const halfErrorMargin = 0.5 * errorFunction(sampledZScore / Math.sqrt(2)) * -sign;
  const oneTailedPValue = 0.5 + halfErrorMargin;
  const twoTailedPValue = oneTailedPValue * 2;

  return {
    uniformMean,
    uniformVariance,
    sampledMean,
    sampleSize,
    meanDifference,
    sampledZScore,
    pValue: twoTailedPValue,
  };
};
