#!/usr/bin/env python3
"""Validate ATM Town streamed world output against the authored source layers."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError as exc:
    raise SystemExit(
        "Pillow is required for world validation. Run: python3 -m pip install -r requirements-map-tiler.txt"
    ) from exc

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "assets/world/manifest.json"
REPORT_PATH = ROOT / "assets/world/tiler-report.json"
MASK_LAYERS = {"collision", "interaction", "stairs"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def pixel_equal(left: Image.Image, right: Image.Image) -> bool:
    mode = "RGBA" if "A" in left.getbands() else "RGB"
    a = left.convert(mode)
    b = right.convert(mode)
    return a.size == b.size and ImageChops.difference(a, b).getbbox() is None


def exact_black(image: Image.Image) -> bool:
    return image.convert("RGB").getbbox() is None


def alpha_empty(image: Image.Image) -> bool:
    return image.convert("RGBA").getchannel("A").getbbox() is None


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []
    if not MANIFEST_PATH.exists():
        print("World validation failed: assets/world/manifest.json is missing.", file=sys.stderr)
        return 1
    if not REPORT_PATH.exists():
        print("World validation failed: assets/world/tiler-report.json is missing.", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    chunk_size = int(manifest.get("chunkSize") or 0)
    cells = manifest.get("cells") or {}
    bounds = manifest.get("bounds") or {}

    if chunk_size != 1024:
        fail(f"Expected 1024px chunks for Phase 1, found {chunk_size}.", errors)
    if not manifest.get("coordinateSystem", {}).get("supportsNegativeCoordinates"):
        fail("Manifest does not declare negative-coordinate support.", errors)
    if bounds.get("width") != 3120 or bounds.get("height") != 4320:
        fail(f"Phase 1 town dimensions changed: {bounds.get('width')}x{bounds.get('height')}", errors)
    if len(cells) != 20:
        fail(f"Expected 20 logical cells (4x5), found {len(cells)}.", errors)

    expected_cell_keys: set[str] = set()
    for key, cell in cells.items():
        expected_cell_keys.add(key)
        if key != f"{cell['chunkX']}_{cell['chunkY']}":
            fail(f"Cell key/coordinate mismatch: {key}", errors)
        if not (1 <= int(cell["width"]) <= chunk_size and 1 <= int(cell["height"]) <= chunk_size):
            fail(f"Invalid cell dimensions for {key}: {cell['width']}x{cell['height']}", errors)

    decoded_sources: dict[str, Image.Image] = {}
    verified_chunks = 0
    for layer_name, layer in (manifest.get("layers") or {}).items():
        layer_report = report.get("layers", {}).get(layer_name) or {}
        source_rel = layer_report.get("source")
        if not source_rel:
            fail(f"Tiler report has no source for layer {layer_name}.", errors)
            continue
        source_path = ROOT / source_rel
        if not source_path.exists():
            fail(f"Source layer is missing: {source_rel}", errors)
            continue
        if layer_name in MASK_LAYERS and layer.get("format") != "png":
            fail(f"Gameplay mask {layer_name} is not PNG.", errors)
        if sha256(source_path) != layer_report.get("sourceSha256"):
            fail(f"Source hash changed after tiling: {source_rel}", errors)

        source = Image.open(source_path)
        decoded_sources[layer_name] = source
        if source.size != (bounds.get("width"), bounds.get("height")):
            fail(f"Source dimension mismatch for {layer_name}: {source.size}", errors)
            continue

        generated = set(layer.get("chunks") or [])
        omitted = set(layer.get("omittedEmptyChunks") or [])
        if generated & omitted:
            fail(f"Layer {layer_name} lists the same cells as generated and omitted.", errors)
        if generated | omitted != expected_cell_keys:
            missing = sorted(expected_cell_keys - (generated | omitted))
            extra = sorted((generated | omitted) - expected_cell_keys)
            fail(f"Layer {layer_name} coverage mismatch; missing={missing}, extra={extra}", errors)

        for key in generated:
            cell = cells.get(key)
            if not cell:
                continue
            path = ROOT / layer["path"] / f"{key}.{layer['format']}"
            if not path.exists():
                fail(f"Missing generated chunk: {path.relative_to(ROOT)}", errors)
                continue
            chunk = Image.open(path)
            expected_size = (int(cell["width"]), int(cell["height"]))
            if chunk.size != expected_size:
                fail(f"Chunk size mismatch {layer_name}/{key}: {chunk.size} != {expected_size}", errors)
                continue
            x0 = int(cell["x"] - bounds["minX"])
            y0 = int(cell["y"] - bounds["minY"])
            crop = source.crop((x0, y0, x0 + expected_size[0], y0 + expected_size[1]))
            if not pixel_equal(crop, chunk):
                fail(f"Pixel mismatch against authored source: {layer_name}/{key}", errors)
            verified_chunks += 1

        for key in omitted:
            cell = cells.get(key)
            if not cell:
                continue
            path = ROOT / layer["path"] / f"{key}.{layer['format']}"
            if path.exists():
                fail(f"Safely omitted chunk unexpectedly exists: {path.relative_to(ROOT)}", errors)
            x0 = int(cell["x"] - bounds["minX"])
            y0 = int(cell["y"] - bounds["minY"])
            crop = source.crop((x0, y0, x0 + int(cell["width"]), y0 + int(cell["height"])))
            meaning = layer.get("emptyMeaning")
            if meaning == "zero-data" and not exact_black(crop):
                fail(f"Omitted mask chunk is not exactly zero/black: {layer_name}/{key}", errors)
            if meaning == "transparent" and not alpha_empty(crop):
                fail(f"Omitted lighting chunk is not fully transparent: {layer_name}/{key}", errors)

    # Phase 1 must preserve the v228 collision/stair behavior. The old browser
    # runtime downscaled 3120x4320 masks to 520x720 with nearest-neighbor. For
    # this exact 6:1 scale, that is the same as sampling source pixels at +3
    # inside each six-pixel block. v230 performs that sampling directly.
    if bounds.get("width") == 3120 and bounds.get("height") == 4320:
        for layer_name in ("collision", "stairs"):
            source = decoded_sources.get(layer_name)
            if source is None:
                continue
            source_rgb = source.convert("RGB")
            legacy = source_rgb.resize((520, 720), Image.Resampling.NEAREST)
            sampled = Image.new("RGB", (520, 720))
            sampled.putdata([
                source_rgb.getpixel((x * 6 + 3, y * 6 + 3))
                for y in range(720)
                for x in range(520)
            ])
            if ImageChops.difference(legacy, sampled).getbbox() is not None:
                fail(f"Legacy 6px/+3 sampling equivalence failed for {layer_name}.", errors)

    overview = manifest.get("overview") or {}
    for key in ("day", "night"):
        rel = overview.get(key)
        path = ROOT / rel if rel else None
        if not path or not path.exists():
            fail(f"Missing overview {key}: {rel}", errors)
        else:
            with Image.open(path) as image:
                if image.size != (overview.get("width"), overview.get("height")):
                    fail(f"Overview {key} dimension mismatch: {image.size}", errors)

    if verified_chunks != report.get("verifiedGeneratedChunks"):
        fail(
            f"Verified chunk count differs from tiler report: {verified_chunks} != {report.get('verifiedGeneratedChunks')}",
            errors,
        )

    if errors:
        print(f"ATM Town world validation failed with {len(errors)} issue(s):", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("ATM Town streamed world validation passed.")
    print(f"- Bounds: {bounds['width']}x{bounds['height']} at world origin ({bounds['minX']}, {bounds['minY']})")
    print(f"- Chunk size: {chunk_size}px; logical cells: {len(cells)}")
    print(f"- Generated chunks pixel-verified: {verified_chunks}")
    print("- Collision/interaction/stairs remain lossless PNG")
    print("- Safe omitted chunks were rechecked against exact source pixels")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
