# Source images

Drop your two generated icon files here:

| File                    | What it is                                                    |
|-------------------------|---------------------------------------------------------------|
| `icon-cream.png`        | The icon on warm cream `#FBF6EE` background (square preferred) |
| `icon-transparent.png`  | The same icon on a fully transparent background               |

Then run:

```bash
pip3 install Pillow         # one time
python3 scripts/build-assets.py
```

This generates four derived assets in `assets/`:

- `icon.png` — 1024x1024 main app icon (cream bg)
- `adaptive-icon.png` — 1024x1024 transparent foreground for Android adaptive icons
- `splash.png` — 2048x2048 splash with name + tagline below the glyph
- `favicon.png` — 64x64 web favicon

Re-running the script is safe and idempotent.

## Notes

- The transparent version is the more important one — it's used three times (adaptive icon, splash composite, favicon), so spend the time to get it clean.
- The cream version only needs to look right inside a 1024x1024 square. If yours is off-square, the script will pad it on cream.
- If you regenerate the icon, replace these two files and re-run — every other asset will follow.
