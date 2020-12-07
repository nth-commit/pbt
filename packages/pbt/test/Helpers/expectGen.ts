import * as dev from '../../src';

export type GenExpectations<T> = {
  toHaveMinimum: (value: T, predicate: (x: T) => boolean, config?: Partial<dev.MinimalConfig>) => void;
  onMinimum: (predicate: (x: T) => boolean, assertFn: (x: T) => void, config?: Partial<dev.MinimalConfig>) => void;
  toEqual: (expectedGen: dev.Gen<T>) => void;
  toEqualConstant: (value: T) => void;
};

export const expectGen = <T>(gen: dev.Gen<T>): GenExpectations<T> => {
  return {
    toHaveMinimum: (value, predicate, config) => {
      const minimum = findMinimum(gen, predicate, config);
      try {
        expect(minimum.value).toEqual(value);
      } catch (e: unknown) {
        augmentErrorWithDiagnostics(e, minimum);
        throw e;
      }
    },
    onMinimum: (predicate, assertFn, config) => {
      const minimum = findMinimum(gen, predicate, config);
      try {
        assertFn(minimum.value);
      } catch (e: unknown) {
        augmentErrorWithDiagnostics(e, minimum);
        throw e;
      }
    },
    toEqual: (expectedGen) => {
      const actualSample = dev.sample(gen, { iterations: 1 });
      const expectedSample = dev.sample(expectedGen, { seed: actualSample.seed, iterations: 1 });
      try {
        expect(actualSample.values[0]).toEqual(expectedSample.values[0]);
      } catch (e: unknown) {
        augmentError(e, renderRepeatConfig(actualSample.seed, actualSample.size));
        throw e;
      }
    },
    toEqualConstant: (value) => {
      const actualSample = dev.sample(gen, { iterations: 1 });
      try {
        expect(actualSample.values[0]).toEqual(value);
      } catch (e: unknown) {
        augmentError(e, renderRepeatConfig(actualSample.seed, actualSample.size));
        throw e;
      }
    },
  };
};

export const anyMinimum = (x: unknown) => true;

const findMinimum = <T>(
  gen: dev.Gen<T>,
  predicate: (x: T) => boolean,
  config?: Partial<dev.MinimalConfig>,
): dev.MinimalResult<T> => dev.minimal(gen, predicate, config || {});

const augmentErrorWithDiagnostics = (e: unknown, minimum: dev.MinimalResult<unknown>): void => {
  augmentError(
    e,
    [
      renderRepeatConfig(minimum.seed, minimum.size),
      `Shrinks: ${minimum.shrinks.map((s) => (s as any).toString()).join(', ')}`,
    ].join('\n\n'),
  );
};

const renderRepeatConfig = (seed: number, size: number) => `Repeat configuration: { seed: ${seed}, size: ${size} }`;

const augmentError = (e: unknown, message: string): void => {
  if (typeof e === 'object' && e !== null) {
    (e as { message: string }).message += '\n\n' + message;
  }
};
