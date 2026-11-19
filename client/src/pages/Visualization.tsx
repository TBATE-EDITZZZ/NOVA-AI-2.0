import { useMemo, useState } from "react";
import { BarChart3, Download, FileSpreadsheet, Upload, X } from "lucide-react";

type Dataset = { headers: string[]; rows: string[][]; name: string };
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
}
function parseCsv(text: string, name: string): Dataset {
  const rawLines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (rawLines.length < 2) throw new Error("The CSV needs a header row and at least one data row.");
  const headers = parseCsvLine(rawLines[0]).map((header, index) => header || `Column ${index + 1}`);
  const rows = rawLines.slice(1, 10001).map(parseCsvLine).filter(row => row.some(value => value !== ""));
  if (!headers.length || !rows.length) throw new Error("No usable rows were found in this CSV.");
  return { headers, rows, name };
}

export default function Visualization() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [xColumn, setXColumn] = useState(0);
  const [yColumn, setYColumn] = useState(1);
  const [error, setError] = useState("");
  const numericColumns = useMemo(() => dataset ? dataset.headers.map((name, index) => ({ name, index })).filter(item => dataset.rows.some(row => row[item.index] !== undefined && row[item.index] !== "" && Number.isFinite(Number(row[item.index])))) : [], [dataset]);
  const points = useMemo(() => {
    if (!dataset) return [];
    return dataset.rows.flatMap((row, index) => {
      const x = Number(row[xColumn]);
      const y = Number(row[yColumn]);
      return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y, index, label: row[0] ?? String(index + 1) }] : [];
    });
  }, [dataset, xColumn, yColumn]);
  const path = useMemo(() => {
    if (!points.length) return "";
    const xs = points.map(point => point.x); const ys = points.map(point => point.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
    return points.map((point, index) => {
      const px = 62 + ((point.x - minX) / (maxX - minX || 1)) * 680;
      const py = 298 - ((point.y - minY) / (maxY - minY || 1)) * 250;
      return `${index ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`;
    }).join(" ");
  }, [points]);

  async function handleFile(file?: File) {
    setError("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 3 * 1024 * 1024) {
      setError("Choose a CSV file no larger than 3 MB.");
      return;
    }
    try {
      const parsed = parseCsv(await file.text(), file.name);
      if (parsed.headers.length < 2) throw new Error("At least two columns are needed to plot a relationship.");
      setDataset(parsed); setXColumn(0); setYColumn(parsed.headers.length > 1 ? 1 : 0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The CSV could not be read.");
    }
  }

  function exportSummary() {
    if (!dataset) return;
    const csv = [dataset.headers.join(","), ...dataset.rows.map(row => dataset.headers.map((_, index) => `"${String(row[index] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = `discovery-${dataset.name}`; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="page-container visualization-page">
      <div className="page-heading"><div><div className="section-kicker"><span>05</span> SCIENTIFIC VISUALIZATION STUDIO</div><h1>Let the data<br /><span>take shape.</span></h1></div><p>Upload a small CSV, select numeric columns and inspect the resulting scatter path. This browser-only preview does not upload or store your dataset.</p></div>
      <section className="data-workspace"><div className="data-workspace-top"><div><span className="card-kicker">DATA EXPLORER · LOCAL FILE</span><h2>Start with a dataset.</h2></div>{dataset && <button className="small-icon-action" onClick={() => setDataset(null)}><X size={14} /> Remove dataset</button>}</div>
        {!dataset ? <label className="csv-dropzone"><input type="file" accept=".csv,text/csv" onChange={event => void handleFile(event.target.files?.[0])} /><span className="dropzone-icon"><Upload size={20} /></span><strong>Choose a CSV file</strong><span>CSV only · up to 3 MB · processed in this browser</span><small><FileSpreadsheet size={13} /> Column headers required</small></label> : <><div className="dataset-toolbar"><div className="dataset-name"><FileSpreadsheet size={16} /><span>{dataset.name}</span><small>{dataset.rows.length.toLocaleString()} rows · {dataset.headers.length} columns</small></div><div className="column-selectors"><label>X axis<select value={xColumn} onChange={event => setXColumn(Number(event.target.value))}>{numericColumns.map(column => <option key={column.index} value={column.index}>{column.name}</option>)}</select></label><label>Y axis<select value={yColumn} onChange={event => setYColumn(Number(event.target.value))}>{numericColumns.map(column => <option key={column.index} value={column.index}>{column.name}</option>)}</select></label><button className="small-icon-action" onClick={exportSummary}><Download size={14} /> Export CSV</button></div></div>
          {!numericColumns.length || !points.length ? <div className="research-error"><BarChart3 size={20} /><h3>No numeric pair available</h3><p>Choose a file with at least two numeric columns to plot a relationship.</p></div> : <><div className="dataset-chart-head"><span className="card-kicker">SCATTER VIEW</span><span>{points.length.toLocaleString()} valid coordinate pairs</span></div><div className="dataset-chart"><svg viewBox="0 0 780 340" preserveAspectRatio="none" role="img" aria-label={`Scatter plot of ${dataset.headers[xColumn]} and ${dataset.headers[yColumn]}`}><path d="M62 30 V298 H745" fill="none" stroke="rgba(255,255,255,.22)" /><path d="M62 90 H745 M62 155 H745 M62 220 H745" fill="none" stroke="rgba(255,255,255,.07)" strokeDasharray="3 7" /><path d={path} fill="none" stroke="#9279ff" strokeWidth="2" opacity=".78" />{points.slice(0, 800).map(point => { const xs = points.map(item => item.x); const ys = points.map(item => item.y); const x = 62 + ((point.x - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs) || 1)) * 680; const y = 298 - ((point.y - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys) || 1)) * 250; return <circle key={point.index} cx={x} cy={y} r="2.6" fill="#66ddd2" opacity=".76" />; })}</svg><span className="chart-axis-x">{dataset.headers[xColumn]}</span><span className="chart-axis-y">{dataset.headers[yColumn]}</span></div><div className="chart-footline"><span>Pairs plotted: {points.length.toLocaleString()}</span><span>Scatter path joins rows in their original file order.</span></div></>}
          <div className="dataset-preview"><div className="card-kicker">ROW PREVIEW · FIRST 5</div><div className="table-scroll"><table><thead><tr>{dataset.headers.map((header, index) => <th key={`${header}-${index}`}>{header}</th>)}</tr></thead><tbody>{dataset.rows.slice(0, 5).map((row, rowIndex) => <tr key={rowIndex}>{dataset.headers.map((_, colIndex) => <td key={colIndex}>{row[colIndex] ?? "—"}</td>)}</tr>)}</tbody></table></div></div></>}
        {error && <div className="composer-error" role="alert">{error}</div>}
      </section>
      <div className="correlation-note"><BarChart3 size={17} /><p>A plotted relationship is descriptive. Correlation alone does not establish causation. The current module previews rows and charts locally; cleaning recommendations, advanced statistics and AI interpretation remain open roadmap items.</p></div>
    </div>
  );
}
