# Self-evolving network / 1

Route: `/self-evolving-network/1`. Experimental mathematical demonstrator, added 2026-10-01.

The family question is how a network can organize itself using only its own structure, with no outside growth rule. [Barabási–Albert / 1](../barabasi-albert/README.md) grows forever by attaching newcomers to existing degree. Here the population is fixed and starts with no ties. Structure comes from introductions made through existing ties and is erased by turnover.

## Model card

- **Object and boundary:** the Davidsen–Ebel–Bornholdt acquaintance model with 500 people to start (cap 800; 200 until 2026-10-02). It is a synthetic abstraction of "friends introduce friends", not data about a real social network. Model state is limited to acquaintance sets, arrival update per person, the seeded random state and the update count.
- **Local event:** pick a random person. With two or more acquaintances, they introduce two of them to each other; that creates a tie unless the two already know each other. With fewer than two, they connect to a random stranger. Then, with probability `turnover` (range `.02`–`.3`, default `.06`), a random person leaves: all their ties vanish and a tieless newcomer takes their place.
- **Macro observable:** local clustering stays around `.5`, against `.02`–`.1` for a random graph of the same density. Turnover sets the regime. At `.02` the network is dense (mean degree about 18–21, largest hub about 70–80) and the hubs are long-tenured. At `.3` it is sparse (mean degree about 2.5) with many isolated people.
- **Participant intervention:** a slider from stay to leave sets turnover. Tapping a person (within their radius plus 6 px) makes them leave; Enter removes the most connected person. Tapping empty space brings in a newcomer there who already knows the nearest person, so they enter through an existing circle and are then introduced onward; N adds one at the centre. The contrast to look for: removing a hub does not break up its cluster, because the triangles it brokered remain.

## Screen

- **Encoding:** person area grows with acquaintances. Shade runs from light grey (newcomer) to near-black (long tenure); tenure is normalized by the expected lifetime `size / turnover` updates. Standing ties are faint ink.
- **Events:** an introduction briefly draws the broker's two ties in ink and the new tie in vermilion; a stranger contact draws only the vermilion tie. A departure leaves its former ties dashed at the old position while the newcomer appears on the field's edge.
- **Layout:** browser-only force layout, a standalone copy of `adaptive-coevolving-network/1` with springs, all-pairs repulsion and aspect-scaled gravity. It cannot affect the model.
- **Chrome:** no title, counters or legend. A hint disappears after the first removal, and clustering versus the random baseline is exposed only to screen readers.
- **Rate:** one update per person per second. The default regime settles within about a minute, starting from an empty graph.

## Record

- **Baseline:** Barabási–Albert / 1, which has growth plus preferential attachment.
- **Changed variable:** the source of structure moves from external growth to internal brokerage plus turnover.
- **Tests:** deterministic replay; every introduction closes a triangle through the broker; retirement clears all of a person's ties and resets tenure; a newcomer joins with exactly one acquaintance; arrivals stop at the cap; clustering exceeds five times the random baseline; low versus high turnover differ in density, hub size and isolation.
- **Measured, pure model only:** seed `0x3d0b5e17`, 200 people, 2026-10-01. At 500 people (2026-10-02), after 90 s: turnover .02 gives mean degree about 23.5 and a largest hub of 138; .06 gives about 9.3; .3 gives about 2.2 with 96 isolated. Clustering stayed at .43–.55. Model plus layout cost about .3 ms per frame in Node; the measure behind the screen-reader text takes up to 7 ms (16 ms at 800 people) once every 2 s. The live screen has not been browser-observed. Layout cost was about `.05`–`.08` ms per frame in Node.
- **Unresolved:** whether degree–tenure correlation reads from shade alone, and whether the lower turnover bound (`.02`) is still legible on a phone.

Source: Davidsen, Ebel and Bornholdt, ["Emergence of a small world from local interactions: modeling acquaintance networks"](https://doi.org/10.1103/PhysRevLett.88.128701), *PRL* 88, 128701 (2002).
