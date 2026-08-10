#!/usr/bin/env python3
"""ATM Town Map Tiler

Slices the authored ATM Town outdoor world into aligned 1024px streaming chunks.
Visual terrain/night/lighting outputs are WebP; exact-color gameplay masks remain PNG.
The script verifies every generated chunk against the decoded source pixels and writes
assets/world/manifest.json plus a validation report.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageChops
except ImportError as exc:
    raise SystemExit(
        "Pillow is required for the ATM Map Tiler. Run: python3 -m pip install -r requirements-map-tiler.txt"
    ) from exc


@dataclass(frozen=True)
class LayerSpec:
    name: str
    source: Path
    output_dir: str
    fmt: str
    skip_empty: bool = False
    empty_mode: str | None = None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def exact_black(image: Image.Image) -> bool:
    rgb = image.convert("RGB")
    return rgb.getbbox() is None


def alpha_empty(image: Image.Image) -> bool:
    rgba = image.convert("RGBA")
    return rgba.getchannel("A").getbbox() is None


def save_visual_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Lossless so chunking does not introduce another generation of visual loss.
    image.save(path, "WEBP", lossless=True, quality=100, method=2, exact=True)


def save_mask_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # PNG compression is lossless; no palette/color conversion is performed.
    image.save(path, "PNG", optimize=True)


def save_overview(image: Image.Image, path: Path, width: int) -> tuple[int, int]:
    height = max(1, round(image.height * width / image.width))
    overview = image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    overview.save(path, "WEBP", quality=86, method=4)
    return overview.size


def verify_chunk(source_crop: Image.Image, output_path: Path) -> None:
    generated = Image.open(output_path)
    # Compare normalized pixels rather than encoded bytes. This proves lossless chunking.
    mode = "RGBA" if "A" in source_crop.getbands() else "RGB"
    left = source_crop.convert(mode)
    right = generated.convert(mode)
    if left.size != right.size:
        raise RuntimeError(f"Chunk dimension mismatch for {output_path}: {right.size} != {left.size}")
    if ImageChops.difference(left, right).getbbox() is not None:
        raise RuntimeError(f"Pixel verification failed for {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Slice ATM Town outdoor map layers into aligned streaming chunks.")
    parser.add_argument("--terrain", default="assets/maps/town/visual.webp")
    parser.add_argument("--night", default="assets/maps/town/night.webp")
    parser.add_argument("--collision", default="assets/maps/town/masks/collision.png")
    parser.add_argument("--interaction", default="assets/maps/town/masks/interaction.png")
    parser.add_argument("--stairs", default="assets/maps/town/masks/stairs.png")
    parser.add_argument("--lighting", default="assets/maps/town/lighting.webp")
    parser.add_argument("--output", default="assets/world")
    parser.add_argument("--chunk-size", type=int, default=1024)
    parser.add_argument("--origin-x", type=int, default=0, help="World coordinate of the source image's left edge.")
    parser.add_argument("--origin-y", type=int, default=0, help="World coordinate of the source image's top edge.")
    parser.add_argument("--spawn-x", type=int, default=1560)
    parser.add_argument("--spawn-y", type=int, default=3850)
    parser.add_argument("--overview-width", type=int, default=780)
    parser.add_argument("--clean", action=argparse.BooleanOptionalAction, default=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = Path(__file__).resolve().parent.parent
    output_root = (repo / args.output).resolve()
    if args.chunk_size <= 0:
        raise SystemExit("--chunk-size must be greater than zero")

    specs = [
        LayerSpec("terrain", repo / args.terrain, "terrain", "webp"),
        LayerSpec("night", repo / args.night, "night", "webp"),
        LayerSpec("collision", repo / args.collision, "collision", "png", True, "black"),
        LayerSpec("interaction", repo / args.interaction, "interaction", "png", True, "black"),
        LayerSpec("stairs", repo / args.stairs, "stairs", "png", True, "black"),
        LayerSpec("lighting", repo / args.lighting, "lighting", "webp", True, "transparent"),
    ]

    for spec in specs:
        if not spec.source.exists():
            raise SystemExit(f"Missing source layer: {spec.source.relative_to(repo)}")

    opened: dict[str, Image.Image] = {spec.name: Image.open(spec.source) for spec in specs}
    base_size = opened["terrain"].size
    mismatches = {name: image.size for name, image in opened.items() if image.size != base_size}
    if mismatches:
        details = ", ".join(f"{name}={size[0]}x{size[1]}" for name, size in mismatches.items())
        raise SystemExit(f"Layer dimension mismatch. Terrain is {base_size[0]}x{base_size[1]}; {details}")

    width, height = base_size
    chunk_size = args.chunk_size
    world_min_x, world_min_y = args.origin_x, args.origin_y
    world_max_x, world_max_y = world_min_x + width, world_min_y + height

    first_cx = math.floor(world_min_x / chunk_size)
    first_cy = math.floor(world_min_y / chunk_size)
    last_cx = math.floor((world_max_x - 1) / chunk_size)
    last_cy = math.floor((world_max_y - 1) / chunk_size)

    if args.clean and output_root.exists():
        for child in ["terrain", "night", "collision", "interaction", "stairs", "lighting", "overview"]:
            shutil.rmtree(output_root / child, ignore_errors=True)
    output_root.mkdir(parents=True, exist_ok=True)

    cells: dict[str, dict] = {}
    layer_chunks: dict[str, list[str]] = {spec.name: [] for spec in specs}
    layer_skipped: dict[str, list[str]] = {spec.name: [] for spec in specs}
    verified = 0

    for cy in range(first_cy, last_cy + 1):
        for cx in range(first_cx, last_cx + 1):
            cell_left = cx * chunk_size
            cell_top = cy * chunk_size
            left = max(world_min_x, cell_left)
            top = max(world_min_y, cell_top)
            right = min(world_max_x, cell_left + chunk_size)
            bottom = min(world_max_y, cell_top + chunk_size)
            if left >= right or top >= bottom:
                continue
            key = f"{cx}_{cy}"
            source_box = (left - world_min_x, top - world_min_y, right - world_min_x, bottom - world_min_y)
            cells[key] = {
                "x": left,
                "y": top,
                "width": right - left,
                "height": bottom - top,
                "chunkX": cx,
                "chunkY": cy,
            }

            for spec in specs:
                crop = opened[spec.name].crop(source_box)
                empty = False
                if spec.skip_empty and spec.empty_mode == "black":
                    empty = exact_black(crop)
                elif spec.skip_empty and spec.empty_mode == "transparent":
                    empty = alpha_empty(crop)
                if empty:
                    layer_skipped[spec.name].append(key)
                    continue

                target = output_root / spec.output_dir / f"{key}.{spec.fmt}"
                if spec.fmt == "webp":
                    save_visual_webp(crop, target)
                else:
                    save_mask_png(crop, target)
                verify_chunk(crop, target)
                verified += 1
                layer_chunks[spec.name].append(key)

    overview_day_size = save_overview(opened["terrain"], output_root / "overview" / "day.webp", args.overview_width)
    overview_night_size = save_overview(opened["night"], output_root / "overview" / "night.webp", args.overview_width)

    def layer_manifest(spec: LayerSpec) -> dict:
        return {
            "path": f"assets/world/{spec.output_dir}",
            "format": spec.fmt,
            "chunks": layer_chunks[spec.name],
            "omittedEmptyChunks": layer_skipped[spec.name],
            "emptyMeaning": "zero-data" if spec.empty_mode == "black" else ("transparent" if spec.empty_mode == "transparent" else None),
        }

    manifest = {
        "schemaVersion": 1,
        "worldId": "atm-town",
        "chunkSize": chunk_size,
        "coordinateSystem": {
            "units": "pixels",
            "origin": {"x": 0, "y": 0},
            "supportsNegativeCoordinates": True,
            "chunkNaming": "{chunkX}_{chunkY}",
            "note": "Existing ATM Town remains at its authored world coordinates; future chunks may use negative chunk coordinates.",
        },
        "bounds": {
            "minX": world_min_x,
            "minY": world_min_y,
            "maxX": world_max_x,
            "maxY": world_max_y,
            "width": width,
            "height": height,
        },
        "spawn": {"x": args.spawn_x, "y": args.spawn_y},
        "streaming": {
            "visualPreloadMargin": 384,
            "maskNeighborhoodRadius": 1,
            "visualCacheLimitPerLayer": 18,
            "maskCacheLimitPerLayer": 12,
            "cacheGraceMs": 15000,
            "collisionSampleStep": 6,
            "collisionSampleOffset": 3,
        },
        "overview": {
            "day": "assets/world/overview/day.webp",
            "night": "assets/world/overview/night.webp",
            "width": overview_day_size[0],
            "height": overview_day_size[1],
        },
        "cells": cells,
        "layers": {spec.name: layer_manifest(spec) for spec in specs},
        "regions": [
            {
                "id": "atm-town-core",
                "label": "ATM Town",
                "bounds": {"minX": world_min_x, "minY": world_min_y, "maxX": world_max_x, "maxY": world_max_y},
                "metadata": {},
            }
        ],
    }
    manifest_path = output_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    report = {
        "ok": True,
        "sourceDimensions": {"width": width, "height": height},
        "chunkSize": chunk_size,
        "grid": {"columns": last_cx - first_cx + 1, "rows": last_cy - first_cy + 1, "cells": len(cells)},
        "verifiedGeneratedChunks": verified,
        "layers": {
            spec.name: {
                "source": str(spec.source.relative_to(repo)).replace("\\", "/"),
                "sourceSha256": sha256_file(spec.source),
                "format": spec.fmt,
                "generatedChunks": len(layer_chunks[spec.name]),
                "skippedEmptyChunks": len(layer_skipped[spec.name]),
            }
            for spec in specs
        },
        "overview": {"width": overview_day_size[0], "height": overview_day_size[1], "format": "webp"},
        "maskPolicy": "collision, interaction, and stairs remain lossless PNG; no gameplay mask is written as WebP",
        "verification": "Every generated chunk was decoded and pixel-compared against its exact source crop.",
    }
    report_path = output_root / "tiler-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(f"ATM Map Tiler complete: {width}x{height}, {len(cells)} grid cells at {chunk_size}px.")
    for spec in specs:
        print(f"- {spec.name}: {len(layer_chunks[spec.name])} files, {len(layer_skipped[spec.name])} safe empty chunks skipped")
    print(f"- Verified generated chunks: {verified}")
    print(f"- Manifest: {manifest_path.relative_to(repo)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ATM Map Tiler failed: {exc}", file=sys.stderr)
        raise
