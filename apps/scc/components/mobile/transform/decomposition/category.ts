/** The structural subset of `Element` used here, so the rule can be tested without a DOM. */
export type TreeNode = {
  tagName: string;
  parentElement: TreeNode | null;
  children: ArrayLike<TreeNode>;
  getAttribute(name: string): string | null;
};

/** Anchor elements to category key. A strategy can be swapped (e.g. a semantic reading) without touching the engine. */
export type Categorize = <T extends TreeNode>(root: TreeNode, anchors: readonly T[]) => Map<T, string>;

/**
 * Tag, first class, and role. Later classes are usually states (selected,
 * active), which must not split a category.
 */
export function signature(node: TreeNode) {
  const first = (node.getAttribute("class") ?? "").trim().split(/\s+/)[0];
  const role = node.getAttribute("role");
  return `${node.tagName.toLowerCase()}${first ? `.${first}` : ""}${role ? `[${role}]` : ""}`;
}

const mode = (values: number[]) => {
  const counts = new Map<number, number>();
  let best = 0;
  let bestCount = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    if (count > bestCount) [best, bestCount] = [value, count];
  }
  return { value: best, share: values.length ? bestCount / values.length : 0 };
};

/**
 * Structural categories, decided top-down over the whole tree.
 *
 * Every element's key is its parent's key plus its signature. Siblings sharing
 * a signature are either a list (rows, chips, days: they merge into one key) or
 * fixed roles (title / studio / place lines, like / comment buttons: they keep
 * their index). They are roles when the parent's key occurs in two or more
 * places and most of those places hold the same number of such siblings.
 */
export const structuralCategories: Categorize = <T extends TreeNode>(root: TreeNode, anchors: readonly T[]) => {
  const relevant = new Set<TreeNode>();
  for (const anchor of anchors) {
    for (let node: TreeNode | null = anchor; node && !relevant.has(node); node = node.parentElement) {
      relevant.add(node);
      if (node === root) break;
    }
  }

  const keys = new Map<TreeNode, string>([[root, signature(root)]]);
  let level: TreeNode[] = [root];
  while (level.length) {
    const instances = new Map<string, TreeNode[]>();
    for (const node of level) {
      const key = keys.get(node) as string;
      const group = instances.get(key);
      if (group) group.push(node);
      else instances.set(key, [node]);
    }

    const next: TreeNode[] = [];
    for (const [parentKey, parents] of instances) {
      const childrenBySignature = parents.map((parent) => {
        const bySignature = new Map<string, TreeNode[]>();
        for (const child of Array.from(parent.children)) {
          const childSignature = signature(child);
          const list = bySignature.get(childSignature);
          if (list) list.push(child);
          else bySignature.set(childSignature, [child]);
        }
        return bySignature;
      });
      const roles = new Set<string>();
      for (const childSignature of new Set(childrenBySignature.flatMap((map) => [...map.keys()]))) {
        const counts = childrenBySignature.map((map) => map.get(childSignature)?.length ?? 0);
        const common = mode(counts.filter(Boolean));
        if (parents.length >= 2 && common.value >= 2 && common.share >= 0.6) roles.add(childSignature);
      }

      for (const bySignature of childrenBySignature) {
        for (const [childSignature, children] of bySignature) {
          children.forEach((child, index) => {
            if (!relevant.has(child)) return;
            const suffix = children.length >= 2 && roles.has(childSignature) ? `:${index}` : "";
            keys.set(child, `${parentKey}>${childSignature}${suffix}`);
            next.push(child);
          });
        }
      }
    }
    level = next;
  }

  const result = new Map<T, string>();
  for (const anchor of anchors) result.set(anchor, keys.get(anchor) ?? signature(anchor));
  return result;
};
