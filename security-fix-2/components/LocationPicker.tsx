"use client";
import { useState } from "react";
export interface LocationData { lat: number; lng: number; label: string; }
interface Props { onLocationSet: (loc: LocationData) => void; location: LocationData | null; }

// セキュリティ: 検索クエリの最大長（過大な入力を外部APIへ送らない）
const MAX_QUERY_LENGTH = 100;

/** Nominatimレスポンスの座標を検証（NaN・範囲外を拒否） */
function parseValidCoord(latStr: unknown, lngStr: unknown): { lat: number; lng: number } | null {
  const lat = parseFloat(String(latStr));
  const lng = parseFloat(String(lngStr));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export default function LocationPicker({ onLocationSet, location }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [query, setQuery]     = useState("");
  const [showInput, setShowInput] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const spinner: React.CSSProperties = { width:13,height:13,border:"1px solid rgba(255,255,255,0.3)",borderTopColor:"currentColor",borderRadius:"50%",display:"inline-block",animation:"spin 0.9s linear infinite",flexShrink:0 };

  async function handleGeolocate() {
    if (!navigator.geolocation) { setError("位置情報に対応していません"); setShowInput(true); return; }
    setLoading(true); setError("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coord = parseValidCoord(pos.coords.latitude, pos.coords.longitude);
        if (!coord) { setError("位置情報の取得結果が不正です"); setLoading(false); return; }
        onLocationSet({ ...coord, label:"Current Location" }); setLoading(false);
      },
      () => { setError("位置情報を取得できませんでした"); setShowInput(true); setLoading(false); },
      { timeout:10000, enableHighAccuracy:true }
    );
  }

  async function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
    if (!trimmed) return;
    setGeocoding(true); setError("");
    try {
      const params = new URLSearchParams({ q:trimmed, format:"json", limit:"1", "accept-language":"ja" });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers:{ "Accept-Language":"ja" },
        signal: AbortSignal.timeout(10000), // タイムアウト追加
      });
      if (!res.ok) { setError("検索サービスに接続できませんでした"); return; }
      const results = await res.json();
      if (!Array.isArray(results) || !results.length) { setError("場所が見つかりませんでした"); return; }
      // レスポンスの座標を検証してから採用
      const coord = parseValidCoord(results[0]?.lat, results[0]?.lon);
      if (!coord) { setError("検索結果の座標が不正です"); return; }
      onLocationSet({ ...coord, label:trimmed }); setShowInput(false);
    } catch { setError("検索中にエラーが発生しました"); } finally { setGeocoding(false); }
  }

  if (location) return (
    <div>
      <span className="label" style={{display:"block",marginBottom:12}}>Location</span>
      <div className="surface" style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"1.05rem",fontWeight:300,color:"var(--white)"}}>{location.label}</div>
          <div style={{fontFamily:"'Jost',sans-serif",fontSize:"0.62rem",color:"var(--muted)",marginTop:3}}>{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => { onLocationSet(null!); setShowInput(false); }}>変更</button>
      </div>
    </div>
  );
  return (
    <div>
      <span className="label" style={{display:"block",marginBottom:12}}>Location</span>
      <button className="btn btn-white" style={{width:"100%",marginBottom:10}} onClick={handleGeolocate} disabled={loading}>
        {loading ? <span style={spinner}/> : null}{loading ? "取得中" : "現在地を使用"}
      </button>
      <div style={{display:"flex",alignItems:"center",gap:14,margin:"12px 0"}}>
        <hr className="divider" style={{flex:1}}/>
        <span style={{fontFamily:"'Jost',sans-serif",fontSize:"0.62rem",color:"var(--muted)",letterSpacing:"0.18em"}}>OR</span>
        <hr className="divider" style={{flex:1}}/>
      </div>
      {!showInput ? (
        <button className="btn btn-outline" style={{width:"100%"}} onClick={() => setShowInput(true)}>地名・住所で検索</button>
      ) : (
        <form onSubmit={handleManualSearch} style={{display:"flex",gap:8}}>
          <input className="input" type="text" value={query} maxLength={MAX_QUERY_LENGTH}
            onChange={e => setQuery(e.target.value)} placeholder="例: 渋谷、上野公園" autoFocus/>
          <button className="btn btn-white" style={{padding:"12px 20px",flexShrink:0}} type="submit" disabled={geocoding||!query.trim()}>
            {geocoding ? <span style={spinner}/> : "検索"}
          </button>
        </form>
      )}
      {error && <div style={{marginTop:10,fontFamily:"'Jost',sans-serif",fontSize:"0.68rem",color:"rgba(255,120,120,0.9)"}}>{error}</div>}
    </div>
  );
}
