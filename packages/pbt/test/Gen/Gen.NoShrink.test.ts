import fc from 'fast-check';
import { isEmpty } from 'ix/iterable';
import * as devCore from '../../src/Core';
import * as dev from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import { iterateAsTrees } from './Helpers/genRunner';

test('It removes the shrinks (it does what it says on the tin)', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.firstOrderGen(), (runParams, baseGen) => {
      const gen = dev.operators.noShrink(baseGen);

      const trees = iterateAsTrees(gen, runParams);

      trees.forEach((tree) => {
        expect(isEmpty(devCore.Tree.shrinks(tree))).toEqual(true);
      });
    }),
  );
});
