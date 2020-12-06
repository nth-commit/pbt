import { NodeId, NodeIdPart } from './NodeId';

export class NodeIdSet {
  static create(): NodeIdSet {
    return new NodeIdSet(new Map(), false);
  }

  private constructor(private children: Map<string, NodeIdSet>, private containsExact: boolean) {}

  has(nodeId: NodeId): boolean {
    const tryGetSetRec = (set: NodeIdSet, nodeIdParts: ReadonlyArray<NodeIdPart>): NodeIdSet | null => {
      switch (nodeIdParts.length) {
        case 0:
          return set;
        default: {
          const [currPart, ...nextParts] = nodeIdParts;

          const nextSet = set.children.get(currPart);
          if (nextSet === undefined) {
            return null;
          }

          return tryGetSetRec(nextSet, nextParts);
        }
      }
    };

    const node = tryGetSetRec(this, nodeId);
    return node !== null && node.containsExact;
  }

  add(nodeId: NodeId): NodeIdSet {
    if (nodeId.length === 0) {
      return this.containsExact ? this : new NodeIdSet(this.children, true);
    }

    const stack = MutableStack.empty<{ parent: NodeIdSet; child: NodeIdSet; nodeIdPart: string }>();

    for (const nodeIdPart of nodeId) {
      const parent = stack.peek()?.child || this;
      const child = parent.children.get(nodeIdPart) || new NodeIdSet(new Map(), false);
      stack.push({ parent, child, nodeIdPart });
    }

    return stack
      .toArray()
      .reduceRight(
        (current, { parent, nodeIdPart }) =>
          new NodeIdSet(immutableMapSet(parent.children, nodeIdPart, current), parent.containsExact),
        new NodeIdSet(new Map(), true),
      );
  }
}

const immutableMapSet = <K, V>(map: Map<K, V>, key: K, value: V): Map<K, V> =>
  new Map<K, V>(
    (function* () {
      yield* map;
      yield [key, value] as const;
    })(),
  );

class MutableStack<T> {
  static empty<T>(): MutableStack<T> {
    return new MutableStack([]);
  }

  private elements: T[];

  private constructor(elements: ReadonlyArray<T>) {
    this.elements = [...elements];
  }

  push(element: T): void {
    this.elements.push(element);
  }

  peek(): T | undefined {
    return this.elements[this.elements.length - 1];
  }

  /* istanbul ignore next */
  pop(): T | undefined {
    return this.elements.pop();
  }

  toArray(): T[] {
    return [...this.elements];
  }
}
