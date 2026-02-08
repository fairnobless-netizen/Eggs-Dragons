import json
from PIL import Image
import numpy as np

PNG_IN = "public/game/dragon/dragon_move.png"
JSON_OUT = "public/game/dragon/dragon_move.json"

# Жёсткая сетка 5x5 (твой sheet 2048x2048)
GRID_COLS = 5
GRID_ROWS = 5
CROP_BOTTOM_PX = 7  # сколько пикселей режем снизу кадра

# Паддинг вокруг найденного bbox, чтобы не "срезать" контуры
PAD = 2

img = Image.open(PNG_IN).convert("RGBA")
arr = np.array(img)
H, W = arr.shape[0], arr.shape[1]

alpha = arr[:, :, 3]
mask = alpha > 0  # фон прозрачный => это лучший и самый надёжный критерий

cell_w = W // GRID_COLS
cell_h = H // GRID_ROWS

def cell_bounds(i, n, cell_size, max_size):
    start = i * cell_size
    # последний блок добирает остаток пикселей
    end = (i + 1) * cell_size - 1 if i < n - 1 else max_size - 1
    return start, end

frames = {}

for r in range(GRID_ROWS):
    y0, y1 = cell_bounds(r, GRID_ROWS, cell_h, H)
    for c in range(GRID_COLS):
        x0, x1 = cell_bounds(c, GRID_COLS, cell_w, W)

                # СТАБИЛЬНО: берём кадр строго по границам клетки (без bbox, без PAD)
        name = f"f_{r}_{c}"

        xmin = x0
        ymin = y0
        w = int(x1 - x0 + 1)
        h = int(y1 - y0 + 1) - CROP_BOTTOM_PX
        h = max(h, 1)



        frames[name] = {


            "frame": {"x": int(xmin), "y": int(ymin), "w": w, "h": h},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
            "sourceSize": {"w": w, "h": h}
        }

atlas = {
    "frames": frames,
    "meta": {
        "app": "make_dragon_atlas.py",
        "image": "dragon_move.png",
        "size": {"w": W, "h": H},
        "scale": "1"
    }
}

with open(JSON_OUT, "w", encoding="utf-8") as f:
    json.dump(atlas, f, ensure_ascii=False, indent=2)

print(f"OK: wrote {JSON_OUT} with {len(frames)} frames (grid {GRID_ROWS}x{GRID_COLS})")
