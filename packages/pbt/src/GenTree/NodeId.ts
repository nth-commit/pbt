export type NodeId = ReadonlyArray<NodeIdPart>;

export type NodeIdPart = string;

export namespace NodeId {
  export const EMPTY: NodeId = [];

  export const isEmpty = (nodeId: NodeId) => nodeId.length === 0;

  export const create = (str: string): NodeId => [str];

  export const split = (nodeId: NodeId): [NodeId, NodeIdPart] => {
    const lastIndex = nodeId.length - 1;
    if (lastIndex === -1) throw new Error('Expected non-empty nodeId');
    return [nodeId.slice(0, lastIndex), nodeId[lastIndex]];
  };

  export const join = (left: NodeId | NodeIdPart, right: NodeId | NodeIdPart): NodeId => {
    const leftParts = typeof left === 'string' ? [left] : left;
    const rightParts = typeof right === 'string' ? [right] : right;
    return [...leftParts, ...rightParts];
  };

  export const concat = (ids: NodeId[]): NodeId => ids.reduce((acc, curr) => join(acc, curr), EMPTY);

  export const equals = (nodeIdA: NodeId, nodeIdB: NodeId): boolean =>
    nodeIdA.length === nodeIdB.length && nodeIdA.every((nodeIdPartA, i) => NodeIdPart.equals(nodeIdPartA, nodeIdB[i]));
}

export namespace NodeIdPart {
  export const equals = (nodeIdPartA: NodeIdPart, nodeIdPartB: NodeIdPart): boolean => nodeIdPartA === nodeIdPartB;
}
