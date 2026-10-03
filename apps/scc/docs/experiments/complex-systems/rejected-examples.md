# Complex-systems removals and simulation standard

Date: 2026-08-14.

The following runnable examples were removed from components, routes, catalog,
and active experiment documentation. This is not a request to rebuild their
surface with better animation. Their causal models, system claims, and visible
consequences did not cohere.

| Removed route or variant | Why it was rejected |
| --- | --- |
| `adaptive-coevolving-network/1` | It updated opinions and rewired a fixed population/edge count, but stayed an abstract graph demonstration. The layout supplied much of the visible drama, while the system name did not identify a concrete evolving object or a testable consequence of coevolution. |
| `adaptive-coevolving-network/2`, `/3` (2026-10-02) | Removed at the user's request. The open N/S/R recruitment graph and its lattice variant changed states and ties, but nodes sat at fixed coordinates, so rewiring never changed the visible structure and the coevolution loop could not be seen. Route 2 was then rebuilt as adaptive phase oscillators, which were removed the same day for being too elaborate, and now hosts an adaptive SIS epidemic. |
| `adaptive-coevolving-network/6` Axelrod culture (2026-10-03) | Removed by the user as not useful after two reworks. The first used per-trait colour pies, which read as confetti. The second gave each culture one colour, then a three-syllable fictional nation name with a territory. Route 7 was renumbered 6. |
| `adaptive-coevolving-network/5` Jain–Krishna ecosystem (2026-10-03) | Removed by the user as not useful. Routes 6–8 were renumbered 5–7. |
| `adaptive-coevolving-network/4` structural balance, `/5` bounded confidence (2026-10-03) | Removed by the user as not useful. Structural balance changed only relationship signs, with no node state, and settled into the same two-camp picture each time. Bounded confidence repeated the opinion-and-rewiring loop that `/1` and the echo-chamber route already show. Routes 6–10 were renumbered 4–8. |
| `adaptive-coevolving-network/4` Physarum (2026-10-03) | Removed by the user as a wrong example for this family. It was a Tero flow–conductance model, in which tube conductance adapts to flux. That is adaptive transport, not a network whose node states and ties coevolve through agents. Routes 5–11 were renumbered 4–10. |
| `adaptive-coevolving-network/human-relations` | `person`, `account`, `conversation`, and `follow` were labels on a generic local graph. Those distinctions did not create different social actions, incentives, or relation dynamics; most meaningful topology changes were manual or isolated-node repair. |
| `adaptive-coevolving-network/p2p` | Devices had scalar load/stability and links had scalar traffic/quality, but there were no peers exchanging a resource, packets, routing, replication, discovery, capacity, or failure propagation. It was a network costume, not P2P. |
| `ant-colony/1` | There were moving nutrient/pheromone-sensing agents, but no nest, task switching, food carrying, outward/homeward states, recruitment, or colony-level resource loop. Constant trail deposition and mutating division made it closer to an evolving walker/microbe field than ants or a colony. |
| `artificial-language/1` | It copied and mutated preset strings across three fixed communities, but did not establish why a word matters, how communicative success changes speakers, or how social structure and language coevolve. The participant saw word churn without a legible linguistic question. |
| `flight-network/1` | Synthetic demand, ticket counts, route reviews, and moving dots did not make an evolving flight-path system observable or credible. The interface could not distinguish a genuine network consequence from a scripted toy economy, and it supplied neither a real operational model nor a deliberately bounded abstract one. |
| `hypertext-network/1` | Templated phrases, term overlap, and randomly travelling “readers” are not hypertext creation or use. There were no authored pages, links with destinations/anchors, reading decisions, navigation history, or textual consequences of linking; a generic graph was given hypertext names. |
| `markov-chain/1` | The source did construct a finite transition matrix and sample it, so it was mathematically a Markov-chain toy. But its sites, regimes, and headings were arbitrary and did not answer a real or clearly bounded question; the screen did not make conditional transitions, state choice, or the meaning of the chain legible. Mathematical correctness alone did not earn a complex-systems experiment. |

## What “it is not doing anything” means

At the **micro level**, an entity needs state that matters to its next action.
Its update must read a causally relevant local relation, environment, or message
and then change shared state through an identifiable rule. A generic random
number, clock pulse, force layout, or a label such as “ant”, “reader”, or
“device” is not an agent mechanism. The named entity must have the states and
actions that make the name operational.

At the **macro level**, the visible pattern must be an accumulated consequence
of those local rules: a topology, distribution, path, cluster, cascade,
collective memory, or other system property that could have been different under
a changed condition. The participant must be able to make a bounded
intervention, predict a consequence, and tell whether the prediction was wrong.
Moving dots, pulses over a static graph, scalar counters, and automatically
cycling “events” are activity, not necessarily system evolution.

## Retained routes with explicit gaps

- `polling-ecology` remains because cells, states, neighbourhood rules, and
  visible change are aligned. It remains a synthetic cellular ecology—not a
  polling claim and not yet an adaptive network.
- `cellular-automata/1` is a valid Conway baseline. Its next extension should
  place experimental controls at the bottom: birth and survival sets, boundary
  condition, seed density or named seeds, brush, and step rate. Each control
  must alter the actual transition rule or initial condition.
- `living-topology/3` and `/4` are retained, but their default population must
  be audited. Their shared birth/death model currently has no regression check
  that the defaults avoid systematic collapse. Before calling them living,
  measure a fixed simulated interval at defaults, record population and
  topology outcomes, and change only the causal balance responsible for a
  confirmed shrinkage. Do not hide collapse with rendering or a reset loop.

## Required gate before a new or restored example

Write a short model card before implementing:

1. Name the actual system object and its boundary. State whether it is a
   calibrated domain simulation, a deliberately synthetic abstraction, or a
   mathematical demonstrator.
2. Name each entity’s state, what it can sense or receive, its local action,
   and the shared state it changes. Define edges, fields, paths, or resources
   as part of the model rather than as rendering props.
3. Name one macro observable that accumulates from those rules, one participant
   intervention, and the specific contrast they should be able to see.
4. Make the screen encode model state only. Do not use presentation motion,
   decorative activity, or invented terminology to manufacture significance.
5. Test the causal claim: run the same seeded state with one relevant parameter
   or intervention changed; assert model invariants and record the difference
   in the macro observable. If there is no meaningful contrast, do not keep the
   route.

A model may be simple. It may not claim ants, P2P, aviation, hypertext,
language, social relations, or complex dynamics unless the mechanism and the
visible evidence actually support that claim.
