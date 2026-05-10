import networkx as nx
from shapely.geometry import Polygon

ADJACENCY_THRESHOLD_PX = 15  # pixels — spaces within this distance are considered adjacent


def build_space_graph(spaces: list[dict], pois: list[dict] = None, mpp: float = 0.05) -> nx.Graph:
    G = nx.Graph()

    polys: dict[str, Polygon] = {}
    for s in spaces:
        sid = s["id"]
        poly = Polygon(s["polygon"])
        if poly.is_valid and not poly.is_empty:
            polys[sid] = poly
            cx, cy = poly.centroid.x, poly.centroid.y
            G.add_node(sid, label=s.get("label", sid), centroid=[cx, cy])

    ids = list(polys.keys())
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            if polys[a].distance(polys[b]) <= ADJACENCY_THRESHOLD_PX:
                G.add_edge(a, b)

    # Add POI dwell time weights to nodes for spatial preference
    if pois:
        for poi in pois:
            pos = poi.get("position", [0, 0])
            poi_point = Polygon([(pos[0], pos[1]), (pos[0] + 1, pos[1]), (pos[0] + 1, pos[1] + 1), (pos[0], pos[1] + 1)])
            dwell = poi.get("dwell_time", 0)
            for sid in G.nodes():
                if polys[sid].contains(poi_point.centroid):
                    G.nodes[sid]["dwell_weight"] = G.nodes[sid].get("dwell_weight", 0) + dwell
                    break

    return G


def compute_centrality(G: nx.Graph, annotation: dict = None) -> dict[str, dict]:
    if len(G.nodes) == 0:
        return {}

    betweenness = nx.betweenness_centrality(G, normalized=True)
    degree = nx.degree_centrality(G)

    # Eigenvector centrality needs connected graph; fall back to degree on failure
    try:
        eigenvector = nx.eigenvector_centrality(G, max_iter=500, tol=1e-6)
    except (nx.PowerIterationFailedConvergence, nx.NetworkXException):
        eigenvector = degree.copy()

    # Calculate foot traffic density if annotation provided
    foot_traffic = {}
    if annotation and "spaces" in annotation:
        pois = annotation.get("pois", [])
        total_dwell = sum(p.get("dwell_time", 10) for p in pois) or 1
        
        for node in G.nodes():
            # Sum dwell times of POIs in this space
            node_dwell = G.nodes[node].get("dwell_weight", 0)
            foot_traffic[node] = node_dwell / total_dwell if total_dwell > 0 else 0

    result = {}
    for node in G.nodes():
        traffic = foot_traffic.get(node, 0) if foot_traffic else 0
        # Weight betweenness by foot traffic (spaces with higher dwell are more important)
        weighted_betweenness = (betweenness.get(node, 0) * 0.6) + (traffic * 0.4)
        
        result[node] = {
            "label": G.nodes[node].get("label", node),
            "centroid": G.nodes[node].get("centroid", [0, 0]),
            "betweenness": round(weighted_betweenness, 4),
            "eigenvector": round(eigenvector.get(node, 0), 4),
            "degree": round(degree.get(node, 0), 4),
            "foot_traffic": round(traffic, 4),
        }

    return result


def graph_to_serializable(G: nx.Graph, centrality: dict) -> dict:
    nodes = []
    for nid, data in G.nodes(data=True):
        c = centrality.get(nid, {})
        nodes.append({
            "id": nid,
            "label": data.get("label", nid),
            "centroid": data.get("centroid", [0, 0]),
            "betweenness": c.get("betweenness", 0),
            "eigenvector": c.get("eigenvector", 0),
            "degree": c.get("degree", 0),
            "foot_traffic": c.get("foot_traffic", 0),
        })

    edges = [{"source": u, "target": v} for u, v in G.edges()]

    return {"nodes": nodes, "edges": edges}
