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

    return stack.toArray().reduceRight((current, { parent, nodeIdPart }) => {
      const newParent = new NodeIdSet(new Map([[nodeIdPart, current]]), false);
      return NodeIdSet.merge(newParent, parent);
    }, new NodeIdSet(new Map(), true));
  }

  private static merge(a: NodeIdSet, b: NodeIdSet): NodeIdSet {
    const result = new NodeIdSet(new Map(), a.containsExact || b.containsExact);

    const aKeys = new Set(a.children.keys());
    const bKeys = new Set(b.children.keys());

    // Disparate keys can be safely added without risk of collision at the current level, or any lower level
    SetUtils.difference(aKeys, bKeys).forEach((aKey) => result.children.set(aKey, a.children.get(aKey)!));
    SetUtils.difference(bKeys, aKeys).forEach((bKey) => result.children.set(bKey, b.children.get(bKey)!));

    // Intersecting keys need to be merged, recursively
    SetUtils.intersection(aKeys, bKeys).forEach((key) => {
      const aChild = a.children.get(key)!;
      const bChild = b.children.get(key)!;
      const mergedChild = NodeIdSet.merge(aChild, bChild);
      result.children.set(key, mergedChild);
    });

    return result;
  }
}

namespace SetUtils {
  export const intersection = <T>(a: Set<T>, b: Set<T>): Set<T> => new Set([...a].filter((x) => b.has(x)));

  export const difference = <T>(a: Set<T>, b: Set<T>): Set<T> => new Set([...a].filter((x) => !b.has(x)));
}

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
