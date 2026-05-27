# diagrams

Visual documentation of how `kkskills-mcp` fits together.

| File                      | What it shows                                                                  |
|---------------------------|--------------------------------------------------------------------------------|
| `sequence-flow.mmd`       | Mermaid source — runtime call sequence from user prompt to skill-applied reply |
| `sequence-flow.svg`       | Hand-tuned SVG of the same flow (good for slides, blog posts, social).         |
| `architecture.mmd`        | Mermaid source — static architecture (hosts ↔ server ↔ skills library)         |
| `architecture.svg`        | Hand-tuned SVG of the architecture.                                            |

GitHub renders the `.mmd` files automatically when embedded in markdown via ```` ```mermaid ```` fences — the main `README.md` does that so the diagrams appear inline on the repo page. The `.svg` files are intended for use outside GitHub (LinkedIn posts, slide decks, blog embeds).

PNG copies of both SVGs are not committed (regenerable). Render with any SVG→PNG converter, for example:

```bash
# Using @resvg/resvg-js (Node, no browser needed)
npx --yes -p @resvg/resvg-js node -e "\
const {Resvg}=require('@resvg/resvg-js'),fs=require('node:fs');\
['sequence-flow','architecture'].forEach(n=>{\
  const svg=fs.readFileSync('diagrams/'+n+'.svg','utf-8');\
  fs.writeFileSync('diagrams/'+n+'.png',new Resvg(svg,{fitTo:{mode:'zoom',value:2},background:'white'}).render().asPng());\
});"
```

Editing tips:
- Keep the `.mmd` source as the source of truth for *structure* — re-export SVG if structure changes.
- The `.svg` files are hand-tuned for typography and color and can be edited directly when only styling needs to change.
- Cross-reference any changes with `../README.md` so the inline diagram doesn't drift from the visual asset.
