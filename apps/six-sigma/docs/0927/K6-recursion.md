# K6 inside K6: rejected shortcut and revised interpretation

Status: the user approved the recursive compound interpretation as opt 1, then
requested the 630-edge lexicographic interpretation alongside it as opt 2. Both
are implemented on 2026-09-27.

The requested invariant is that **each upper K6 node is itself a K6**, with 36
terminal nodes at the displayed depth. A parent must be represented as a graph
object with six children, not silently equated with one arbitrarily selected
child. The rejected `facingVertex` function did exactly that equating without a
recursive label/port rule; it has been removed. The geometric miniature alone does not resolve it.

Self-similarity means that the same construction recurs under a change of scale;
finite displays show a finite approximation. Self-reference alone does not
uniquely specify adjacency, nor does it automatically require every possible
cross-group edge. In graph substitution, a vertex-replacement rule and an
edge-replacement rule must both be stated.

## Approved opt 1

Define a hierarchical object `F(0) = leaf`; `F(d)` contains six `F(d-1)` children,
with all fifteen K6 relations **between those children as objects**. At depth 2,
the root relates six compound nodes, each of which contains the same six-node,
fifteen-edge construction. There are 36 leaves and six internal parent objects;
the parents need not become six additional visible point dots.

Store parent relations between parent IDs, and child relations between child IDs.
Draw the upper fifteen edges on the original macro K6 axes, meeting each entire
miniature's boundary rather than a selected child. Use the same orientation,
scale ratio, and K6 renderer recursively. Do not introduce arbitrary child ports,
decorative enclosing cards, or random rotations. If parent edges carry flow,
their arrival is to the parent object; do not imply arrival at one child without
an additional explicit distribution rule.

This is the approved finite recursive compound-graph view, not a claim to a
unique mathematical object called "Fractal K6". `createRecursiveK6` owns the
recursive topology; `RecursiveGraph` recursively renders its relations. Parent
arrivals highlight the entire receiving child graph; they do not select a leaf.

Opt 2 separately connects every pair of the same 36 terminal nodes. It has
630 unique edges and keeps the child grouping in its placement; its flattened
topology is K36. Both options retain Static / Flow and the rate control.

## Why other definitions are materially different

| Construction | Exactly what a parent edge becomes | Consequence |
| --- | --- | --- |
| Opt 1: recursive compound view | Relation between entire child graph objects | Preserves upper/lower levels explicitly; 36 leaves, 15 parent relations and 90 child relations |
| Opt 2: lexicographic substitution `K6[K6]` | Every leaf of one group joins every leaf of the other | 540 inter-group + 90 internal edges = 630; the flattened graph is exactly K36 |
| Sierpinski graph `S(2,6)` | Reciprocal labelled ports `(i,j)` and `(j,i)` | 36 vertices / 105 edges; a repeatable non-arbitrary bridge rule, but still one bridge per pair of copies and not automatically the user's intended parent-object relation |

The old implementation was not justified by either the compound model or the
reciprocal-port rule. Merely changing the edge count would not establish the
intended recursion. Conversely, calling all 105-edge constructions nonrecursive
would also be incorrect.

## Primary sources consulted

- [Chilakamarri et al., Self-Similar Graphs](https://arxiv.org/abs/1310.2268):
  explicitly separates replacing vertices by G and edges by a specified J.
- [Cornell, Analysis on Sierpinski n-Gaskets](https://pi.math.cornell.edu/~mbarany/intro.html):
  contractive similarities, repeated construction, and finite graph approximations
  to a limit; planar K6 drawings are not themselves a proof of a gasket.
- [Klavzar and Milutinovic, Graphs S(n,k), 1997](https://www.dml.cz/bitstream/handle/10338.dmlcz/127341/CzechMathJ_47-1997-1_7.pdf):
  formal labelled recursive graph family; do not substitute its topology without
  matching the user's parent-edge intent.
- [NetworkX lexicographic product](https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.operators.product.lexicographic_product.html):
  graph-product semantics; the K36 count follows by applying that operation to K6.
- [Cytoscape.js compound nodes](https://js.cytoscape.org/#notation/compound-nodes):
  parent nodes contain child nodes; a relation to a parent is distinct from
  relations to its descendants. This is a data-model reference, not a dependency.
