import io
import math
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter


# Viridis-inspired colormap: low→transparent, mid→blue/teal, high→yellow/red
_COLORMAP = [
    (0,   0,   0,   0),
    (68,  1,   84,  80),
    (59,  82,  139, 140),
    (33,  145, 140, 180),
    (94,  201, 98,  210),
    (253, 231, 37,  230),
    (220, 50,  30,  255),
]


def _apply_colormap(normalized: np.ndarray) -> np.ndarray:
    h, w = normalized.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    n = len(_COLORMAP) - 1
    for i in range(n):
        lo, hi = i / n, (i + 1) / n
        mask = (normalized >= lo) & (normalized < hi)
        t = (normalized[mask] - lo) / (hi - lo)
        c0 = np.array(_COLORMAP[i], dtype=float)
        c1 = np.array(_COLORMAP[i + 1], dtype=float)
        rgba[mask] = (c0 * (1 - t[:, None]) + c1 * t[:, None]).astype(np.uint8)
    rgba[normalized >= 1.0] = _COLORMAP[-1]
    return rgba


def _interpolate_positions(positions: list[tuple]) -> list[tuple]:
    """
    Insert linearly interpolated midpoints between consecutive agent positions.
    This fills the gaps between sampled positions so the heatmap is continuous
    even when agents move fast between waypoints.
    """
    if len(positions) < 2:
        return positions
    result = []
    for i in range(len(positions) - 1):
        x0, y0 = positions[i]
        x1, y1 = positions[i + 1]
        result.append((x0, y0))
        dist = math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
        # Add intermediate points every ~3 pixels
        steps = max(1, int(dist / 3))
        for k in range(1, steps):
            t = k / steps
            result.append((x0 + t * (x1 - x0), y0 + t * (y1 - y0)))
    result.append(positions[-1])
    return result


def _adaptive_sigma(image_width: int, image_height: int) -> float:
    """Sigma that blends neighbour spots into continuous flow regardless of image size."""
    return max(22.0, min(image_width, image_height) / 28.0)


def _build_grid(positions, image_width, image_height, sigma):
    grid = np.zeros((image_height, image_width), dtype=np.float32)
    interp = _interpolate_positions(list(positions))
    xs = np.clip(np.array([p[0] for p in interp], dtype=np.float32), 0, image_width - 1).astype(np.int32)
    ys = np.clip(np.array([p[1] for p in interp], dtype=np.float32), 0, image_height - 1).astype(np.int32)
    np.add.at(grid, (ys, xs), 1)
    grid = gaussian_filter(grid, sigma=sigma)
    vmax = grid.max()
    if vmax > 0:
        grid /= vmax
    return grid


def generate_heatmap_bytes(
    positions: list[tuple[float, float]],
    floor_plan_path: str,
    image_width: int,
    image_height: int,
    sigma: float | None = None,
) -> bytes:
    buf = io.BytesIO()
    base_img = Image.open(floor_plan_path).convert("RGBA")
    base_img = base_img.resize((image_width, image_height), Image.LANCZOS)

    if not positions:
        base_img.save(buf, format="PNG")
        return buf.getvalue()

    s = sigma if sigma is not None else _adaptive_sigma(image_width, image_height)
    grid = _build_grid(positions, image_width, image_height, s)
    heat_img = Image.fromarray(_apply_colormap(grid), mode="RGBA")
    composite = Image.alpha_composite(base_img, heat_img)
    composite.save(buf, format="PNG")
    return buf.getvalue()


def generate_heatmap(
    positions: list[tuple[float, float]],
    floor_plan_path: str,
    image_width: int,
    image_height: int,
    output_path: str,
    sigma: float | None = None,
) -> str:
    data = generate_heatmap_bytes(positions, floor_plan_path, image_width, image_height, sigma)
    with open(output_path, "wb") as f:
        f.write(data)
    return output_path
