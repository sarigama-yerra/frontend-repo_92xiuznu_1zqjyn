import { useEffect, useMemo, useState } from 'react'
import { MapPin, Navigation, Car, Send, Phone, Shield, BellRing, Siren, Languages, IndianRupee, Clock, CheckCircle2 } from 'lucide-react'

const THEME = {
  primary: '#00A8E8',
  secondary: '#1A1A2E',
  success: '#10B981',
  alert: '#F59E0B',
}

function useBackend() {
  const baseUrl = useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', [])
  return { baseUrl }
}

function Header() {
  return (
    <header className="w-full sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full" style={{background: THEME.primary}} />
          <span className="font-extrabold text-xl" style={{color: THEME.secondary}}>RideCyan</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <a href="#how" className="hover:opacity-80">How it works</a>
          <a href="#fixed" className="hover:opacity-80">Fixed Pods</a>
          <a href="#about" className="hover:opacity-80">Safety</a>
        </nav>
        <a href="#book" className="px-4 py-2 rounded-md text-white" style={{background: THEME.primary}}>Book Now</a>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-10 sm:py-16 grid md:grid-cols-2 gap-8 items-center">
      <div>
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight" style={{color: THEME.secondary}}>
          No surge pricing. Fair queues. Verified drivers.
        </h1>
        <p className="mt-4 text-gray-600">Transparent pricing before you book. Designed for India. Works great even on 3G.</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Badge icon={<CheckCircle2 size={16}/>} text="No surge ever"/>
          <Badge icon={<CheckCircle2 size={16}/>} text="Booths for offline users"/>
          <Badge icon={<CheckCircle2 size={16}/>} text="First-come queue"/>
        </div>
        <a href="#book" className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-lg text-white text-lg" style={{background: THEME.primary}}>
          <Navigation size={18}/> Book Now
        </a>
      </div>
      <div className="bg-white rounded-xl shadow p-4 border">
        <MiniStats />
      </div>
    </section>
  )
}

function Badge({icon, text}){
  return (
    <span className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
      {icon}
      <span className="text-gray-700">{text}</span>
    </span>
  )
}

function MiniStats(){
  return (
    <div className="grid grid-cols-2 gap-4">
      <Stat title="Active Drivers" value="1,248"/>
      <Stat title="5★ Trips" value="98%"/>
      <Stat title="Avg ETA" value="4 min"/>
      <Stat title="Cities" value="12"/>
    </div>
  )
}

function Stat({title, value}){
  return (
    <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-white">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-bold" style={{color: THEME.secondary}}>{value}</div>
    </div>
  )
}

function Booking(){
  const { baseUrl } = useBackend()
  const [vehicle, setVehicle] = useState('auto')
  const [pickup, setPickup] = useState({ name: 'MG Road', coordinate: { lat: 12.975, lng: 77.605 } })
  const [drop, setDrop] = useState({ name: 'Majestic', coordinate: { lat: 12.978, lng: 77.572 } })
  const [fare, setFare] = useState(null)
  const [rideId, setRideId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [position, setPosition] = useState(null)

  useEffect(() => {
    // Seed sample data on first load
    fetch(`${baseUrl}/api/seed`, { method: 'POST' })
  }, [baseUrl])

  const estimate = async () => {
    const distanceKm = 4.2 // rough demo distance
    const timeMin = 14
    const res = await fetch(`${baseUrl}/api/fare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_type: vehicle, distance_km: distanceKm, time_min: timeMin })
    })
    const data = await res.json()
    setFare(data)
  }

  const requestRide = async () => {
    const res = await fetch(`${baseUrl}/api/ride/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rider_name: 'Guest', rider_phone: '9999999999',
        pickup, drop, vehicle_type: vehicle
      })
    })
    const data = await res.json()
    setRideId(data.ride_id)
    setStatus('requested')
    // match driver
    await fetch(`${baseUrl}/api/ride/match/${data.ride_id}`, { method: 'POST' })
    setStatus('driver_en_route')
    // simulate route
    await fetch(`${baseUrl}/api/ride/simulate/${data.ride_id}`)
    tick(data.ride_id)
  }

  const tick = async (id) => {
    const res = await fetch(`${baseUrl}/api/ride/tick/${id}`, { method: 'POST' })
    const data = await res.json()
    setStatus(data.status)
    if (data.position) setPosition(data.position)
    if (data.status !== 'completed') setTimeout(() => tick(id), 1000)
  }

  return (
    <section id="book" className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-xl shadow p-4 border">
          <h2 className="text-xl font-bold mb-4" style={{color: THEME.secondary}}>Book a Ride</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-gray-500"/>
              <input className="flex-1 border rounded px-3 py-2" value={pickup.name} onChange={e=>setPickup({...pickup, name: e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
              <Send size={18} className="text-gray-500"/>
              <input className="flex-1 border rounded px-3 py-2" value={drop.name} onChange={e=>setDrop({...drop, name: e.target.value})} />
            </div>

            <div className="flex gap-3 mt-2">
              {['auto','taxi'].map(v => (
                <button key={v} onClick={()=>setVehicle(v)} className={`flex-1 px-3 py-2 rounded border ${vehicle===v? 'text-white' : ''}`} style={{background: vehicle===v? THEME.primary : 'white'}}>
                  <div className="flex items-center justify-center gap-2 font-medium">
                    <Car size={18}/> {v.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={estimate} className="flex-1 px-4 py-3 rounded text-white font-semibold" style={{background: THEME.secondary}}>Get Fare</button>
              <button onClick={requestRide} className="flex-1 px-4 py-3 rounded text-white font-semibold" style={{background: THEME.primary}}>Confirm</button>
            </div>

            {fare && (
              <div className="mt-3 p-3 rounded border bg-gray-50">
                <div className="flex items-center gap-2">
                  <IndianRupee size={18} className="text-green-600"/>
                  <div className="font-semibold">Estimated Fare: ₹{fare.total}</div>
                </div>
                <div className="text-xs text-gray-600">Base ₹{fare.base_fare} • {fare.distance_km} km × ₹{fare.per_km_rate}/km • {fare.time_min} min × ₹{fare.per_min_rate}/min</div>
              </div>
            )}

            <div className="text-sm text-gray-600">No surge pricing. Transparent fare before you book.</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 border">
          <h2 className="text-xl font-bold mb-4" style={{color: THEME.secondary}}>Live Map</h2>
          <MapBox pickup={pickup} drop={drop} position={position} />
          <div className="mt-3 text-sm">
            <span className="font-semibold">Status:</span> {status}
            {rideId && <span className="ml-2 text-gray-500">ID: {rideId}</span>}
          </div>
        </div>
      </div>
    </section>
  )
}

function MapBox({ pickup, drop, position }){
  // Simple SVG map for demo with live marker
  const w = 600, h = 300
  const proj = (coord) => {
    const minLat = 12.95, maxLat = 13.0
    const minLng = 77.55, maxLng = 77.62
    const x = ((coord.lng - minLng) / (maxLng - minLng)) * w
    const y = h - ((coord.lat - minLat) / (maxLat - minLat)) * h
    return { x, y }
  }
  const p1 = proj(pickup.coordinate)
  const p2 = proj(drop.coordinate)
  const pm = position ? proj(position) : null

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-60 rounded border bg-gray-50">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#9CA3AF" />
        </marker>
      </defs>
      <rect x="0" y="0" width={w} height={h} fill="#F3F4F6" />
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#9CA3AF" strokeWidth="2" markerEnd="url(#arrow)" />
      <circle cx={p1.x} cy={p1.y} r="6" fill="#10B981" />
      <circle cx={p2.x} cy={p2.y} r="6" fill="#EF4444" />
      {pm && (
        <g>
          <circle cx={pm.x} cy={pm.y} r="6" fill={THEME.primary} />
        </g>
      )}
    </svg>
  )
}

function FixedPods(){
  const { baseUrl } = useBackend()
  const [booths, setBooths] = useState([])
  useEffect(() => {
    fetch(`${baseUrl}/api/booths`).then(r=>r.json()).then(setBooths)
  }, [baseUrl])
  return (
    <section id="fixed" className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold mb-4" style={{color: THEME.secondary}}>Fixed Pod Locations</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {booths.map(b => (
          <div key={b.id} className="border rounded-lg p-4 bg-white">
            <div className="font-semibold">{b.name}</div>
            <div className="text-sm text-gray-600">Queue: {b.queue_count}</div>
            <button className="mt-2 px-3 py-2 rounded text-white" style={{background: THEME.primary}}>Navigate</button>
          </div>
        ))}
      </div>
    </section>
  )
}

function Safety(){
  return (
    <section id="about" className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-bold mb-4" style={{color: THEME.secondary}}>Safety & Mission</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <Card icon={<Shield />} title="Verified Drivers" desc="Every driver is KYC verified and safety trained."/>
        <Card icon={<Siren />} title="SOS Button" desc="One-tap emergency assistance within the app."/>
        <Card icon={<Languages />} title="Multi-language" desc="Available in English and Hindi."/>
      </div>
    </section>
  )
}

function Card({icon, title, desc}){
  return (
    <div className="p-4 rounded-lg border bg-white">
      <div className="text-2xl mb-2" style={{color: THEME.primary}}>{icon}</div>
      <div className="font-semibold" style={{color: THEME.secondary}}>{title}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </div>
  )
}

function Footer(){
  return (
    <footer className="border-t mt-8">
      <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-600 flex flex-wrap gap-4 items-center justify-between">
        <div>RideCyan • Transparent rides • No surge ever</div>
        <div className="flex items-center gap-3">
          <a href="tel:1800123456" className="inline-flex items-center gap-1"><Phone size={14}/> SMS/WhatsApp</a>
          <span>UPI • Cards • Wallets</span>
        </div>
      </div>
    </footer>
  )
}

export default function App(){
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Header/>
      <Hero/>
      <Booking/>
      <FixedPods/>
      <Safety/>
      <Footer/>
    </div>
  )
}
