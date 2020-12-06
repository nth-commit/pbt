import { Gen } from 'pbt';
import { NodeId } from '../../src/GenTree/NodeId';
import { NodeIdSet } from '../../src/GenTree/NodeIdSet';

namespace LocalGen {
  export const nodeIdPart = (): Gen<string> =>
    Gen.integer()
      .between(0, 25)
      .noBias()
      .map((x) => String.fromCharCode(x + 65));

  export const nodeId = (allowEmpty: boolean = true): Gen<NodeId> => {
    const baseGen = nodeIdPart().array();
    return allowEmpty ? baseGen : baseGen.ofMinLength(1);
  };
}

test.property('s.has(id), s = empty set, id = any node id *returns* false', LocalGen.nodeId(), (id) => {
  const set = NodeIdSet.create();

  expect(set.has(id)).toBeFalse();
});

test.property('s.add(id).has(id), s = any set, id = any id, *returns* true', LocalGen.nodeId(), (id) => {
  const set = NodeIdSet.create();

  const set0 = set.add(id);

  expect(set0.has(id)).toBeTrue();
});

test.property('add(x).has(y) *where* y is parent of x *returns* false', LocalGen.nodeId(false), (idX) => {
  const set = NodeIdSet.create();
  const idY = NodeId.split(idX)[0];

  const set0 = set.add(idX);

  expect(set0.has(idY)).toBeFalse();
});

test.property(
  's1 = s.add(x).add(y) *where* x is parent of y, s1.has(x) && s1.has(y) *returns* true',
  LocalGen.nodeId(),
  LocalGen.nodeId(),
  (idX, idSuffixY) => {
    const set = NodeIdSet.create();

    const idY = [...idX, ...idSuffixY];
    const set1 = set.add(idX).add(idY);

    expect(set1.has(idX)).toBeTrue();
    expect(set1.has(idY)).toBeTrue();
  },
);

test.property(
  's1 = s.add(x).add(y) *where* x,y share parent, s1.has(x) && s1.has(y) *returns* true',
  LocalGen.nodeId(),
  LocalGen.nodeId(false),
  LocalGen.nodeId(false),
  (idPrefix, idSuffixX, idSuffixY) => {
    const set = NodeIdSet.create();

    const idX = NodeId.join(idPrefix, idSuffixX);
    const idY = NodeId.join(idPrefix, idSuffixY);
    const set1 = set.add(idX).add(idY);

    expect(set1.has(idX)).toBeTrue();
    expect(set1.has(idY)).toBeTrue();
  },
);

test.property('immutability', LocalGen.nodeId(), (id) => {
  const set = NodeIdSet.create();

  set.add(id);

  expect(set.has(id)).toBeFalse();
});
