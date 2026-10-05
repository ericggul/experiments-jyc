# Local image collections

This repository uses local image derivatives for visual experiments. A source
page is retained in a ledger; the rendered experiment reads only local files.
This keeps installations stable, avoids runtime network dependency, and makes
the material provenance reviewable.

## Collection contract

Every reusable collection has four parts:

```text
collection configuration
  -> Commons search and local derivative collector
  -> source ledger + local image directory
  -> experiment album manifest
```

1. **Configuration** names the collection, target count, query per intended
   record, derivative size, output path, public URL prefix, ledger path, and
   optional title-match terms for disambiguating an intended subject.
2. **Collector** queries Wikimedia Commons File namespace, accepts only JPEG
   thumbnail derivatives, removes duplicate description pages, downloads the
   requested local derivative, and rejects implausibly small files.
3. **Ledger** records stable record ID, topic, country when applicable, title,
   local URL, Commons description URL, exact search term, and the license and
   author metadata returned by Commons.
4. **Experiment** imports the completed ledger and uses its local `imageUrl`
   values. It never fetches remote image content while rendering.

The Commons description page remains the authority for licensing and
attribution. A local derivative does not replace the rights assessment required
before publication or redistribution.

## Generic Wikimedia collector

Use:

```sh
node apps/scc/scripts/collect-wikimedia-image-set.mjs <collection-config.json>
```

The config schema is represented by
[`apps/scc/scripts/collections/grid-2-politicians.json`](../../apps/scc/scripts/collections/grid-2-politicians.json):

```json
{
  "collectionId": "stable-collection-name",
  "targetCount": 60,
  "thumbnailWidth": 320,
  "outputDirectory": "public/images/family/collection",
  "publicPrefix": "/images/family/collection",
  "ledgerPath": "components/family/experiment/collection-sources.json",
  "queries": [
    {
      "country": "Example country",
      "topic": "selection criterion",
      "searchTerm": "precise Wikimedia Commons search",
      "matchTerms": ["surname"]
    }
  ]
}
```

`queries.length` must equal `targetCount`. This makes the desired diversity
explicit instead of hoping a broad search result happens to include it. The
collector requires a candidate title to contain one configured `matchTerm`, or
one meaningful term derived from the named search. This filters unrelated group
photos and title-level false positives before download; it is not a substitute
for human curation.

## Safe collection workflow

1. Define the conceptual selection rule before searching. Name the intended
   countries, topics, exclusions, and count.
2. Create a new collection config and output path. Do not overwrite a completed
   collection in place.
3. Run the collector. It writes a `.partial` checkpoint after every successful
   download.
4. If the network fails, rerun the identical command. The collector verifies
   the checkpoint against the local directory and resumes at the next query.
   Slow the config's `delayMs` before retrying after a Commons `429` response;
   the collector also uses bounded curl retry backoff.
5. Review the local contact sheet/ledger for duplicate subjects, inappropriate
   content, weak search results, poor crops, and jurisdiction-specific rights
   issues. Selection is a curatorial step, not an API result.
6. Only after review, import the completed source ledger into the experiment.
7. Add the collection's purpose, count, source ledger, and visual contract to
   the experiment documentation.

The collector refuses to overwrite an existing completed ledger. It also
refuses to begin from an image directory without a matching checkpoint, because
those files do not have trusted source records.

## Existing examples

| Collection | Local source | Ledger |
| --- | --- | --- |
| Stock 4 cats | `apps/scc/public/images/stock-4/cats/` | `apps/scc/components/ui/dashboard/stock/4/model/cat-sources.json` |
| Stock 4 kisses | `apps/scc/public/images/stock-4/kisses/` | `apps/scc/components/ui/dashboard/stock/4/model/kiss-sources.json` |
| Bastille Day good/dark | `apps/scc/public/images/bastille-day-2-good/`, `apps/scc/public/images/bastille-day-2-dark/` | `apps/scc/components/standalone/bastille-day/2/good-sources.json`, `dark-sources.json` |
| Grid 2 politicians | `apps/scc/public/images/grid-2/politicians/` | `apps/scc/components/standalone/grid/2/politician-sources.json` |

## Performance guidance

Choose derivatives near the largest display size the cell needs, rather than
preserving original uploads. A `320px` JPEG is usually sufficient for a dense
grid where cells are approximately 120px wide at installation scale. Decode
only the active album, preserve the current visual frame while subsequent
images load, and use one scheduler for a grid sequence rather than a timer per
cell.

For large collections, begin once a small verified pool is decoded and add
later successful records to the available source pool. This prevents a large
album from presenting a long blank state while retaining local-only runtime
media.
