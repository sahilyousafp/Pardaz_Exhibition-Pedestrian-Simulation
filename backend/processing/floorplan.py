import io
import os
import tempfile
from pathlib import Path

from PIL import Image


def process_upload(file_bytes: bytes, filename: str, save_dir: str) -> dict:
    """
    Accept PNG/JPG/DWG/DXF upload.
    DWG/DXF → rasterized PNG via ezdxf+matplotlib.
    Returns {filename, width, height} of the saved PNG.
    """
    ext = Path(filename).suffix.lower()
    out_stem = Path(filename).stem

    if ext in (".dwg", ".dxf"):
        png_bytes = _dwg_to_png(file_bytes, ext)
    else:
        png_bytes = file_bytes  # assume image

    img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    width, height = img.size

    out_name = f"{out_stem}.png"
    out_path = os.path.join(save_dir, out_name)
    img.save(out_path, format="PNG")

    return {"filename": out_name, "width": width, "height": height}


def _dwg_to_png(file_bytes: bytes, ext: str) -> bytes:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import ezdxf
    from ezdxf.addons.drawing import RenderContext, Frontend
    from ezdxf.addons.drawing.matplotlib import MatplotlibBackend

    with tempfile.TemporaryDirectory() as tmpdir:
        in_path = os.path.join(tmpdir, f"input{ext}")
        out_path = os.path.join(tmpdir, "output.png")

        with open(in_path, "wb") as f:
            f.write(file_bytes)

        doc = ezdxf.readfile(in_path)
        msp = doc.modelspace()

        fig = plt.figure(figsize=(16, 12), facecolor="white")
        ax = fig.add_axes([0, 0, 1, 1])
        ax.set_aspect("equal")
        ax.axis("off")

        ctx = RenderContext(doc)
        out_backend = MatplotlibBackend(ax)
        Frontend(ctx, out_backend).draw_layout(msp, finalize=True)

        fig.savefig(out_path, dpi=150, bbox_inches="tight",
                    facecolor="white", edgecolor="none")
        plt.close(fig)

        with open(out_path, "rb") as f:
            return f.read()
