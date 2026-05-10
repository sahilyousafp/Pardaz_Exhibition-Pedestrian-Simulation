import os
import uuid
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from processing.floorplan import process_upload
from processing.heatmap import generate_heatmap_bytes
from simulation.engine import run_simulation
from simulation.centrality import build_space_graph, compute_centrality, graph_to_serializable

# ---------------------------------------------------------------------------
# Setup directories
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
HEATMAP_DIR = BASE_DIR / "heatmaps"
UPLOAD_DIR.mkdir(exist_ok=True)
HEATMAP_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Pardaz Social Simulation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/heatmaps", StaticFiles(directory=str(HEATMAP_DIR)), name="heatmaps")


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class PoiAnnotation(BaseModel):
    id: str
    label: str = ""
    position: list[float]  # [x_px, y_px]
    dwell_time: float = 10.0  # seconds

class SpaceAnnotation(BaseModel):
    id: str
    label: str = ""
    polygon: list[list[float]]  # [[x,y], ...]

class EntryAnnotation(BaseModel):
    p1: list[float]  # [x_px, y_px] — first end of doorway line
    p2: list[float]  # [x_px, y_px] — second end of doorway line

class ExitAnnotation(BaseModel):
    p1: list[float]  # [x_px, y_px] — first end of exit line
    p2: list[float]  # [x_px, y_px] — second end of exit line

class PathAnnotation(BaseModel):
    points: list[list[float]]   # [[x,y], ...] ordered waypoints in px

class SimulationRequest(BaseModel):
    image_filename: str
    image_width: int
    image_height: int
    scale_mpp: float = Field(default=0.05, gt=0)
    spaces: list[SpaceAnnotation]
    entries: list[EntryAnnotation]
    exits: list[ExitAnnotation]
    pois: list[PoiAnnotation]
    paths: list[PathAnnotation] = []   # optional explicit agent routes (one per group)
    num_people: int = Field(default=20, ge=1, le=500)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/upload")
async def upload_floor_plan(file: UploadFile = File(...)):
    """
    Accept PNG, JPG, DWG, or DXF floor plan upload.
    Returns the stored filename and image dimensions.
    """
    allowed = {".png", ".jpg", ".jpeg", ".dwg", ".dxf"}
    ext = Path(file.filename or "file.png").suffix.lower()
    if ext not in allowed:
        raise HTTPException(400, f"File type {ext} not supported. Use: {allowed}")

    file_bytes = await file.read()
    result = process_upload(file_bytes, file.filename, str(UPLOAD_DIR))

    return JSONResponse({
        "filename": result["filename"],
        "image_url": f"/uploads/{result['filename']}",
        "width": result["width"],
        "height": result["height"],
    })


@app.post("/api/simulate")
async def simulate(req: SimulationRequest):
    """
    Run pedestrian simulation and return heatmap + centrality results.
    """
    floor_plan_path = UPLOAD_DIR / req.image_filename
    if not floor_plan_path.exists():
        raise HTTPException(404, f"Floor plan {req.image_filename} not found")

    # Build annotation dict for engine
    annotation = {
        "scale_mpp": req.scale_mpp,
        "spaces": [s.model_dump() for s in req.spaces],
        "entries": [e.model_dump() for e in req.entries],
        "exits": [x.model_dump() for x in req.exits],
        "pois": [p.model_dump() for p in req.pois],
        "paths": [p.model_dump() for p in req.paths],
        "num_people": req.num_people,
    }

    # Pre-flight: warn if entries/exits are fully outside all space polygons
    from shapely.geometry import Polygon as _Poly, LineString as _LS
    from shapely.ops import unary_union as _union
    _space_union = _union([_Poly(s["polygon"]).buffer(20) for s in annotation["spaces"]])
    warnings = []
    for i, ep in enumerate(annotation["entries"]):
        line = _LS([ep["p1"], ep["p2"]])
        if not _space_union.intersects(line):
            warnings.append(f"Entry {i+1} line is outside your space polygons — draw it across a doorway inside a space")
    for i, ex in enumerate(annotation["exits"]):
        line = _LS([ex["p1"], ex["p2"]])
        if not _space_union.intersects(line):
            warnings.append(f"Exit {i+1} line is outside your space polygons — draw it across a doorway inside a space")

    # Run JuPedSim simulation
    try:
        sim_result = run_simulation(annotation)
    except Exception as e:
        raise HTTPException(500, f"Simulation error: {e}")

    # Generate heatmap
    heatmap_id = uuid.uuid4().hex[:12]
    heatmap_name = f"heatmap_{heatmap_id}.png"
    heatmap_path = HEATMAP_DIR / heatmap_name

    heatmap_bytes = generate_heatmap_bytes(
        positions=sim_result["positions"],
        floor_plan_path=str(floor_plan_path),
        image_width=req.image_width,
        image_height=req.image_height,
    )
    heatmap_path.write_bytes(heatmap_bytes)

    # Compute centrality with annotation for foot traffic weights
    G = build_space_graph(annotation["spaces"], annotation.get("pois"), annotation["scale_mpp"])
    centrality = compute_centrality(G, annotation)
    graph_data = graph_to_serializable(G, centrality)

    # Sample trajectory (cap at 5000 points for frontend)
    traj = sim_result["trajectories"]
    step = max(1, len(traj) // 5000)
    traj_sampled = traj[::step]

    return JSONResponse({
        "heatmap_url": f"/heatmaps/{heatmap_name}",
        "centrality": centrality,
        "graph": graph_data,
        "trajectory_points": traj_sampled,
        "warnings": warnings,
        "stats": {
            "total_agents": sim_result["total_agents"],
            "total_steps": sim_result["total_steps"],
            "position_samples": len(sim_result["positions"]),
        },
    })
