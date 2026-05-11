import math
import random
import jupedsim as jps
from shapely.geometry import Polygon, Point as SPoint, MultiPolygon, LineString
from shapely.ops import unary_union, nearest_points


MAX_STEPS = 14000
DT = 0.01           # seconds per simulation step
ARRIVAL_RADIUS = 0.8  # metres — agent considered at POI within this distance
SPAWN_JITTER = 0.3  # metres — random spread around entry point
AGENT_RADIUS = 0.2  # metres
MIN_AGENT_SEP = AGENT_RADIUS * 2 + 0.1  # minimum centre-to-centre at spawn
SPACE_BUFFER_M = 0.08  # tiny buffer to close float-precision gaps between adjacent walls
AUTO_BRIDGE_M = 8.0   # auto-connect disconnected space components within this gap (metres)
BRIDGE_WIDTH_M = 0.8  # width of auto-generated corridor bridges


def _scale(pts, mpp):
    return [(x * mpp, y * mpp) for x, y in pts]


def _dist(a, b):
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


_SAFE_INSET = 0.25  # metres — how far inside the boundary agents/waypoints are placed
_DOORWAY_HALF_WIDTH_M = 0.45  # metres — buffered doorway area around entry/exit lines


def _safe_interior(walkable):
    """Return a geometry that is safely inset from the walkable boundary."""
    eroded = walkable.buffer(-_SAFE_INSET)
    if eroded.is_empty or eroded.geom_type not in ("Polygon", "MultiPolygon"):
        # Space is too narrow to erode; fall back to the original
        return walkable
    if eroded.geom_type == "MultiPolygon":
        eroded = max(eroded.geoms, key=lambda g: g.area)
    return eroded


def _auto_bridge(walkable):
    """
    If the walkable area is a MultiPolygon, add thin corridor bridges between
    components that are within AUTO_BRIDGE_M of each other in one pass.
    This handles floor plans where circular terraces are drawn as isolated
    islands connected by an unmarked walkway.
    """
    if walkable.geom_type != "MultiPolygon":
        return walkable

    geoms = list(walkable.geoms)
    bridges = []
    for i in range(len(geoms)):
        for j in range(i + 1, len(geoms)):
            gap = geoms[i].distance(geoms[j])
            if 0 < gap <= AUTO_BRIDGE_M:
                # Use centroids so the line passes THROUGH both polygons,
                # guaranteeing the buffered bridge overlaps and merges them.
                c1 = geoms[i].centroid
                c2 = geoms[j].centroid
                bridge = LineString([(c1.x, c1.y), (c2.x, c2.y)]).buffer(BRIDGE_WIDTH_M)
                bridges.append(bridge)

    if not bridges:
        return walkable

    result = unary_union(geoms + bridges).buffer(0)
    return result


def _clamp_to_interior(point_m: tuple, walkable) -> tuple:
    """Snap point into the safely inset walkable area so JuPedSim accepts it."""
    interior = _safe_interior(walkable)
    p = SPoint(point_m)
    if interior.contains(p):
        return point_m
    # Project to nearest point on the safe interior boundary
    near = nearest_points(interior, p)[0]
    return (near.x, near.y)


def _doorway_polygon(p1_m: tuple, p2_m: tuple):
    """Return a small polygon around a doorway line so entry/exit can be treated as area."""
    return LineString([p1_m, p2_m]).buffer(_DOORWAY_HALF_WIDTH_M, cap_style=2)


def run_simulation(annotation: dict, image_height: int = None) -> dict:
    """
    Run a JuPedSim pedestrian simulation from annotation data.
    
    HYBRID NAVIGATION APPROACH:
    1. ZONES (Spaces) — Free-form walkable areas where agents navigate via collision avoidance
    2. POIs — Activity points where agents dwell (pause) for a specified duration
    3. PATHS (Waypoints) — Optional explicit routes that OVERRIDE free navigation
    
    WAYPOINT PRIORITY:
    - If explicit paths exist: agents follow path waypoints in sequence in either direction
    - If no paths: agents route via POI dwell sequence (if POIs exist) or directly to exit
    - POI dwell is triggered when agent reaches within ARRIVAL_RADIUS (0.8m) of POI
    - Agents switch to next POI after dwell_time elapses
    
    COORDINATE SYSTEM:
    - Annotation coordinates are in PIXELS (top-left origin)
    - JuPedSim coordinates are in METRES (arbitrary origin)
    - Conversion: meters_to_pixels = position_m / scale_mpp
    - Y-axis is inverted for heatmap alignment: y_px = image_height - (y_m / mpp)
    
    Args:
        annotation: Dict with spaces, pois, entries, exits, paths, scale_mpp, num_people
        image_height: Height of floor plan image (for Y-axis inversion in heatmap)
    
    Returns: Dict with positions, trajectories, total_steps, total_agents
    """
    mpp: float = annotation["scale_mpp"]
    spaces = annotation["spaces"]
    pois = annotation["pois"]
    entries_px: list[dict] = annotation["entries"]   # [{position: [x,y]}, ...]
    exits_px: list[dict] = annotation["exits"]       # [{polygon: [[x,y],...]}]
    num_people: int = annotation["num_people"]

    # --- 1. Build walkable geometry ---
    # Buffer each space slightly so adjacent rooms that share a wall connect properly
    space_polys_m = []
    for s in spaces:
        pts_m = _scale(s["polygon"], mpp)
        poly = Polygon(pts_m).buffer(SPACE_BUFFER_M)
        if poly.is_valid and not poly.is_empty:
            space_polys_m.append(poly)

    if not space_polys_m:
        raise ValueError("No valid space polygons provided")

    walkable = unary_union(space_polys_m)
    # Auto-bridge disconnected space components (e.g. circular terraces joined by a walkway
    # that the user forgot to draw as a space polygon).
    walkable = _auto_bridge(walkable)
    # Final cleanup — ensure single Polygon
    if isinstance(walkable, MultiPolygon):
        walkable = max(walkable.geoms, key=lambda g: g.area)
    walkable = walkable.buffer(0)

    if walkable.is_empty:
        raise ValueError("Walkable area is empty after union")

    # --- 2. Create simulation ---
    model = jps.CollisionFreeSpeedModel()
    sim = jps.Simulation(model=model, geometry=walkable, dt=DT)

    # --- 3. Add exit stages ---
    # Buffer each exit line into a doorway polygon, clamp it into the walkable area,
    # then use that polygon as the exit zone. This means the doorway itself is treated
    # as an area, not just a thin line, so users do not need to draw extra geometry.
    exit_stage_ids = []
    for ex in exits_px:
        p1_m = (ex["p1"][0] * mpp, ex["p1"][1] * mpp)
        p2_m = (ex["p2"][0] * mpp, ex["p2"][1] * mpp)
        zone = _doorway_polygon(p1_m, p2_m)
        clipped = zone.intersection(walkable.buffer(0.05))
        if not clipped.is_empty and clipped.geom_type in ("Polygon", "MultiPolygon"):
            zone = clipped if clipped.geom_type == "Polygon" else max(clipped.geoms, key=lambda g: g.area)
        exit_zone = zone.convex_hull
        eid = sim.add_exit_stage(exit_zone)
        exit_stage_ids.append(eid)

    primary_exit_id = exit_stage_ids[0]
    exit_journey_id = sim.add_journey(jps.JourneyDescription([primary_exit_id]))

    # --- 4. Build waypoint sequence ---
    # Priority: if the user drew an explicit path, use those waypoints in order.
    # Otherwise fall back to POI-based routing.
    paths_px: list[list] = annotation.get("paths", [])
    use_manual_path = any(len(p.get("points", [])) >= 2 for p in paths_px)

    # Build forward and reverse journeys per drawn path; agents are distributed round-robin.
    path_journeys: list[dict] = []   # [{journey_id, first_stage_id}]

    if use_manual_path:
        for path in paths_px:
            pts = path.get("points", [])
            if len(pts) < 2:
                continue
            for route_pts in (pts, list(reversed(pts))):
                stages = []
                for pt in route_pts:
                    pos_m = _clamp_to_interior((pt[0] * mpp, pt[1] * mpp), walkable)
                    sid = sim.add_waypoint_stage(pos_m, ARRIVAL_RADIUS)
                    stages.append(sid)
                all_sids = stages + [primary_exit_id]
                jid = sim.add_journey(jps.JourneyDescription(all_sids))
                path_journeys.append({"journey_id": jid, "first_stage_id": stages[0]})

        poi_data = []
        first_jid = path_journeys[0]["journey_id"]
        first_sid = path_journeys[0]["first_stage_id"]
    else:
        # POI-based routing (original behaviour)
        path_stages = []
        poi_at_stage = {}
        poi_data = []
        for poi in pois:
            pos_m = _clamp_to_interior((poi["position"][0] * mpp, poi["position"][1] * mpp), walkable)
            sid = sim.add_waypoint_stage(pos_m, ARRIVAL_RADIUS)
            jd  = jps.JourneyDescription([sid, primary_exit_id])
            jid = sim.add_journey(jd)
            poi_data.append({
                "stage_id": sid, "pos_m": pos_m,
                "dwell_time": float(poi.get("dwell_time", 10)), "journey_id": jid,
            })
        first_jid = poi_data[0]["journey_id"] if poi_data else exit_journey_id
        first_sid = poi_data[0]["stage_id"]   if poi_data else primary_exit_id

    # --- 5. Build entry spawn positions along each doorway line ---
    entry_lines_m: list[tuple[tuple, tuple]] = []
    for ep in entries_px:
        p1_m = _clamp_to_interior((ep["p1"][0] * mpp, ep["p1"][1] * mpp), walkable)
        p2_m = _clamp_to_interior((ep["p2"][0] * mpp, ep["p2"][1] * mpp), walkable)
        entry_lines_m.append((p1_m, p2_m))

    entry_spawn_pool = []
    for p1_m, p2_m in entry_lines_m:
        line_length = _dist(p1_m, p2_m)
        spawn_count = max(1, int(line_length / MIN_AGENT_SEP))
        for k in range(spawn_count):
            t = k / max(spawn_count - 1, 1)
            entry_spawn_pool.append((
                p1_m[0] + t * (p2_m[0] - p1_m[0]),
                p1_m[1] + t * (p2_m[1] - p1_m[1]),
            ))
    if not entry_spawn_pool:
        entry_spawn_pool = [tuple(walkable.centroid.coords[0])]

    # --- 6. Agent spawning helpers ---
    agent_state: dict[int, dict] = {}

    def _find_spawn_pos() -> tuple | None:
        existing = [a.position for a in sim.agents()]
        candidates = entry_spawn_pool.copy()
        random.shuffle(candidates)
        for base in candidates:
            if walkable.contains(SPoint(base)) and all(_dist(base, ep) >= MIN_AGENT_SEP for ep in existing):
                return base
        return None

    def _spawn_agent(agent_index: int) -> int | None:
        pos = _find_spawn_pos()
        if pos is None:
            return None
        # Assign path round-robin when multiple paths exist
        if use_manual_path and path_journeys:
            pj = path_journeys[agent_index % len(path_journeys)]
            jid, sid = pj["journey_id"], pj["first_stage_id"]
        else:
            jid, sid = first_jid, first_sid
        try:
            aid = sim.add_agent(jps.CollisionFreeSpeedModelAgentParameters(
                position=pos,
                journey_id=jid,
                stage_id=sid,
                radius=AGENT_RADIUS,
                desired_speed=random.uniform(1.0, 1.4),
            ))
        except RuntimeError:
            return None
        agent_state[aid] = {"poi_idx": 0, "dwell_start": None, "dwelling": False}
        return aid

    spawn_interval = 150  # ~1.5 s between spawns
    spawned = 0
    pending_spawn = False

    # --- 7. Simulation loop ---
    positions: list[tuple] = []
    trajectories: list[tuple] = []

    for step in range(MAX_STEPS):
        current_time = step * DT

        # Spawn
        if spawned < num_people and (step % spawn_interval == 0 or pending_spawn):
            aid = _spawn_agent(spawned)
            if aid is not None:
                spawned += 1
                pending_spawn = False
            else:
                pending_spawn = True

        # Dwell management (POI-routing mode only — manual path auto-advances via JuPedSim)
        if not use_manual_path:
            agents_to_switch = []
            for agent in sim.agents():
                aid = agent.id
                state = agent_state.get(aid)
                if not state:
                    continue
                poi_idx = state["poi_idx"]
                if poi_idx >= len(poi_data):
                    continue
                pd = poi_data[poi_idx]
                if not state["dwelling"]:
                    if _dist(agent.position, pd["pos_m"]) <= ARRIVAL_RADIUS:
                        state["dwelling"] = True
                        state["dwell_start"] = current_time
                else:
                    if current_time - state["dwell_start"] >= pd["dwell_time"]:
                        agents_to_switch.append((aid, poi_idx + 1))

            for aid, next_idx in agents_to_switch:
                s = agent_state[aid]
                s["poi_idx"] = next_idx
                s["dwelling"] = False
                s["dwell_start"] = None
                if next_idx < len(poi_data):
                    npd = poi_data[next_idx]
                    sim.switch_agent_journey(aid, npd["journey_id"], npd["stage_id"])
                else:
                    sim.switch_agent_journey(aid, exit_journey_id, primary_exit_id)

        sim.iterate()

        # Collect positions every step for dense heatmap coverage
        for agent in sim.agents():
            x_m, y_m = agent.position
            x_px = x_m / mpp
            y_px = y_m / mpp
            # Invert Y-axis if image_height provided to match canvas coordinates
            if image_height is not None:
                y_px = image_height - y_px
            positions.append((x_px, y_px))
            if step % 3 == 0:   # trajectory sampled every 3 steps (lighter payload)
                trajectories.append((x_px, y_px, current_time))

        if spawned >= num_people and sim.agent_count() == 0:
            break

    return {
        "positions": positions,
        "trajectories": trajectories,
        "total_steps": step,
        "total_agents": spawned,
    }
