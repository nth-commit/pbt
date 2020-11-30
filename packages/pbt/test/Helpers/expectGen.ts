import * as dev from '../../src';

export type GenExpectations<T> = {
  toHaveMinimum: (value: T, predicate: (x: T) => boolean, config?: Partial<dev.MinimalConfig>) => void;
  onMinimum: (predicate: (x: T) => boolean, assertFn: (x: T) => void, config?: Partial<dev.MinimalConfig>) => void;
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
  };
};

export const anyMinimum = (x: unknown) => true;

const findMinimum = <T>(
  gen: dev.Gen<T>,
  predicate: (x: T) => boolean,
  config?: Partial<dev.MinimalConfig>,
): dev.MinimalResult<T> => dev.minimal(gen, predicate, config || {});

const augmentErrorWithDiagnostics = (e: unknown, minimum: dev.MinimalResult<unknown>): void => {
  if (typeof e === 'object' && e !== null) {
    const minimumDetails = `

Repeat configuration: { seed: ${minimum.seed}, size: ${minimum.size} }

Shrinks: ${minimum.shrinks.map((s) => (s as any).toString()).join(', ')}`;

    (e as { message: string }).message += minimumDetails;
  }
};
