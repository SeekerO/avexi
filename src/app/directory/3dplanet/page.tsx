"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import directoryData from "../fieldoffice/directory.json";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ProvinceProperties {
    adm2_en: string;
    area_km2: number;
    adm2_psgc: number;
}

interface DecodedFeature {
    id: number;
    properties: ProvinceProperties;
    rings: [number, number][][];
    regionLabel: string;
    color: string;
}

interface Topology {
    type: "Topology";
    arcs: [number, number][][];
    transform: { scale: [number, number]; translate: [number, number] };
    objects: Record<string, any>;
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const CANVAS_W = 460;
const CANVAS_H = 720;

const REGION_FILES = [
    { file: "provdists-region-1300000000.topo.0.01.json", key: "provdists-region-1300000000", label: "NCR", color: "#991b1b" },
    { file: "provdists-region-100000000.topo.0.01.json", key: "provdists-region-100000000", label: "Ilocos Region (I)", color: "#1e40af" },
    { file: "provdists-region-200000000.topo.0.01.json", key: "provdists-region-200000000", label: "Cagayan Valley (II)", color: "#92400e" },
    { file: "provdists-region-300000000.topo.0.01.json", key: "provdists-region-300000000", label: "Central Luzon (III)", color: "#3730a3" },
    { file: "provdists-region-400000000.topo.0.01.json", key: "provdists-region-400000000", label: "CALABARZON (IV-A)", color: "#86198f" },
    { file: "provdists-region-500000000.topo.0.01.json", key: "provdists-region-500000000", label: "Bicol Region (V)", color: "#065f46" },
    { file: "provdists-region-600000000.topo.0.01.json", key: "provdists-region-600000000", label: "Western Visayas (VI)", color: "#b91c1c" },
    { file: "provdists-region-700000000.topo.0.01.json", key: "provdists-region-700000000", label: "Central Visayas (VII)", color: "#1e3a8a" },
    { file: "provdists-region-800000000.topo.0.01.json", key: "provdists-region-800000000", label: "Eastern Visayas (VIII)", color: "#166534" },
    { file: "provdists-region-900000000.topo.0.01.json", key: "provdists-region-900000000", label: "Zamboanga Peninsula (IX)", color: "#5b21b6" },
    { file: "provdists-region-1000000000.topo.0.01.json", key: "provdists-region-1000000000", label: "Northern Mindanao (X)", color: "#854d0e" },
    { file: "provdists-region-1100000000.topo.0.01.json", key: "provdists-region-1100000000", label: "Davao Region (XI)", color: "#155e75" },
    { file: "provdists-region-1200000000.topo.0.01.json", key: "provdists-region-1200000000", label: "SOCCSKSARGEN (XII)", color: "#3f6212" },
    { file: "provdists-region-1400000000.topo.0.01.json", key: "provdists-region-1400000000", label: "CAR (XIV)", color: "#166534" },
    { file: "provdists-region-1600000000.topo.0.01.json", key: "provdists-region-1600000000", label: "Caraga (XIII)", color: "#4338ca" },
    { file: "provdists-region-1700000000.topo.0.01.json", key: "provdists-region-1700000000", label: "MIMAROPA (IV-B)", color: "#be185d" },
    { file: "provdists-region-1900000000.topo.0.01.json", key: "provdists-region-1900000000", label: "BARMM", color: "#047857" },
];

const REGION_LABEL_TO_DIRECTORY_KEY: Record<string, string> = {
    "NCR": "ncr",
    "Ilocos Region (I)": "region1",
    "Cagayan Valley (II)": "region2",
    "Central Luzon (III)": "region3",
    "CALABARZON (IV-A)": "region4a",
    "MIMAROPA (IV-B)": "region4b",
    "Bicol Region (V)": "region5",
    "Western Visayas (VI)": "region6",
    "Central Visayas (VII)": "region7",
    "Eastern Visayas (VIII)": "region8",
    "Zamboanga Peninsula (IX)": "region9",
    "Northern Mindanao (X)": "region10",
    "Davao Region (XI)": "region11",
    "SOCCSKSARGEN (XII)": "region12",
    "Caraga (XIII)": "caraga",
    "CAR (XIV)": "car",
    "BARMM": "barmm",
};

// ─── UTILS ────────────────────────────────────────────────────────────────────

function decodeTopology(topo: Topology, objectKey: string): Omit<DecodedFeature, "regionLabel" | "color">[] {
    const { arcs: topoArcs, transform: { scale, translate } } = topo;
    const decodedArcs = topoArcs.map(arc => {
        let x = 0, y = 0;
        return arc.map(([dx, dy]): [number, number] => {
            x += dx; y += dy;
            return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
        });
    });

    const stitch = (indices: number[]): [number, number][] => {
        const ring: [number, number][] = [];
        indices.forEach(i => {
            const arc = i < 0 ? [...decodedArcs[~i]].reverse() : decodedArcs[i];
            ring.push(...(ring.length ? arc.slice(1) : arc));
        });
        return ring;
    };

    const geoObj = topo.objects[objectKey];
    if (!geoObj) return [];

    return geoObj.geometries.map((geom: any) => ({
        id: geom.id,
        properties: geom.properties,
        rings: geom.type === "Polygon"
            ? geom.arcs.map((g: number[]) => stitch(g))
            : geom.arcs.flatMap((p: number[][]) => p.map(g => stitch(g)))
    }));
}

function pointInPolygon(px: number, py: number, ring: [number, number][]) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PhilippineMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [allFeatures, setAllFeatures] = useState<DecodedFeature[]>([]);
    const [hoveredId, setHoveredId] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{ data: DecodedFeature; x: number; y: number } | null>(null);
    const [lockedTooltipId, setLockedTooltipId] = useState<number | null>(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const handleRedirect = ({ region, city }: { region: string; city: string }) => {
        const directoryRegionKey = REGION_LABEL_TO_DIRECTORY_KEY[region] ?? region;
        const formattedRegion = directoryRegionKey.toLowerCase().replace(/\s+/g, "");
        const formattedCity = city.toLowerCase().replace(/\s+/g, "");
        const officeCaps = formattedCity === "caraga" || formattedCity === "barmm" ? "Offices" : "offices";
        const url = `https://comelec.gov.ph/?r=ContactInformation/FieldOffices/CityMunicipalOffices/${formattedRegion + officeCaps}#${formattedCity}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    useEffect(() => {
        async function init() {
            const results: DecodedFeature[] = [];
            for (const reg of REGION_FILES) {
                try {
                    const res = await fetch(`/PhilippineMap/topojson/regions/medres/${reg.file}`);
                    if (!res.ok) continue;
                    const data = await res.json();
                    decodeTopology(data, reg.key).forEach(f =>
                        results.push({ ...f, regionLabel: reg.label, color: reg.color })
                    );
                } catch (e) { console.error(e); }
            }
            setAllFeatures(results);
            setLoading(false);
        }
        init();
    }, []);

    const bounds = useMemo(() => {
        if (allFeatures.length === 0) return null;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        allFeatures.forEach(f => f.rings.forEach(r => r.forEach(([x, y]) => {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        })));
        const pad = 60;
        const baseScale = Math.min((CANVAS_W - pad * 2) / (maxX - minX), (CANVAS_H - pad * 2) / (maxY - minY));
        const ox = (CANVAS_W - (maxX - minX) * baseScale) / 2;
        const oy = (CANVAS_H - (maxY - minY) * baseScale) / 2;
        return { minX, maxX, minY, maxY, baseScale, ox, oy };
    }, [allFeatures]);

    const project = useCallback((lon: number, lat: number): [number, number] => {
        if (!bounds) return [0, 0];
        const px = (lon - bounds.minX) * bounds.baseScale + bounds.ox;
        const py = (bounds.maxY - lat) * bounds.baseScale + bounds.oy;
        return [
            (px + transform.x) * transform.scale,
            (py + transform.y) * transform.scale
        ];
    }, [bounds, transform]);

    // ─── SEARCH & ZOOM LOGIC ───
    const searchOptions = useMemo(() => {
        const offices = directoryData.contactinformation.fieldoffices[0];
        const flatList: { name: string; region: string; isRegion: boolean }[] = [];

        Object.entries(offices).forEach(([regionKey, data]: [string, any]) => {
            const regionUpper = regionKey.toUpperCase();

            // Add the Region itself as a searchable zoom target
            flatList.push({ name: regionUpper, region: "REGION", isRegion: true });

            // Add the cities/provinces
            data.city.forEach((name: string) => {
                flatList.push({ name, region: regionUpper, isRegion: false });
            });
        });
        return flatList;
    }, []);

    const handleFocus = (name: string) => {
        const searchName = name.toLowerCase().trim();

        // 1. Helper to strip common prefixes for better matching
        const normalize = (val: string) =>
            val.toLowerCase()
                .replace("city of ", "")
                .replace("province of ", "")
                .replace("islands", "")
                .trim();

        const normalizedSearch = normalize(searchName);

        // 2. Identify Regional Targets (e.g., if user searched "NCR" or "BARMM")
        // Compares against the regionLabel assigned during the TopoJSON decoding
        const regionalFeatures = allFeatures.filter(f =>
            f.regionLabel.toLowerCase().includes(searchName) ||
            normalize(f.regionLabel).includes(normalizedSearch)
        );

        // 3. Identify Specific Location Targets (e.g., "Manila")
        // Checks if the search name matches or is contained within the property name
        const specificFeature = allFeatures.find(f => {
            const featName = (f.properties?.adm2_en?.toLowerCase() || "");
            return featName === searchName ||
                normalize(featName) === normalizedSearch ||
                featName.includes(searchName);
        });

        // Determine what we are zooming into
        const targets = regionalFeatures.length > 0 ? regionalFeatures : (specificFeature ? [specificFeature] : []);

        if (targets.length > 0 && bounds) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

            // Calculate the bounding box of all target features to center the view
            targets.forEach(target => {
                target.rings.forEach(r => r.forEach(([x, y]) => {
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                }));
            });

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            // Project the world center to canvas space
            const px = (centerX - bounds.minX) * bounds.baseScale + bounds.ox;
            const py = (bounds.maxY - centerY) * bounds.baseScale + bounds.oy;

            // Use a wider zoom for regions (2.5x) and a tighter zoom for cities (6x)
            const isRegionZoom = regionalFeatures.length > 1;
            const targetScale = isRegionZoom ? 2.5 : 6;

            setTransform({
                scale: targetScale,
                x: (CANVAS_W / 2 / targetScale) - px,
                y: (CANVAS_H / 2 / targetScale) - py
            });

            // Update the highlight: 
            // If it's a specific city, highlight it. If it's a region, clear the highlight.
            setHoveredId(specificFeature ? specificFeature.id : null);

            // Close search UI
            setIsSearchOpen(false);
            setSearchQuery("");
        }
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
        const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
        const wx = (mx / transform.scale) - transform.x;
        const wy = (my / transform.scale) - transform.y;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const ns = Math.max(0.5, Math.min(25, transform.scale * delta));
        setTransform({ scale: ns, x: (mx / ns) - wx, y: (my / ns) - wy });
    };

    const draw = useCallback(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx || allFeatures.length === 0) return;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        allFeatures.forEach(feat => {
            const isHov = feat.id === hoveredId;
            ctx.beginPath();
            feat.rings.forEach(ring => {
                ring.forEach(([lon, lat], i) => {
                    const [px, py] = project(lon, lat);
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                });
            });
            ctx.fillStyle = isHov ? "#38bdf8" : feat.color;
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.05)";
            ctx.lineWidth = 0.5 / transform.scale;
            ctx.stroke();
        });

        // Pass 2: Regional Borders
        const regions = Array.from(new Set(allFeatures.map(f => f.regionLabel)));
        regions.forEach(reg => {
            ctx.beginPath();
            allFeatures.filter(f => f.regionLabel === reg).forEach(feat => {
                feat.rings.forEach(ring => {
                    ring.forEach(([lon, lat], i) => {
                        const [px, py] = project(lon, lat);
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    });
                });
            });
            ctx.strokeStyle = "rgba(56,189,248,0.3)";
            ctx.lineWidth = 1.5 / transform.scale;
            ctx.stroke();
        });
    }, [allFeatures, hoveredId, project, transform.scale]);

    useEffect(() => { draw(); }, [draw]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        if (isDragging.current) {
            setTransform(p => ({ ...p, x: p.x + (e.clientX - lastPos.current.x) / transform.scale, y: p.y + (e.clientY - lastPos.current.y) / transform.scale }));
            lastPos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (lockedTooltipId !== null) {
            return;
        }

        const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
        const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);
        const hit = allFeatures.find(f => f.rings.some(r => pointInPolygon(mx, my, r.map(p => project(p[0], p[1])) as [number, number][])));
        setHoveredId(hit?.id || null);
        setTooltip(hit ? { x: e.clientX, y: e.clientY, data: hit } : null);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden">
            <header className="mb-8 text-center">
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">PH <span className="text-sky-400">Explorer</span></h1>
            </header>

            {/* Directory Search */}
            <div className="relative w-full max-w-[460px] mb-6 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 flex items-center">
                    <input
                        className="bg-transparent text-white outline-none w-full text-sm"
                        placeholder="Search from Directory..."
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                    />
                </div>
                {isSearchOpen && searchQuery.length > 1 && (
                    <div className="absolute top-full w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                        {searchOptions.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase())).map((o, i) => (
                            <button key={i} onClick={() => handleFocus(o.name)} className="w-full text-left p-3 text-sm text-slate-300 hover:bg-sky-500 hover:text-white capitalize border-b border-white/5 last:border-none">
                                {o.name} <span className="text-[9px] opacity-40 float-right mt-1">{o.region}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative rounded-[2.5rem] border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden cursor-move">
                <canvas
                    ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                    onWheel={handleWheel}
                    onMouseDown={e => { isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={() => isDragging.current = false}
                    onMouseLeave={() => { isDragging.current = false; setLockedTooltipId(null); setTooltip(null); }}
                />
                <div className="absolute top-6 left-6 px-4 py-1.5 bg-slate-950/60 backdrop-blur-xl rounded-full border border-white/10 text-[10px] text-sky-400 font-black tracking-widest">
                    ZOOM: {transform.scale.toFixed(1)}x
                </div>
            </div>

            {tooltip && (
                <div className="fixed z-50 transform -translate-x-1/2 -translate-y-[115%]" style={{ left: tooltip.x, top: tooltip.y }}>
                    <div className="bg-slate-900/95 border border-sky-500/40 backdrop-blur-2xl p-5 rounded-3xl shadow-2xl min-w-[220px] text-white pointer-events-auto">
                        <span className="text-sky-400 font-black text-[10px] uppercase tracking-[0.2em]">{tooltip.data.regionLabel}</span>
                        <h3 className="text-2xl font-black mt-1 tracking-tight">{tooltip.data.properties.adm2_en}</h3>
                        <button
                            className="mt-3 inline-flex items-center rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-400 transition"
                            onClick={e => {
                                e.stopPropagation();
                                setLockedTooltipId(tooltip.data.id);
                                handleRedirect({
                                    region: tooltip.data.regionLabel,
                                    city: tooltip.data.properties.adm2_en,
                                });
                            }}
                        >
                            View regional offices
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}