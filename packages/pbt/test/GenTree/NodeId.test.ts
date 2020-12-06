import { Gen } from 'pbt';
import { NodeId, NodeIdPart } from '../../src/GenTree/NodeId';

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

  export const siblingNodeIds = (): Gen<[NodeId, NodeId]> => {
    return Gen.zip(nodeId(), nodeIdPart(), nodeIdPart())
      .filter(([, nodeIdPartA, nodeIdPartB]) => nodeIdPartA !== nodeIdPartB)
      .map(([parentNodeId, nodeIdPartA, nodeIdPartB]) => [
        NodeId.join(parentNodeId, nodeIdPartA),
        NodeId.join(parentNodeId, nodeIdPartB),
      ]);
  };
}

test.each<[NodeId | NodeIdPart, NodeId | NodeIdPart, NodeId]>([
  ['a', 'b', ['a', 'b']],
  [[], 'a', ['a']],
  ['a', [], ['a']],
  [['a'], 'b', ['a', 'b']],
  [['a', 'b'], 'c', ['a', 'b', 'c']],
])('NodeId.join', (baseNodeId, nodeIdPart, expectedNodeId) => {
  expect(NodeId.join(baseNodeId, nodeIdPart)).toEqual(expectedNodeId);
});

describe('NodeId.isEmpty', () => {
  test('returns true for NodeId.EMPTY', () => {
    expect(NodeId.isEmpty(NodeId.EMPTY)).toBeTrue();
  });

  test.property('returns false for any created id', LocalGen.nodeIdPart(), (idPart) => {
    const id = NodeId.create(idPart);
    expect(NodeId.isEmpty(id)).toBeFalse();
  });
});

describe('NodeId.split', () => {
  test('throws for empty', () => {
    expect(() => NodeId.split(NodeId.EMPTY)).toThrow('Expected non-empty nodeId');
  });

  test.property(
    'forms an identity with NodeId.join',
    LocalGen.nodeId(),
    LocalGen.nodeIdPart(),
    (nodeId, nodeIdPart) => {
      const [nodeId0] = NodeId.split(NodeId.join(nodeId, nodeIdPart));
      expect(NodeId.equals(nodeId, nodeId0)).toBeTrue();
    },
  );
});

describe('NodeId.equals', () => {
  test.property('comparison of referentially equal values returns true', LocalGen.nodeId(), (id) => {
    expect(NodeId.equals(id, id)).toBeTrue();
  });

  test.property('comparison of structurally equal values returns true', LocalGen.nodeId(), (id) => {
    expect(NodeId.equals([...id], id)).toBeTrue();
  });

  test.property('comparison with parent returns false', LocalGen.nodeId(false), (id) => {
    expect(NodeId.equals(NodeId.split(id)[0], id)).toBeFalse();
  });

  test.property('comparison with sibling returns false', LocalGen.siblingNodeIds(), ([a, b]) => {
    expect(NodeId.equals(a, b)).toBeFalse();
  });
});
