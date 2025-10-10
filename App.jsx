import React, { useMemo, useRef, useState, useEffect } from "react";

/**
 * Scrollwork Generator – single-file React app
 * Client-side only. Upload an SVG outline, pick a style, adjust intricacy, export SVG.
 */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randBetween(rng, min, max) { return min + (max - min) * rng(); }

function spiralPath(cx, cy, r0, turns, rot, k = 0.22) {
  const pts = [];
  const steps = Math.max(6, Math.floor(60 * Math.abs(turns)));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const r = r0 * Math.exp(0.12 * t);
    const x = cx + r * Math.cos(t + rot);
    const y = cy + r * Math.sin(t + rot);
    pts.push([x, y]);
  }
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const c1x = p0[0] + dx * k;
    const c1y = p0[1] + dy * k;
    const c2x = p1[0] - dx * k;
    const c2y = p1[1] - dy * k;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`;
  }
  return d;
}

function leafPath(x, y, angle, len) {
  const c1x = x + (len * 0.35) * Math.cos(angle - 0.9);
  const c1y = y + (len * 0.35) * Math.sin(angle - 0.9);
  const tipX = x + len * Math.cos(angle);
  const tipY = y + len * Math.sin(angle);
  const c2x = x + (len * 0.35) * Math.cos(angle + 0.9);
  const c2y = y + (len * 0.35) * Math.sin(angle + 0.9);
  const backX = x + (len * 0.15) * Math.cos(angle + Math.PI);
  const backY = y + (len * 0.15) * Math.sin(angle + Math.PI);
  return `M ${x.toFixed(2)} ${y.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} Q ${backX.toFixed(2)} ${backY.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
}

const DEFAULT_OUTLINE_PATH = `M 20 140 Q 40 110 120 105 Q 240 98 360 110 Q 430 117 480 102 Q 530 87 580 110 Q 630 133 690 130 Q 780 126 860 145 Q 900 155 915 185 Q 930 215 915 245 Q 880 315 800 330 Q 720 345 640 338 Q 600 334 520 352 Q 440 370 360 355 Q 280 340 210 350 Q 140 360 90 330 Q 40 300 25 260 Q 10 220 20 140 Z M 835 210 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0 Z`;

const STYLES = {
  Acanthus: { stroke: "#000", strokeWidth: 1.6, leafScale: 1, leafFreq: 0.35, spiralTurns: [0.8,1.2], r0:[4,9] },
  Victorian:{ stroke: "#000", strokeWidth: 1.2, leafScale: 0.8, leafFreq: 0.2, spiralTurns:[1.0,1.6], r0:[3,7] },
  Western:  { stroke: "#000", strokeWidth: 2.0, leafScale: 1.2, leafFreq: 0.28, spiralTurns:[0.7,1.0], r0:[5,10] },
  Minimal:  { stroke: "#000", strokeWidth: 1.4, leafScale: 0.4, leafFreq: 0.08, spiralTurns:[0.6,0.9], r0:[6,12] },
};

function useWindowSize() {
  const [s, setS] = React.useState({ w: 1200, h: 800 });
  React.useEffect(() => {
    const onR = () => setS({ w: window.innerWidth, h: window.innerHeight });
    onR();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return s;
}

export default function App() {
  const { w } = useWindowSize();
  const [outlinePath, setOutlinePath] = React.useState(DEFAULT_OUTLINE_PATH);
  const [styleKey, setStyleKey] = React.useState("Acanthus");
  const [intricacy, setIntricacy] = React.useState(60);
  const [thickness, setThickness] = React.useState(1);
  const [seed, setSeed] = React.useState(12345);
  const [invert, setInvert] = React.useState(false);
  const svgRef = React.useRef(null);
  const style = STYLES[styleKey];

  const viewBox = React.useMemo(() => {
    const tmp = document.createElementNS("http://www.w3.org/2000/svg","svg");
    const p = document.createElementNS("http://www.w3.org/2000/svg","path");
    p.setAttribute("d", outlinePath);
    p.setAttribute("fill", "#000");
    p.setAttribute("fill-rule", "evenodd");
    tmp.appendChild(p);
    document.body.appendChild(tmp);
    const bbox = p.getBBox();
    document.body.removeChild(tmp);
    const pad = 20;
    return { minX: bbox.x - pad, minY: bbox.y - pad, width: bbox.width + pad*2, height: bbox.height + pad*2 };
  }, [outlinePath]);

  const motifs = React.useMemo(() => {
    const rng = mulberry32(seed);
    const count = Math.floor((intricacy / 10) * 18);
    const items = [];
    const { minX, minY, width, height } = viewBox;

    for (let i = 0; i < count; i++) {
      const cx = randBetween(rng, minX + 10, minX + width - 10);
      const cy = randBetween(rng, minY + 10, minY + height - 10);
      const turns = randBetween(rng, style.spiralTurns[0], style.spiralTurns[1]);
      const r0 = randBetween(rng, style.r0[0], style.r0[1]);
      const rot = randBetween(rng, 0, Math.PI * 2);
      const dSpiral = spiralPath(cx, cy, r0, turns, rot, 0.25);

      const leaves = [];
      const leafCount = Math.floor(intricacy * style.leafFreq * (0.8 + Math.random()*0.5));
      for (let j = 0; j < leafCount; j++) {
        const ang = randBetween(rng, 0, Math.PI*2);
        const len = randBetween(rng, 6, 12) * style.leafScale;
        const lx = cx + randBetween(rng, r0*0.5, r0*3) * Math.cos(ang);
        const ly = cy + randBetween(rng, r0*0.5, r0*3) * Math.sin(ang);
        leaves.push(leafPath(lx, ly, ang + Math.PI * (rng() > 0.5 ? 1 : 0), len));
      }
      items.push({ dSpiral, leaves });
    }
    return items;
  }, [intricacy, seed, style, viewBox]);

  const handleSvgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const txt = await file.text();
    try {
      const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
      const pathEl = doc.querySelector("path");
      if (!pathEl) { alert("SVG must contain a <path>"); return; }
      const d = pathEl.getAttribute("d");
      setOutlinePath(d);
    } catch { alert("Could not read SVG"); }
  };

  const exportSVG = () => {
    const { minX, minY, width, height } = viewBox;
    const serializer = new XMLSerializer();
    const node = svgRef.current.cloneNode(true);
    node.querySelectorAll("#clipOutline").forEach((el) => el.setAttribute("id", "clipOutlineExport"));
    node.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    node.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgText = serializer.serializeToString(node);
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scrollwork_${styleKey}_seed${seed}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{fontFamily:"Inter, ui-sans-serif, system-ui"}}>
      <div style={{position:"sticky", top:0, background:"#fff", borderBottom:"1px solid #eee", padding:"10px 16px", display:"flex", gap:12, alignItems:"center"}}>
        <strong>Scrollwork Generator</strong>
        <label>Upload outline SVG <input type="file" accept=".svg" onChange={handleSvgUpload} /></label>
        <label>Style
          <select value={styleKey} onChange={(e)=>setStyleKey(e.target.value)}>
            {Object.keys(STYLES).map(k=> <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label>Intricacy
          <input type="range" min={10} max={120} value={intricacy} onChange={(e)=>setIntricacy(parseInt(e.target.value))} />
          <span>{intricacy}</span>
        </label>
        <label>Thickness
          <input type="range" min={0.5} max={2} step={0.1} value={thickness} onChange={(e)=>setThickness(parseFloat(e.target.value))} />
          <span>{thickness.toFixed(1)}x</span>
        </label>
        <label>Seed <input type="number" style={{width:90}} value={seed} onChange={(e)=>setSeed(parseInt(e.target.value||'0'))} /></label>
        <label><input type="checkbox" checked={invert} onChange={(e)=>setInvert(e.target.checked)} /> Invert</label>
        <button onClick={exportSVG}>Download SVG</button>
      </div>

      <div style={{padding:16}}>
        <svg ref={svgRef}
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          width="100%" height="700">
          <defs>
            <clipPath id="clipOutline" clipPathUnits="userSpaceOnUse">
              <path d={outlinePath} fill="#000" fillRule="evenodd" />
            </clipPath>
          </defs>

          <path d={outlinePath} fill={invert ? "#000":"#fff"} fillRule="evenodd" stroke="#000" strokeWidth={2.4 * thickness} />
          <g clipPath="url(#clipOutline)">
            {motifs.map((m, i) => (
              <g key={i}>
                <path d={m.dSpiral} stroke={style.stroke} fill="none" strokeWidth={style.strokeWidth * thickness} strokeLinecap="round" />
                {m.leaves.map((ld, j) => (
                  <path key={j} d={ld} stroke={style.stroke} fill="none" strokeWidth={(style.strokeWidth * 0.8) * thickness} strokeLinecap="round" />
                ))}
              </g>
            ))}
          </g>
          <path d={outlinePath} fill="none" stroke={invert ? "#fff":"#000"} strokeWidth={2.4 * thickness} />
        </svg>
      </div>
    </div>
  );
}
