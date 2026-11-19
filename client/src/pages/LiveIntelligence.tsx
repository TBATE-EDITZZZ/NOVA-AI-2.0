import { useState } from "react";
import { Activity, ArrowUpRight, CloudSun, Globe2, LocateFixed, RefreshCw, Satellite } from "lucide-react";
import { trpc } from "@/lib/trpc";

function fetchedLabel(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function weatherDescription(code: unknown) {
  const labels: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Drizzle",
    55: "Dense drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers",
    81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorm",
  };
  return typeof code === "number" ? labels[code] ?? `Weather code ${code}` : "Current condition";
}

export default function LiveIntelligence() {
  const quakes = trpc.science.earthquakes.useQuery(undefined, { refetchInterval: 60_000, staleTime: 30_000 });
  const apod = trpc.science.apod.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState("");
  const weather = trpc.science.weather.useQuery(coords ?? { latitude: 0, longitude: 0 }, { enabled: Boolean(coords), staleTime: 300_000 });
  const weatherData = weather.data;
  const current = weatherData?.current;
  const units = weatherData?.units;

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("This browser does not provide device location.");
      return;
    }
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      position => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      error => setLocationError(error.code === error.PERMISSION_DENIED ? "Location access was declined. You can still explore earthquake and astronomy data." : "Device location could not be read."),
      { timeout: 12_000, maximumAge: 300_000 },
    );
  }

  return (
    <div className="page-container live-page">
      <div className="page-heading">
        <div><div className="section-kicker"><span>02</span> LIVE SCIENCE INTELLIGENCE</div><h1>Observe what<br /><span>is happening.</span></h1></div>
        <p>Each panel reports the source and retrieval time. An upstream delay or failure is shown plainly; it is never replaced with invented live data.</p>
      </div>
      <div className="live-source-note"><span className="live-pulse" /> CONNECTED PUBLIC SOURCES <span>USGS</span><span>NASA APOD</span><span>OPEN-METEO</span></div>
      <div className="live-grid">
        <section className="live-card quake-card">
          <div className="live-card-top"><span className="live-icon"><Activity size={17} /></span><span className="card-kicker">SEISMIC ACTIVITY · GLOBAL</span><button className="refresh-button" aria-label="Refresh earthquake data" onClick={() => void quakes.refetch()}><RefreshCw size={14} /></button></div>
          <h2>{quakes.data ? quakes.data.count.toLocaleString() : quakes.isLoading ? "Loading…" : "Unavailable"}</h2>
          <p className="live-metric-sub">events returned by the USGS feed in its current 24-hour window</p>
          {quakes.data ? <div className="data-stamp">Retrieved {fetchedLabel(quakes.data.fetchedAt)}</div> : quakes.error ? <div className="source-error" role="status">{quakes.error.message}</div> : <div className="data-stamp">Contacting USGS…</div>}
          <div className="quake-list">{quakes.data?.events.slice(0, 8).map(event => <a className="quake-row" key={event.id} href={event.url} target="_blank" rel="noreferrer"><span className="quake-mag">M {event.magnitude.toFixed(1)}</span><span className="quake-place">{event.place}</span><span className="quake-time">{new Date(event.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><ArrowUpRight size={12} /></a>)}</div>
          <a className="source-link" href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson" target="_blank" rel="noreferrer">Source: USGS Earthquake Hazards Program <ArrowUpRight size={12} /></a>
        </section>

        <section className="live-card weather-card">
          <div className="live-card-top"><span className="live-icon"><CloudSun size={17} /></span><span className="card-kicker">LOCAL WEATHER</span></div>
          {!coords ? <div className="weather-empty"><div className="weather-orb"><Globe2 size={22} /></div><h2>Weather, by choice.</h2><p>Share device coordinates only when you want a local forecast. Location is not requested automatically.</p><button className="button-outline" onClick={requestLocation}><LocateFixed size={15} /> Use my location</button>{locationError && <div className="source-error" role="status">{locationError}</div>}</div>
            : weather.isLoading ? <div className="weather-empty"><span className="spin"><RefreshCw size={16} /></span><h2>Loading forecast…</h2></div>
              : weather.error ? <div className="weather-empty"><h2>Forecast unavailable</h2><p>{weather.error.message}</p><button className="button-outline" onClick={() => void weather.refetch()}>Try again</button></div>
                : weatherData && current ? <div className="weather-data">
                  <strong>{Math.round(Number(current.temperature_2m))}°<small>{String(units?.temperature_2m ?? "C")}</small></strong>
                  <span>{weatherDescription(current.weather_code)}</span>
                  <div className="weather-facts"><span>Feels like<strong>{String(current.apparent_temperature)}°</strong></span><span>Humidity<strong>{String(current.relative_humidity_2m)}%</strong></span><span>Wind<strong>{String(current.wind_speed_10m)} {String(units?.wind_speed_10m ?? "")}</strong></span></div>
                  <div className="data-stamp">{weatherData.timezone} · Retrieved {fetchedLabel(weatherData.fetchedAt)}</div>
                  <button className="text-button" onClick={() => setCoords(null)}>Clear location</button>
                </div> : null}
          <a className="source-link" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Source: Open-Meteo <ArrowUpRight size={12} /></a>
        </section>

        <section className="live-card apod-card">
          <div className="live-card-top"><span className="live-icon"><Satellite size={17} /></span><span className="card-kicker">NASA · ASTRONOMY PICTURE OF THE DAY</span><button className="refresh-button" aria-label="Refresh NASA astronomy image" onClick={() => void apod.refetch()}><RefreshCw size={14} /></button></div>
          {apod.isLoading ? <div className="apod-loading">Requesting NASA APOD…</div>
            : apod.error ? <div className="source-error" role="status">{apod.error.message}</div>
              : apod.data ? <>
                <div className="apod-media">{apod.data.mediaType === "image" ? <img src={apod.data.url} alt={apod.data.title} loading="lazy" /> : <a href={apod.data.url} target="_blank" rel="noreferrer">Open NASA video <ArrowUpRight size={14} /></a>}</div>
                <div className="apod-caption"><span className="card-kicker">{apod.data.date}{apod.data.copyright ? ` · © ${apod.data.copyright}` : ""}</span><h2>{apod.data.title}</h2><p>{apod.data.explanation}</p><div className="data-stamp">Retrieved {fetchedLabel(apod.data.fetchedAt)}</div></div>
              </> : null}
          <a className="source-link" href={apod.data?.sourceUrl ?? "https://apod.nasa.gov/"} target="_blank" rel="noreferrer">Source: NASA APOD <ArrowUpRight size={12} /></a>
        </section>
      </div>
      <div className="live-footnote">These are selected public feeds, not a comprehensive sensor network. Their timestamps describe retrieval by this application, not necessarily the original observation time.</div>
    </div>
  );
}
