import { useEffect, useMemo, useState } from 'react'
import { MapPin, Navigation, Car, Send, Phone, Shield, Siren, Languages, IndianRupee, Clock, LocateFixed, User, ChevronUp, ChevronDown, SwapVertical, BellRing } from 'lucide-react'

const PALETTE = {
  ink: '#0B0B0C', // Uber-like dark
  inkSoft: '#141416',
  text: '#111827',
  textMuted: '#6B7280',
  brand: '#00A8E8', // your cyan
  surface: '#FFFFFF',
  success: '#10B981',
  danger: '#EF4444',
}

function useBackend() {
  const baseUrl = useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', [])
  return { baseUrl }
}

function TopBar(){
  return (
    <div className="fixed top-0 left-0 right-0 z-20 px-4 pt-4 pb-2">
      <div className="mx-auto max-w-6xl flex items-center justify-between bg-black/70 backdrop-blur rounded-2xl px-3 py-2 text-white border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
            <div className="w-5 h-5 rounded-sm" style={{background: PALETTE.brand}}/>
          </div>
          <div className="font-bold tracking-tight">RideCyan</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition" aria-label="Notifications"><BellRing size={18}/></button>
          <button className="px-3 py-1 rounded-full bg-white text-black text-sm font-medium flex items-center gap-2" aria-label="Profile">
            <User size={16}/> You
          </button>
        </div>
      </div>
    </div>
  )
}

function MapView({ pickup, drop, position }){
  // Simple SVG map canvas
  const w = 1200, h = 800
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
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 w-full h-full">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#F3F4F6" />
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="1"/>
        </pattern>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#9CA3AF" />
        </marker>
      </defs>
      <rect x="0" y="0" width={w} height={h} fill="url(#grid)" />
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#9CA3AF" strokeWidth="3" markerEnd="url(#arrow)" />
      <circle cx={p1.x} cy={p1.y} r="8" fill={PALETTE.success} />
      <circle cx={p2.x} cy={p2.y} r="8" fill={PALETTE.danger} />
      {pm && (
        <g>
          <circle cx={pm.x} cy={pm.y} r="8" fill={PALETTE.brand} />
        </g>
      )}
    </svg>
  )
}

function CategoryPills({ vehicle, setVehicle }){
  const items = [
    { key: 'auto', label: 'Auto', eta: '4 min' },
    { key: 'taxi', label: 'Taxi', eta: '6 min' },
  ]
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {items.map(it => (
        <button key={it.key} onClick={()=>setVehicle(it.key)}
          className={`px-3 py-2 rounded-full border text-sm whitespace-nowrap flex items-center gap-2 ${vehicle===it.key ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200'}`}>
          <Car size={16}/> {it.label}
          <span className="text-xs text-gray-500 ml-1">{it.eta}</span>
        </button>
      ))}
    </div>
  )
}

function BookingSheet(){
  const { baseUrl } = useBackend()
  const [vehicle, setVehicle] = useState('auto')
  const [pickup, setPickup] = useState({ name: 'MG Road Metro', coordinate: { lat: 12.975, lng: 77.605 } })
  const [drop, setDrop] = useState({ name: 'Majestic', coordinate: { lat: 12.978, lng: 77.572 } })
  const [fare, setFare] = useState(null)
  const [rideId, setRideId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [position, setPosition] = useState(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    fetch(`${baseUrl}/api/seed`, { method: 'POST' })
  }, [baseUrl])

  const swap = () => {
    setPickup(drop)
    setDrop(pickup)
  }

  const estimate = async () => {
    const distanceKm = 4.2
    const timeMin = 14
    const res = await fetch(`${baseUrl}/api/fare`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_type: vehicle, distance_km: distanceKm, time_min: timeMin })
    })
    const data = await res.json()
    setFare(data)
  }

  const requestRide = async () => {
    const res = await fetch(`${baseUrl}/api/ride/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rider_name: 'Guest', rider_phone: '9999999999', pickup, drop, vehicle_type: vehicle })
    })
    const data = await res.json()
    setRideId(data.ride_id)
    setStatus('requested')
    await fetch(`${baseUrl}/api/ride/match/${data.ride_id}`, { method: 'POST' })
    setStatus('driver_en_route')
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
    <>
      <MapView pickup={pickup} drop={drop} position={position}/>

      {/* Floating controls */}
      <div className="absolute right-4 bottom-[320px] md:bottom-[360px] z-20 flex flex-col gap-2">
        <button className="p-3 rounded-full bg-white shadow border hover:bg-gray-50" aria-label="Locate">
          <LocateFixed size={18}/>
        </button>
        <button className="p-3 rounded-full bg-white shadow border hover:bg-gray-50" aria-label="Safety">
          <Shield size={18}/>
        </button>
      </div>

      {/* Bottom sheet */}
      <div className="fixed left-0 right-0 bottom-0 z-30">
        <div className="mx-auto max-w-6xl px-4 pb-4">
          <div className="rounded-3xl border shadow-xl bg-white overflow-hidden">
            <button className="w-full flex items-center justify-center py-2 text-gray-500" onClick={()=>setExpanded(!expanded)}>
              {expanded ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}
            </button>

            <div className={`transition-all ${expanded? 'max-h-[80vh]' : 'max-h-[140px]'} overflow-hidden`}> 
              <div className="p-4">
                <CategoryPills vehicle={vehicle} setVehicle={setVehicle}/>

                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center"><MapPin size={16}/></div>
                    <input className="flex-1 border rounded-xl px-3 py-2 text-[15px]" value={pickup.name} onChange={e=>setPickup({...pickup, name: e.target.value})} placeholder="Pickup"/>
                    <button onClick={swap} className="ml-2 p-2 rounded-lg border hover:bg-gray-50" aria-label="Swap">
                      <SwapVertical size={16}/>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-gray-200 text-black flex items-center justify-center"><Send size={16}/></div>
                    <input className="flex-1 border rounded-xl px-3 py-2 text-[15px]" value={drop.name} onChange={e=>setDrop({...drop, name: e.target.value})} placeholder="Destination"/>
                  </div>
                </div>

                {/* Estimate row */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16}/> ETA ~ 4 min
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={estimate} className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm">Get Fare</button>
                  </div>
                </div>

                {fare && (
                  <div className="mt-3 p-3 rounded-2xl border bg-gray-50">
                    <div className="flex items-center gap-2">
                      <IndianRupee size={18} className="text-green-600"/>
                      <div className="font-semibold">₹{fare.total} · upfront price</div>
                    </div>
                    <div className="text-xs text-gray-600">Base ₹{fare.base_fare} • {fare.distance_km} km × ₹{fare.per_km_rate}/km • {fare.time_min} min × ₹{fare.per_min_rate}/min</div>
                    <div className="text-xs text-gray-500 mt-1">No surge pricing — ever.</div>
                  </div>
                )}

                <button onClick={requestRide} className="mt-4 w-full rounded-2xl bg-black text-white py-3 font-semibold flex items-center justify-center gap-2">
                  <Car size={18}/> Confirm {vehicle === 'auto' ? 'Auto' : 'Taxi'}
                </button>

                <div className="mt-2 text-xs text-gray-500">
                  Status: {status} {rideId ? `• ${rideId}` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* helper row */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
            <div>No surge pricing. Transparent fares.</div>
            <a href="tel:1800123456" className="inline-flex items-center gap-1"><Phone size={12}/> Help</a>
          </div>
        </div>
      </div>
    </>
  )
}

function FixedPods(){
  const { baseUrl } = useBackend()
  const [booths, setBooths] = useState([])
  useEffect(() => { fetch(`${baseUrl}/api/booths`).then(r=>r.json()).then(setBooths) }, [baseUrl])
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-xl font-bold mb-4">Fixed Pods Nearby</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {booths.map(b => (
          <div key={b.id} className="border rounded-2xl p-4 bg-white">
            <div className="font-semibold">{b.name}</div>
            <div className="text-sm text-gray-600">Queue: {b.queue_count}</div>
            <button className="mt-2 px-3 py-2 rounded-xl border">Navigate</button>
          </div>
        ))}
      </div>
    </section>
  )
}

function Safety(){
  return (
    <section className="max-w-6xl mx-auto px-4 pb-24">
      <h2 className="text-xl font-bold mb-4">Safety & Support</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border bg-white">
          <div className="font-semibold">Verified Drivers</div>
          <div className="text-sm text-gray-600 mt-1">KYC verified and safety trained.</div>
        </div>
        <div className="p-4 rounded-2xl border bg-white">
          <div className="font-semibold">SOS Button</div>
          <div className="text-sm text-gray-600 mt-1">One-tap emergency assistance.</div>
        </div>
        <div className="p-4 rounded-2xl border bg-white">
          <div className="font-semibold">Hindi & English</div>
          <div className="text-sm text-gray-600 mt-1">Multilingual interface.</div>
        </div>
      </div>
    </section>
  )
}

export default function App(){
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Map-first layout */}
      <div className="relative h-[70vh] md:h-[75vh]">
        <TopBar/>
        {/* Booking sheet includes the MapView and controls */}
        <BookingSheet/>
      </div>

      {/* Content below map like Uber home suggestions */}
      <FixedPods/>
      <Safety/>
    </div>
  )
}
