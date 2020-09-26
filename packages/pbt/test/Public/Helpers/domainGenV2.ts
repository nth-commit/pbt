import { property, gen } from 'pbt-0.0.1';

export const seed = () => gen.naturalNumber.unscaled(1_000_000).noShrink();
