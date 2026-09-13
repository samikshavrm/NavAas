'use client'

import { useState, type ComponentType } from 'react'
import {
  Activity,
  AlertTriangle,
  Check,
  CircleHelp,
  Droplets,
  HeartPulse,
  MapPin,
  Play,
  ShieldCheck,
  Thermometer,
  Wind,
  X,
} from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Status = 'normal' | 'warning' | 'critical'
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
type Icon = ComponentType<{ className?: string }>

const history = Array.from({ length: 20 }, (_, index) => ({
  timestamp: `${index + 1}`,
  heartRate: 68 + Math.round(Math.sin(index / 2) * 4) + (index > 15 ? index - 15 : 0),
  riskLevel: 'LOW',
}))

export function SensorCard({ icon: IconComponent, label, value, unit, status = 'normal' }: { icon: Icon; label: string; value: string | number; unit?: string; status?: Status }) {
  return (
    <article className={`sensor-card sensor-${status}`}>
      <div className="sensor-icon"><IconComponent /></div>
      <p className="sensor-label">{label}</p>
      <p className="sensor-value">{value}{unit && <span>{unit}</span>}</p>
    </article>
  )
}

export function AlertScreen({ alertType, reason, questionText, secondsRemaining, buttonLabels, onButtonPress }: { alertType: 'heat' | 'respiratory' | 'fall'; reason: string; questionText: string; secondsRemaining: number; buttonLabels: [string, string]; onButtonPress?: (label: string) => void }) {
  const config = { heat: { icon: Thermometer, title: 'HEAT STRESS DETECTED', tone: 'amber' }, respiratory: { icon: Wind, title: 'RESPIRATORY RISK DETECTED', tone: 'red' }, fall: { icon: AlertTriangle, title: 'FALL DETECTED', tone: 'red' } }[alertType]
  const IconComponent = config.icon
  return <section className={`alert-screen alert-${config.tone}`}><div className="alert-icon"><IconComponent /></div><p className="alert-kicker">ADAPTIVE EDGE ALERT</p><h2>{config.title}</h2><p className="alert-reason">{reason}</p><p className="alert-question">{questionText}</p><div className="countdown-bar"><span style={{ width: `${Math.max(0, Math.min(100, secondsRemaining / 15 * 100))}%` }} /></div><p className="countdown-copy"><strong>{secondsRemaining}</strong> seconds remaining</p><div className="alert-actions">{buttonLabels.map((label) => <button key={label} onClick={() => onButtonPress?.(label)}>{label}</button>)}</div></section>
}

export function SafetyActionScreen({ riskType, instructions, onSOSPress }: { riskType: string; instructions: string[]; onSOSPress?: () => void }) {
  return <section className="safety-screen"><div className="safety-banner"><AlertTriangle /><div><p>FINAL RISK ASSESSMENT</p><strong>{riskType}</strong></div></div><div className="safety-body"><p className="eyebrow">SAFETY PROTOCOL</p><h2>Take action now</h2><div className="safety-list">{instructions.map((instruction) => <div className="safety-row" key={instruction}><span><Check /></span><p>{instruction}</p></div>)}</div><button className="sos-button" onClick={onSOSPress}>TRIGGER SOS <AlertTriangle /></button></div></section>
}

export function SOSCountdownScreen({ secondsRemaining, condition, location, contact, onCancel, isComplete }: { secondsRemaining: number; condition: string; location: string; contact: string; onCancel?: () => void; isComplete: boolean }) {
  return <section className={`sos-screen ${isComplete ? 'sos-complete' : ''}`}>{isComplete ? <><div className="complete-icon"><Check /></div><p className="eyebrow">SIMULATION STATUS</p><h2>SOS SIMULATION COMPLETE</h2><p className="sos-subtitle">No emergency dispatch was made.</p></> : <><div className="sos-icon"><AlertTriangle /></div><p className="eyebrow">HACKATHON DEMO · SIMULATION</p><h2>EMERGENCY DETECTED</h2><p className="sos-subtitle">Possible: {condition}</p><p className="sos-count">{secondsRemaining}</p><p className="sos-label">SOS dispatch in:</p><div className="sos-meta"><p><MapPin /> Last known location: {location}</p><p><CircleHelp /> Emergency contact: {contact}</p></div><button className="cancel-button" onClick={onCancel}>CANCEL FALSE ALARM</button></>}</section>
}

export function DemoController({ activeScenario, onScenarioSelect, liveSensorData }: { activeScenario: string; onScenarioSelect: (scenario: string) => void; liveSensorData: Record<string, string | number> }) {
  const scenarios: { label: string; icon: Icon }[] = [{ label: 'BASELINE', icon: ShieldCheck }, { label: 'HEATWAVE', icon: Thermometer }, { label: 'RESPIRATORY', icon: Wind }, { label: 'FALL', icon: AlertTriangle }]
  return <aside className="controller-panel"><div className="controller-heading"><div className="brand-mark"><HeartPulse /></div><div><strong>Adaptive Edge</strong><span>Health Companion</span></div></div><div className="demo-title"><p>DEMO CONTROLS</p><h2>Scenario simulator</h2><span>Present the adaptive response flow.</span></div><div className="scenario-buttons">{scenarios.map(({ label, icon: IconComponent }) => <button className={activeScenario === label ? 'active' : ''} key={label} onClick={() => onScenarioSelect(label)}><IconComponent /><span>{label}</span><Play /></button>)}</div><div className="feed"><div className="feed-heading"><span>Live Sensor Feed</span><span>RAW / EDGE</span></div>{Object.entries(liveSensorData).map(([key, value]) => <div className="feed-row" key={key}><span>{key}</span><strong>{value}</strong></div>)}</div><div className="controller-footer"><span><i /> OFFLINE DEMO MODE</span><small>v0.2.0 · Hackathon prototype</small></div></aside>
}

function HistoryChart({ history }: { history: typeof history }) {
  return <div className="history-card"><div className="history-heading"><div><p className="eyebrow">RECENT HISTORY</p><h3>Heart rate</h3></div><span>BPM</span></div><ResponsiveContainer width="100%" height={110}><LineChart data={history} margin={{ top: 10, right: 4, bottom: 0, left: -26 }}><CartesianGrid vertical={false} stroke="rgba(155,198,195,.1)" /><XAxis dataKey="timestamp" tick={{ fill: '#6d8a8b', fontSize: 8 }} axisLine={false} tickLine={false} /><YAxis domain={[55, 90]} tick={{ fill: '#6d8a8b', fontSize: 8 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#102328', border: '1px solid #2e6664', borderRadius: 8, fontSize: 10 }} /><Line type="monotone" dataKey="heartRate" stroke="#62d9c8" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>
}

function Dashboard({ riskLevel, onAlert }: { riskLevel: RiskLevel; onAlert: () => void }) {
  const riskCopy = { LOW: 'YOU ARE SAFE', MODERATE: 'STAY ALERT', HIGH: 'ACTION NEEDED', CRITICAL: 'EMERGENCY RISK' }[riskLevel]
  const statusFor = (level: RiskLevel): Status => level === 'LOW' ? 'normal' : level === 'MODERATE' ? 'warning' : 'critical'
  const status = statusFor(riskLevel)
  return <div className="phone-dashboard"><header className="dashboard-header"><div><p className="eyebrow">ADAPTIVE EDGE</p><h1>Health Companion</h1></div><span className="offline-pill">● EDGE MODE — OFFLINE</span></header><section className={`risk-banner risk-${status}`}><div><p className="eyebrow">CURRENT RISK LEVEL</p><h2>{riskCopy}</h2><strong>{riskLevel}</strong></div><ShieldCheck /></section><div className="sensor-grid"><SensorCard icon={HeartPulse} label="Heart rate" value={72} unit=" BPM" status={status} /><SensorCard icon={Wind} label="SpO₂" value={98} unit=" %" /><SensorCard icon={Thermometer} label="Skin temperature" value={36.5} unit=" °C" /><SensorCard icon={Thermometer} label="Ambient temperature" value={28} unit=" °C" status={riskLevel === 'LOW' ? 'normal' : 'warning'} /><SensorCard icon={Droplets} label="Humidity" value={50} unit=" %" /><SensorCard icon={Wind} label="AQI" value={50} /><SensorCard icon={Activity} label="Activity" value="Resting" status="normal" /></div><div className="today-heading"><div><p className="eyebrow">TODAY&apos;S HEALTH</p><h2>Signal history</h2></div><button onClick={onAlert} aria-label="Preview alert"><AlertTriangle /></button></div><HistoryChart history={history} /></div>
}

export default function Page() {
  const [activeScenario, setActiveScenario] = useState('BASELINE')
  const [showAlert, setShowAlert] = useState(false)
  const riskLevel: RiskLevel = activeScenario === 'BASELINE' ? 'LOW' : activeScenario === 'HEATWAVE' ? 'MODERATE' : 'HIGH'
  const liveSensorData = { heartRate: riskLevel === 'LOW' ? 72 : 104, spo2: riskLevel === 'LOW' ? '98%' : '92%', skinTemperature: riskLevel === 'LOW' ? '36.5°C' : '38.2°C', ambientTemperature: riskLevel === 'LOW' ? '28°C' : '39°C', humidity: '50%', aqi: 50, activity: 'Resting', impactG: '0.02g', movement: 'Stable' }
  return <main className={`app-shell ${showAlert ? 'alert-active' : ''}`}><DemoController activeScenario={activeScenario} onScenarioSelect={(scenario) => { setActiveScenario(scenario); setShowAlert(scenario !== 'BASELINE') }} liveSensorData={liveSensorData} /><section className="preview-stage"><div className="stage-label"><span /> PHONE PREVIEW <span /></div><div className="phone-frame"><div className="phone-screen"><div className="phone-notch"><span /></div><div className="phone-status"><span>9:41</span><span>▮▮▮　⌁　▰</span></div>{showAlert ? <AlertScreen alertType={activeScenario === 'HEATWAVE' ? 'heat' : activeScenario === 'FALL' ? 'fall' : 'respiratory'} reason={activeScenario === 'HEATWAVE' ? 'Elevated heart rate with high ambient temperature' : 'Reduced oxygen saturation detected'} questionText={activeScenario === 'FALL' ? 'Do you need immediate assistance?' : 'Are you feeling dizzy or unusually tired?'} secondsRemaining={15} buttonLabels={activeScenario === 'FALL' ? ['HELP', "I'M OKAY"] : ['YES, UNWELL', "I'M FINE"]} onButtonPress={() => setShowAlert(false)} /> : <Dashboard riskLevel={riskLevel} onAlert={() => setShowAlert(true)} />}<div className="phone-home" /></div></div><p className="preview-caption">Adaptive Edge Health Companion <span>•</span> Interactive demo shell</p></section></main>
}
