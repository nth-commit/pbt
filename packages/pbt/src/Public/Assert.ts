import { Property } from './Property';
import { check } from './Check';

export type AssertConfig = {
  iterations: number;
  seed: number;
  size: number;
  counterexamplePath: string | undefined;
};

export const assert = <Values extends any[]>(property: Property<Values>, config: Partial<AssertConfig> = {}): void => {
  check(property, config);
};
