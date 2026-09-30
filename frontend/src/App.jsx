import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, getToken, setToken } from "./api";
import { AqiRing, Background, CountUp, MiniMeter, colorFor, fadeUp, freshness } from "./components";

function Layout({ user, onLogout }) {
  return (
    <>
      <Background />
      <div className="shell">
        <nav className="nav">
          <Link className="brand" to="/">Aether</Link>
          <NavLink to="/" end>Cities</NavLink>
          <NavLink to="/compare">Compare</NavLink>
          <NavLink to="/sources">Sources</NavLink>
          {user ? <NavLink to="/watchlist">Watchlist</NavLink> : null}
          {user ? (
            <button className="ghost" onClick={onLogout}>Log out</button>
          ) : (
            <NavLink to="/login">Log in</NavLink>
          )}
        </nav>
        <AnimatedRoutes user={user} setUser={() => {}} />
      </div>
    </>
  );
}

function AnimatedRoutes({ user }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/cities/:id" element={<City user={user} />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/watchlist" element={<Watchlist user={user} />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function Home({ user }) {
  const [cities, setCities] = useState([]);
  const [query, setQuery] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let stop = false;
    const load = () => api("/api/cities").then((rows) => { if (!stop) setCities(rows); }).catch(() => { if (!stop) setCities([]); });
    load();
    const timer = setInterval(load, 60000);
    return () => { stop = true; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!user) return;
    api("/api/alerts").then(setAlerts).catch(() => setAlerts([]));
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const shown = cities.filter((city) =>
    city.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <>
      <section className="hero">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          Read the air<br />before the week turns.
        </motion.h1>
        <p className="lede">
          Live PM2.5, PM10, and gases for twelve Indian cities, refreshed from the CAMS atmospheric model, with a 7-day forecast and an activity plan.
        </p>
        <div className="live-row">
          <span className="live-dot" />
          {freshness(cities[0]?.observed_at)} · {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <CityTicker cities={cities} />
        <input
          className="search"
          placeholder="Search a city"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <LiveStats cities={cities} />
        <AirField cities={cities} />
      </section>
      {alerts.slice(0, 2).map((alert) => (
        <div className="alert" key={alert.id}>{alert.message}</div>
      ))}
      <motion.section className="grid" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.045 } } }}>
        {shown.map((city, index) => (
          <motion.div key={city.id} variants={fadeUp} custom={index} layout>
            <Link className={`card ${["Poor", "Very Poor", "Severe"].includes(city.latest_category) ? "card-hot" : "card-calm"}`} to={`/cities/${city.id}`}>
              <span className="sheen" />
              <div className="card-top">
                <div>
                  <h2>{city.name}</h2>
                  <div className="meta">{city.state}</div>
                </div>
                <MiniMeter aqi={city.latest_aqi} category={city.latest_category} />
              </div>
              <div className="aqi-row">
                <div>
                  <div className="aqi-num" style={{ color: colorFor(city.latest_category) }}>
                    <CountUp value={city.latest_aqi} />
                  </div>
                  <div className="trend">
                    <motion.span
                      className="trend-mark"
                      animate={{ y: city.trend_direction === "up" ? [0, -4, 0] : city.trend_direction === "down" ? [0, 4, 0] : [0, 0, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {city.trend_direction === "up" ? "↑" : city.trend_direction === "down" ? "↓" : "→"}
                    </motion.span>
                    {city.trend_direction === "up" ? "Rising" : city.trend_direction === "down" ? "Falling" : "Steady"} · {city.dominant_pollutant}
                  </div>
                </div>
                <motion.span
                  className="pill"
                  style={{ background: colorFor(city.latest_category), color: "#102017" }}
                  animate={{ opacity: [0.72, 1, 0.72] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  {city.latest_category}
                </motion.span>
              </div>
              <div className="wave" aria-hidden="true">
                <motion.span
                  style={{ background: colorFor(city.latest_category) }}
                  animate={{ x: ["-40%", "0%"] }}
                  transition={{ duration: 3.6 + (index % 4) * 0.4, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.section>
    </>
  );
}

function CityTicker({ cities }) {
  if (!cities.length) return null;
  const loop = [...cities, ...cities];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {loop.map((city, index) => (
          <span key={`${city.id}-${index}`}>
            <i style={{ background: colorFor(city.latest_category) }} />
            {city.name} {city.latest_aqi}
          </span>
        ))}
      </div>
    </div>
  );
}

const RING_ORDER = [
  "chandigarh", "delhi", "lucknow", "kolkata", "chennai", "bengaluru",
  "kochi", "hyderabad", "pune", "mumbai", "ahmedabad", "jaipur",
];

function ringPoint(index, total, radiusX, radiusY) {
  const angle = (-Math.PI / 2) + (index * 2 * Math.PI) / total;
  return {
    x: 400 + Math.cos(angle) * radiusX,
    y: 210 + Math.sin(angle) * radiusY,
    angle,
  };
}

function AirField({ cities }) {
  const navigate = useNavigate();
  const ordered = [...cities].sort((a, b) => {
    const ai = RING_ORDER.indexOf(a.slug);
    const bi = RING_ORDER.indexOf(b.slug);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const placed = ordered.map((city, index) => ({ city, ...ringPoint(index, Math.max(ordered.length, 1), 268, 132) }));
  const orbit = Array.from({ length: 24 }, (_, index) => ringPoint(index, 24, 268, 132));

  return (
    <div className="field">
      <svg className="field-svg" viewBox="0 0 800 420" role="img" aria-label="Live city ring">
        <ellipse cx="400" cy="210" rx="268" ry="132" className="orbit orbit-outer" />
        <ellipse cx="400" cy="210" rx="168" ry="78" className="orbit orbit-inner" />
        <motion.circle
          cx="400"
          cy="210"
          fill="none"
          stroke="rgba(61,206,176,0.35)"
          strokeWidth="1"
          animate={{ r: [18, 92], opacity: [0.55, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeOut" }}
        />
        {placed.map(({ x, y }) => (
          <line key={`${x}-${y}`} x1="400" y1="210" x2={x} y2={y} className="spoke" />
        ))}
        <motion.circle
          className="traveler"
          r="4"
          fill="#e7f2ef"
          animate={{
            cx: orbit.map((point) => point.x),
            cy: orbit.map((point) => point.y),
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        {placed.map(({ city, x, y, angle }, index) => {
          const label = ringPoint(index, placed.length, 312, 158);
          const anchor = Math.cos(angle) > 0.35 ? "start" : Math.cos(angle) < -0.35 ? "end" : "middle";
          const color = colorFor(city.latest_category);
          return (
            <g
              key={city.id}
              className="map-city"
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/cities/${city.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter") navigate(`/cities/${city.id}`);
              }}
            >
              <circle className="map-hit" cx={x} cy={y} r="18" />
              <motion.circle
                cx={x}
                cy={y}
                fill={color}
                animate={{ r: [6, 9, 6], opacity: [1, 0.65, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: index * 0.12, ease: "easeInOut" }}
              />
              <circle cx={x} cy={y} r="2.4" fill="#071016" />
              <text x={label.x} y={label.y} textAnchor={anchor} dominantBaseline="middle" className="map-label">
                {city.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LiveStats({ cities }) {
  const average = cities.length
    ? Math.round(cities.reduce((sum, city) => sum + (city.latest_aqi || 0), 0) / cities.length)
    : 0;
  const rising = cities.filter((city) => city.trend_direction === "up").length;
  const worst = cities.reduce((top, city) => ((city.latest_aqi || 0) > (top?.latest_aqi || 0) ? city : top), null);
  const tiles = [
    { label: "Cities live", value: cities.length },
    { label: "Average AQI", value: average },
    { label: "Rising", value: rising },
  ];
  return (
    <div className="stats">
      {tiles.map((tile, index) => (
        <motion.article
          key={tile.label}
          className="stat"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + index * 0.08, type: "spring", stiffness: 80, damping: 16 }}
        >
          <span>{tile.label}</span>
          <strong><CountUp value={tile.value} /></strong>
        </motion.article>
      ))}
      {worst ? (
        <motion.article
          className="stat stat-wide"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 80, damping: 16 }}
        >
          <span>Highest right now</span>
          <strong>{worst.name}</strong>
          <em style={{ color: colorFor(worst.latest_category) }}>{worst.latest_aqi} · {worst.latest_category}</em>
        </motion.article>
      ) : null}
    </div>
  );
}

function City({ user }) {
  const { id } = useParams();
  const [city, setCity] = useState(null);
  const [series, setSeries] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [plan, setPlan] = useState(null);
  const [pollutant, setPollutant] = useState("pm25");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setCity(null);
    setForecast(null);
    setPlan(null);
    const load = () => {
      api(`/api/cities/${id}`).then((data) => { if (!cancelled) setCity(data); });
      api(`/api/cities/${id}/plan`).then((data) => { if (!cancelled) setPlan(data); });
    };
    load();
    api(`/api/cities/${id}/forecast`).then((data) => { if (!cancelled) setForecast(data); });
    const timer = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [id, user]);

  useEffect(() => {
    api(`/api/cities/${id}/series?days=90&pollutant=${pollutant}`).then((data) => setSeries(data.points || []));
  }, [id, pollutant]);

  const chartData = useMemo(() => {
    const history = series.map((point) => ({ date: point.date.slice(5), history: point.value }));
    if (pollutant !== "pm25" || !forecast) return history;
    const future = forecast.points.map((point) => ({
      date: point.date.slice(5),
      forecast: point.pm25,
      lower: point.lower,
      upper: point.upper,
    }));
    return [...history, ...future];
  }, [series, forecast, pollutant]);

  async function watch() {
    try {
      await api("/api/watches", { method: "POST", body: JSON.stringify({ city_id: Number(id), aqi_threshold: 200 }) });
      setMessage("Watching this city at AQI 200.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function downloadPdf() {
    const blob = await api(`/api/cities/${id}/report.pdf`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${city?.slug || "city"}-report.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!city) return <p className="note">Loading the city record…</p>;

  return (
    <>
      <div className="detail-top">
        <AqiRing aqi={city.latest_aqi} category={city.latest_category} />
        <div>
          <h1 className="hero" style={{ margin: 0 }}>{city.name}</h1>
          <p className="lede">{city.state} · dominant {city.dominant_pollutant} · trend {city.trend_direction}</p>
          <div className="live-row"><span className="live-dot" />{freshness(city.observed_at)} · {city.source}</div>
          <div className="chips">
            {city.pollutants && Object.entries(city.pollutants).map(([key, value]) => (
              <button key={key} className="chip" onClick={() => setPollutant(key)}>
                {key.toUpperCase()} {Number(value).toFixed(1)}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            {user ? <button className="solid" onClick={watch}>Watch city</button> : <Link className="ghost" to="/login">Log in to watch</Link>}
            {user ? <button className="ghost" onClick={downloadPdf}>Download PDF</button> : null}
          </div>
          {message ? <p className="note">{message}</p> : null}
        </div>
      </div>
      <motion.section className="card panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 70, damping: 16 }}>
        <h2>{pollutant.toUpperCase()} · last 90 days{pollutant === "pm25" ? " and forecast" : ""}</h2>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#93a8a4", fontSize: 12 }} minTickGap={24} />
              <YAxis tick={{ fill: "#93a8a4", fontSize: 12 }} width={40} />
              <Tooltip />
              <Legend />
              <Area dataKey="upper" stroke="none" fill="rgba(228,161,90,0.18)" name="Upper" />
              <Area dataKey="lower" stroke="none" fill="#071016" name="Lower" />
              <Line type="monotone" dataKey="history" stroke="#3dceb0" dot={false} strokeWidth={2} name="History" />
              <Line type="monotone" dataKey="forecast" stroke="#e4a15a" dot={false} strokeWidth={2} name="Forecast" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {forecast ? <p className="note">Forecast method: {forecast.method}. The band is a 95% interval, not a guarantee.</p> : <p className="note">Fitting the forecast…</p>}
      </motion.section>
      {plan ? (
        <section className="card panel plan">
          <h2>{plan.tier === "full" ? "Seven-day plan" : "Plan preview"}</h2>
          <p>{plan.summary}</p>
          {plan.sections.map((section) => (
            <div key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </div>
          ))}
          {plan.tier === "guest" ? <Link to="/login">Log in for the full activity plan and PDF.</Link> : null}
        </section>
      ) : null}
    </>
  );
}

function Compare() {
  const [cities, setCities] = useState([]);
  const [left, setLeft] = useState(1);
  const [right, setRight] = useState(2);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api("/api/cities").then((data) => {
      setCities(data);
      if (data[0]) setLeft(data[0].id);
      if (data[1]) setRight(data[1].id);
    });
  }, []);

  useEffect(() => {
    if (!left || !right) return;
    api(`/api/compare?left=${left}&right=${right}&days=90`).then((data) => {
      const map = new Map();
      data.left_points.forEach((point) => map.set(point.date, { date: point.date.slice(5), left: point.value }));
      data.right_points.forEach((point) => {
        const row = map.get(point.date) || { date: point.date.slice(5) };
        row.right = point.value;
        map.set(point.date, row);
      });
      setRows([...map.values()]);
    });
  }, [left, right]);

  const name = (id) => cities.find((city) => city.id === Number(id))?.name || "City";

  return (
    <>
      <h1>Compare cities</h1>
      <div className="row">
        <select value={left} onChange={(event) => setLeft(event.target.value)}>
          {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
        </select>
        <select value={right} onChange={(event) => setRight(event.target.value)}>
          {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
        </select>
      </div>
      <motion.section className="card panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#93a8a4", fontSize: 12 }} minTickGap={24} />
              <YAxis tick={{ fill: "#93a8a4", fontSize: 12 }} width={40} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="left" name={name(left)} stroke="#3dceb0" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="right" name={name(right)} stroke="#e4a15a" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.section>
    </>
  );
}

function Sources() {
  return (
    <section className="split">
      <div>
        <h1>Two sources, one daily record</h1>
        <p className="lede">
          Current readings and the last 90 days come from the Open-Meteo CAMS global atmospheric model, refreshed about every 10 minutes. Aether turns those concentrations into an Indian-style AQI. The model is live analysis, not a CPCB station bulletin.
        </p>
      </div>
      <div className="card">
        <h2>Why this is not a live feed</h2>
        <p className="note">
          If the live feed is unreachable, the app keeps the last saved series. Charts use daily means. The number on each card is the latest hour. The plan is not medical advice.
        </p>
      </div>
    </section>
  );
}

function Auth({ mode }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState(mode === "login" ? "analyst@aether.dev" : "");
  const [password, setPassword] = useState(mode === "login" ? "Analyst@123" : "");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="form card" onSubmit={submit}>
      <h1>{mode === "login" ? "Log in" : "Create an account"}</h1>
      <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" required />
      <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required />
      {error ? <div className="error">{error}</div> : null}
      <button className="solid" type="submit">{mode === "login" ? "Enter" : "Register"}</button>
      {mode === "login" ? (
        <p className="note">Demo: analyst@aether.dev / Analyst@123. Delhi is already watched at AQI 200. <Link to="/register">Register</Link></p>
      ) : (
        <p className="note">Password needs at least 8 characters. <Link to="/login">Log in</Link></p>
      )}
    </form>
  );
}

function Watchlist({ user }) {
  const navigate = useNavigate();
  const [watches, setWatches] = useState([]);
  const [cities, setCities] = useState([]);
  const [cityId, setCityId] = useState("");
  const [threshold, setThreshold] = useState(150);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    Promise.all([api("/api/watches"), api("/api/cities")]).then(([watchRows, cityRows]) => {
      setWatches(watchRows);
      setCities(cityRows);
      const takenIds = new Set(watchRows.map((watch) => watch.city_id));
      const first = cityRows.find((city) => !takenIds.has(city.id));
      if (first) setCityId(String(first.id));
      setReady(true);
    });
  }, [user, navigate]);

  if (!user || !ready) return null;

  const taken = new Set(watches.map((watch) => watch.city_id));
  const available = cities.filter((city) => !taken.has(city.id));

  async function add(event) {
    event.preventDefault();
    setError("");
    try {
      const created = await api("/api/watches", {
        method: "POST",
        body: JSON.stringify({ city_id: Number(cityId), aqi_threshold: Number(threshold) }),
      });
      setWatches((current) => {
        const next = [...current, created];
        const takenIds = new Set(next.map((watch) => watch.city_id));
        const first = cities.find((city) => !takenIds.has(city.id));
        setCityId(first ? String(first.id) : "");
        return next;
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    await api(`/api/watches/${id}`, { method: "DELETE" });
    setWatches((current) => current.filter((watch) => watch.id !== id));
  }

  return (
    <>
      <h1>Watchlist</h1>
      <p className="lede">You get an alert when a city’s live AQI reaches the number you set.</p>
      <form className="row card" onSubmit={add}>
        <select value={cityId} onChange={(event) => setCityId(event.target.value)} required disabled={!available.length}>
          {available.length ? available.map((city) => (
            <option key={city.id} value={city.id}>{city.name} · AQI {city.latest_aqi}</option>
          )) : <option value="">Every city is already watched</option>}
        </select>
        <input
          type="number"
          min="50"
          max="500"
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
          aria-label="Alert when AQI reaches"
        />
        <button className="solid" type="submit" disabled={!available.length}>Add</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid">
        {watches.map((watch) => (
          <article className="card" key={watch.id}>
            <h2>{watch.city_name}</h2>
            <p className="note">Latest AQI {watch.latest_aqi} · alert at {watch.aqi_threshold}</p>
            <button className="ghost" onClick={() => remove(watch.id)}>Remove</button>
          </article>
        ))}
      </div>
      {!watches.length ? <p className="note">Nothing saved yet. Choose a city above and press Add.</p> : null}
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!getToken()) return;
    api("/api/me").then(setUser).catch(() => setToken(null));
  }, []);

  function logout() {
    setToken(null);
    setUser(null);
    window.location.href = "/";
  }

  return <Layout user={user} onLogout={logout} />;
}
