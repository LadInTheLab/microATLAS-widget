# microATLAS Widget

An embeddable microscopy image viewer for [OME-Zarr](https://ngff.openmicroscopy.org/) data, built for scientific publications and interactive documents. Renders multi-channel fluorescence imagery directly in the browser with GPU-accelerated pan, zoom, and channel controls.

Designed to drop into [Curvenote](https://curvenote.com/) pages via the `:::{any:bundle}` directive. Authors point to their OME-Zarr data, configure the viewer, and paste a markdown block into their article — no hosting or build step required on their end.

## Features

- Loads OME-Zarr datasets from any publicly accessible URL (S3, GCS, HTTP)
- Multi-channel rendering with per-channel contrast, color, and visibility controls
- Additive blending and colormap modes
- Saved views with animated fly-to navigation
- Point annotations with customizable labels and colors
- Physical scale bar (reads pixel size from OME metadata)
- Glassmorphism UI that stays out of the way until you need it

## How to use it

### 1. Open the Builder

Go to [the builder page](https://ladinthelab.github.io/microATLAS-widget/builder.html), paste in your OME-Zarr URL, and configure your viewer — set up saved views, add annotations, toggle the scale bar.

### 2. Copy the markdown

The builder generates a ready-to-paste `:::{any:bundle}` directive block. It looks like this:

```markdown
:::{any:bundle} https://ladinthelab.github.io/microATLAS-widget/widget.js
{
  "source": "https://your-bucket.s3.amazonaws.com/sample.zarr/",
  "views": [
    {
      "name": "Overview",
      "zoom": -4,
      "target": [4886, 4886, 0]
    }
  ],
  "annotations": [
    { "name": "Region A", "target": [2400, 2400], "color": [100, 200, 255] }
  ],
  "scaleBar": { "maxWidth": 120, "position": "bottom-right" }
}
:::
```

### 3. Paste into your article

Drop the block into your markdown. The widget loads directly from GitHub Pages — your readers get an interactive viewer with no extra setup.

## Configuration reference

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | URL to an OME-Zarr dataset (required) |
| `views` | `SavedView[]` | Preset camera positions with optional per-view channel appearance |
| `annotations` | `Annotation[]` | Labeled point markers overlaid on the image |
| `scaleBar` | `ScaleBarConfig \| boolean` | Physical scale bar config, or `true` for defaults |

## Stack

[Viv](https://github.com/hms-dbmi/viv) + [deck.gl](https://deck.gl/) for rendering, React 18 for the UI, Vite for builds. The library bundles everything into a single ESM output with no external dependencies.

## License

MIT
