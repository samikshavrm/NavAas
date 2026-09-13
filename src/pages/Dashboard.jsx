import { useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { useSensorData } from '../hooks/useSensorData'

// Person 3's modules — the Ask, Reassess, Safety, and SOS pipeline
import { getQuestionForAlert, RESPONSES } from '../ask/index.js'
import { runResponseSession, speakText } from '../response/index.js'
import { reassessRisk } from '../reassessment/index.js'
import { getSafetyActions } from '../safety/index.js'
import { shouldActivateSOS, createSOSController } from '../sos/index.js'

// ── Sound + vibration helpers ────────────────────────────────────────────────
// Built with the Web Audio API so no external sound file is needed — this
// works fully offline, matching the "no internet dependency" requirement.
// Both are safe no-ops on browsers/devices that don't support them (e.g. a
// laptop won't vibrate, it'll just skip that part silently).

function playTone({ frequency = 880, durationMs = 150, type = 'sine', volume = 0.2 } = {}) {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.value = volume
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    setTimeout(() => {
      oscillator.stop()
      ctx.close()
    }, durationMs)
  } catch (_) {
    // Audio not supported/allowed — fail silently, never block the app.
  }
}

/** Urgent double-beep played the instant an SOS countdown begins. */
function playSOSStartSound() {
  playTone({ frequency: 950, durationMs: 140, type: 'square', volume: 0.22 })
  setTimeout(() => playTone({ frequency: 950, durationMs: 140, type: 'square', volume: 0.22 }), 220)
}

/** Softer single "ding" played when the notification is confirmed sent. */
function playNotificationSentSound() {
  playTone({ frequency: 1200, durationMs: 180, type: 'sine', volume: 0.18 })
}

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

/**
 * Speaks a single countdown number quickly (e.g. "30", "29", "28"...).
 * Cancels any number still being spoken before starting the next one, so
 * numbers don't pile up or overlap if speech is slightly slower than 1s.
 */
function speakCountdownNumber(number) {
  try {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(String(number))
    utterance.rate = 1.15
    utterance.pitch = 1
    utterance.volume = 1
    window.speechSynthesis.speak(utterance)
  } catch (_) {
    // Speech not supported — fail silently, countdown still works visually.
  }
}

function statusFor(level) {
  return level === 'LOW' ? 'normal' : level === 'MODERATE' ? 'warning' : 'critical'
}

// Human-readable labels for each RESPONSES constant, used on the alert buttons.
const RESPONSE_LABELS = {
  [RESPONSES.UNWELL]: 'YES, UNWELL',
  [RESPONSES.BREATHING_DIFFICULTY]: 'YES, DIFFICULTY',
  [RESPONSES.HELP]: 'HELP',
  [RESPONSES.FINE]: "I'M FINE",
  [RESPONSES.OKAY]: "I'M OKAY",
}

export function SensorCard({ icon: IconComponent, label, value, unit, status = 'normal' }) {
  return (
    <article className={`sensor-card sensor-${status}`}>
      <div className="sensor-icon"><IconComponent /></div>
      <p className="sensor-label">{label}</p>
      <p className="sensor-value">{value}{unit && <span>{unit}</span>}</p>
    </article>
  )
}

export function AlertScreen({ alertType, reason, questionText, secondsRemaining, buttonLabels, onButtonPress }) {
  const config = {
    HEAT: { icon: Thermometer, title: 'HEAT STRESS DETECTED', tone: 'amber' },
    RESPIRATORY: { icon: Wind, title: 'RESPIRATORY RISK DETECTED', tone: 'red' },
    FALL: { icon: AlertTriangle, title: 'FALL DETECTED', tone: 'red' },
  }[alertType] || { icon: AlertTriangle, title: 'ALERT DETECTED', tone: 'amber' }
  const IconComponent = config.icon
  return (
    <section className={`alert-screen alert-${config.tone}`}>
      <div className="alert-icon"><IconComponent /></div>
      <p className="alert-kicker">ADAPTIVE EDGE ALERT</p>
      <h2>{config.title}</h2>
      <p className="alert-reason">{reason}</p>
      <p className="alert-question">{questionText}</p>
      <div className="countdown-bar">
        <span style={{ width: `${Math.max(0, Math.min(100, secondsRemaining / 15 * 100))}%` }} />
      </div>
      <p className="countdown-copy"><strong>{secondsRemaining}</strong> seconds remaining</p>
      <div className="alert-actions">
        {buttonLabels.map(({ label, value }) => (
          <button key={value} onClick={() => onButtonPress?.(value)}>{label}</button>
        ))}
      </div>
    </section>
  )
}

export function SafetyActionScreen({ riskType, instructions, onSOSPress, onResumeMonitoring }) {
  return (
    <section className="safety-screen">
      <div className="safety-banner">
        <AlertTriangle />
        <div><p>FINAL RISK ASSESSMENT</p><strong>{riskType}</strong></div>
      </div>
      <div className="safety-body">
        <p className="eyebrow">SAFETY PROTOCOL</p>
        <h2>Take action now</h2>
        <div className="safety-list">
          {instructions.map((instruction) => (
            <div className="safety-row" key={instruction}>
              <span><Check /></span>
              <p>{instruction}</p>
            </div>
          ))}
        </div>
        <button className="sos-button" onClick={onSOSPress}>TRIGGER SOS <AlertTriangle /></button>
        <button
          onClick={onResumeMonitoring}
          style={{ marginTop: 10, width: '100%', minHeight: 44, background: 'transparent', color: '#9aaab0', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, fontSize: 11, fontWeight: 700 }}
        >
          RESUME MONITORING
        </button>
      </div>
    </section>
  )
}

export function SOSCountdownScreen({ secondsRemaining, condition, location, contact, onCancel, isComplete, onResumeMonitoring }) {
  const sentAt = isComplete ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
  return (
    <section className={`sos-screen ${isComplete ? 'sos-complete' : ''}`}>
      {isComplete ? (
        <>
          <div className="complete-icon"><Check /></div>
          <p className="eyebrow">SIMULATION STATUS</p>
          <h2>SOS SIMULATION COMPLETE</h2>
          <p className="sos-subtitle">No real emergency dispatch was made — this is a demo confirmation.</p>
          <div className="sos-meta" style={{ marginTop: 20, textAlign: 'left' }}>
            <p style={{ color: '#9dcac2', fontWeight: 700 }}><Check style={{ width: 13 }} /> Notification sent to: {contact}</p>
            <p><MapPin /> Location shared: {location}</p>
            <p><CircleHelp /> Reason: {condition}</p>
            <p>Sent at: {sentAt}</p>
          </div>
          <button
            onClick={onResumeMonitoring}
            style={{ marginTop: 24, minHeight: 48, padding: '0 20px', background: 'rgba(255,255,255,.08)', color: '#d8f6eb', border: '1px solid rgba(255,255,255,.2)', borderRadius: 10, fontSize: 11, fontWeight: 700 }}
          >
            RETURN TO DASHBOARD
          </button>
        </>
      ) : (
        <>
          <div className="sos-icon"><AlertTriangle /></div>
          <p className="eyebrow">HACKATHON DEMO · SIMULATION</p>
          <h2>EMERGENCY DETECTED</h2>
          <p className="sos-subtitle">Possible: {condition}</p>
          <p className="sos-count">{secondsRemaining}</p>
          <p className="sos-label">SOS dispatch in:</p>
          <div className="sos-meta">
            <p><MapPin /> Last known location: {location}</p>
            <p><CircleHelp /> Emergency contact: {contact}</p>
          </div>
          <button className="cancel-button" onClick={onCancel}>CANCEL FALSE ALARM</button>
        </>
      )}
    </section>
  )
}

// A slide-down notification banner that mimics a phone SMS/push notification,
// used to visually confirm "the emergency contact was just notified" the
// moment the SOS simulation completes.
export function SMSNotificationToast({ visible, message }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: visible ? 32 : -140,
        left: 10,
        right: 10,
        zIndex: 50,
        transition: 'top 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
        background: 'rgba(18,26,30,0.97)',
        border: '1px solid rgba(255,255,255,.14)',
        borderRadius: 16,
        padding: '11px 12px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        boxShadow: '0 12px 34px rgba(0,0,0,.5)',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#d94c58', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <AlertTriangle style={{ width: 15, color: '#fff' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong style={{ fontSize: 11, color: '#fff' }}>Emergency SOS</strong>
          <span style={{ fontSize: 8, color: '#8a9a9d', flexShrink: 0, marginLeft: 6 }}>now</span>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 10, color: '#c9d7d6', lineHeight: 1.4 }}>{message}</p>
      </div>
    </div>
  )
}

export function DemoController({ activeScenario, onScenarioSelect, liveSensorData }) {
  const scenarios = [
    { label: 'BASELINE', icon: ShieldCheck },
    { label: 'HEATWAVE', icon: Thermometer },
    { label: 'RESPIRATORY', icon: Wind },
    { label: 'FALL', icon: AlertTriangle },
  ]
  return (
    <aside className="controller-panel">
      <div className="controller-heading">
        <div className="brand-mark"><HeartPulse /></div>
        <div><strong>Adaptive Edge</strong><span>Health Companion</span></div>
      </div>
      <div className="demo-title">
        <p>DEMO CONTROLS</p>
        <h2>Scenario simulator</h2>
        <span>Present the adaptive response flow.</span>
      </div>
      <div className="scenario-buttons">
        {scenarios.map(({ label, icon: IconComponent }) => (
          <button className={activeScenario === label ? 'active' : ''} key={label} onClick={() => onScenarioSelect(label)}>
            <IconComponent /><span>{label}</span><Play />
          </button>
        ))}
      </div>
      <div className="feed">
        <div className="feed-heading"><span>Live Sensor Feed</span><span>RAW / EDGE</span></div>
        {Object.entries(liveSensorData).map(([key, value]) => (
          <div className="feed-row" key={key}><span>{key}</span><strong>{String(value)}</strong></div>
        ))}
      </div>
      <div className="controller-footer">
        <span><i /> OFFLINE DEMO MODE</span>
        <small>v0.2.0 · Hackathon prototype</small>
      </div>
    </aside>
  )
}

function HistoryChart({ history }) {
  return (
    <div className="history-card">
      <div className="history-heading">
        <div><p className="eyebrow">RECENT HISTORY</p><h3>Heart rate</h3></div>
        <span>BPM</span>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={history} margin={{ top: 10, right: 4, bottom: 0, left: -26 }}>
          <CartesianGrid vertical={false} stroke="rgba(155,198,195,.1)" />
          <XAxis dataKey="timestamp" tick={{ fill: '#6d8a8b', fontSize: 8 }} axisLine={false} tickLine={false} />
          <YAxis domain={[55, 160]} tick={{ fill: '#6d8a8b', fontSize: 8 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#102328', border: '1px solid #2e6664', borderRadius: 8, fontSize: 10 }} />
          <Line type="monotone" dataKey="heartRate" stroke="#62d9c8" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function Dashboard({ sensorData, riskResult, history }) {
  const riskLevel = riskResult.riskLevel
  const riskCopy = { LOW: 'YOU ARE SAFE', MODERATE: 'STAY ALERT', HIGH: 'ACTION NEEDED', CRITICAL: 'EMERGENCY RISK' }[riskLevel] || 'MONITORING'
  const status = statusFor(riskLevel)

  return (
    <div className="phone-dashboard">
      <header className="dashboard-header">
        <div><p className="eyebrow">ADAPTIVE EDGE</p><h1>Health Companion</h1></div>
        <span className="offline-pill">● EDGE MODE — OFFLINE</span>
      </header>
      <section className={`risk-banner risk-${status}`}>
        <div><p className="eyebrow">CURRENT RISK LEVEL</p><h2>{riskCopy}</h2><strong>{riskLevel}</strong></div>
        <ShieldCheck />
      </section>
      <div className="sensor-grid">
        <SensorCard icon={HeartPulse} label="Heart rate" value={sensorData.heartRate} unit=" BPM" status={status} />
        <SensorCard icon={Wind} label="SpO₂" value={sensorData.spo2} unit=" %" />
        <SensorCard icon={Thermometer} label="Skin temperature" value={sensorData.skinTemperature} unit=" °C" />
        <SensorCard icon={Thermometer} label="Ambient temperature" value={sensorData.ambientTemperature} unit=" °C" status={riskLevel === 'LOW' ? 'normal' : 'warning'} />
        <SensorCard icon={Droplets} label="Humidity" value={sensorData.humidity} unit=" %" />
        <SensorCard icon={Wind} label="AQI" value={sensorData.aqi} />
        <SensorCard icon={Activity} label="Activity" value={sensorData.activity === 'active' ? 'Active' : 'Resting'} status="normal" />
      </div>
      <div className="today-heading">
        <div><p className="eyebrow">TODAY&apos;S HEALTH</p><h2>Signal history</h2></div>
      </div>
      <HistoryChart history={history} />
    </div>
  )
}

export default function Page() {
  const { sensorData, riskResult, setScenario } = useSensorData()
  const [activeScenario, setActiveScenario] = useState('BASELINE')
  const [heartRateHistory, setHeartRateHistory] = useState([])

  // Screen state machine: what the phone screen currently shows.
  // 'DASHBOARD' -> 'ASKING' -> 'SAFETY' or 'SOS' -> back to 'DASHBOARD'
  const [screen, setScreen] = useState('DASHBOARD')
  const [questionState, setQuestionState] = useState(null) // { detectionResult, questionConfig, secondsRemaining }
  const [safetyState, setSafetyState] = useState(null) // { severity, instructions }
  const [sosState, setSosState] = useState(null) // { remainingSeconds, alertType, reason, location, emergencyContact, status }
  const [showNotificationToast, setShowNotificationToast] = useState(false)

  // Holds the "resolve" function for the promise the response session is
  // waiting on. Clicking a button calls this to resolve the user's answer.
  const responseResolverRef = useRef(null)
  const sosControllerRef = useRef(null)
  // Remembers which alertType we've already asked about, so a still-ongoing
  // HEATWAVE/RESPIRATORY reading (which keeps re-detecting every ~1.5s) doesn't
  // trigger the question again the instant we return to the dashboard.
  const askedForAlertTypeRef = useRef(null)

  // Track heart-rate history for the chart — runs once per new sensor packet.
  useEffect(() => {
    setHeartRateHistory((prev) => {
      const next = [...prev, { timestamp: String(prev.length + 1), heartRate: sensorData.heartRate }]
      return next.slice(-20)
    })
  }, [sensorData.timestamp])

  // Whenever the detection engine reports a new alert (and we're not
  // already handling one, and we haven't already asked about this exact
  // alert type), kick off the Ask -> Reassess -> Act flow.
  useEffect(() => {
    if (screen !== 'DASHBOARD') return // already mid-flow, don't retrigger
    if (!riskResult.alertType) return // no alert right now
    if (riskResult.riskLevel === 'LOW') return // nothing to ask about
    if (askedForAlertTypeRef.current === riskResult.alertType) return // already asked for this ongoing alert

    askedForAlertTypeRef.current = riskResult.alertType
    startAlertFlow(riskResult)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskResult.alertType, riskResult.riskLevel, screen])

  async function startAlertFlow(detectionResult) {
    const questionConfig = getQuestionForAlert(detectionResult)
    setScreen('ASKING')
    setQuestionState({ detectionResult, questionConfig, secondsRemaining: 15 })

    // Speak the question aloud (safe no-op if browser doesn't support it)
    speakText(questionConfig.question)

    // waitForUserResponse() returns a promise that resolves when a button
    // is clicked. We stash the resolver so the button's onClick can call it.
    const waitForUserResponse = () =>
      new Promise((resolve) => {
        responseResolverRef.current = resolve
      })

    const { response } = await runResponseSession(questionConfig, waitForUserResponse, {
      onTick: (remainingMs) => {
        setQuestionState((prev) => (prev ? { ...prev, secondsRemaining: Math.ceil(remainingMs / 1000) } : prev))
      },
    })

    responseResolverRef.current = null

    // Combine sensor evidence + user response into a final risk decision.
    const reassessment = reassessRisk(detectionResult, response)
    const safety = getSafetyActions(reassessment, detectionResult.alertType)

    if (shouldActivateSOS(reassessment, safety)) {
      beginSOS(reassessment, safety)
    } else if (reassessment.finalRiskLevel === 'HIGH') {
      // Only HIGH gets the full-screen safety checklist takeover.
      // LOW/MODERATE (e.g. user said "I'm fine" but sensors still show
      // mild risk) just returns to the dashboard, where the risk banner
      // already reflects the ongoing MODERATE/warning state in color.
      setSafetyState({ severity: reassessment.finalRiskLevel, instructions: safety.instructions })
      setScreen('SAFETY')
    } else {
      setScreen('DASHBOARD')
    }
  }

  function handleAlertButtonPress(responseValue) {
    responseResolverRef.current?.(responseValue)
  }

  function beginSOS(reassessment, safety) {
    setScreen('SOS')
    // Urgent alert cue the instant the countdown begins.
    playSOSStartSound()
    vibrate([200, 100, 200, 100, 200])

    const controller = createSOSController({
      alertType: safety.alertType,
      reason: reassessment.reason,
      onTick: (state) => {
        setSosState({ ...state, isComplete: false })
        speakCountdownNumber(state.remainingSeconds) // voice: "29", "28", "27"...
      },
      onComplete: (state) => {
        setSosState({ ...state, isComplete: true })
        // Confirmation cue the instant the notification is "sent".
        playNotificationSentSound()
        vibrate([80])
        setShowNotificationToast(true)
        setTimeout(() => setShowNotificationToast(false), 4500)
      },
      onCancel: () => resetToDashboard(),
    })
    sosControllerRef.current = controller
    const initialState = controller.getState()
    setSosState({ ...initialState, isComplete: false })
    speakCountdownNumber(initialState.remainingSeconds) // voice: "30" (the very first number)
    controller.start()
  }

  function handleManualSOSFromSafety() {
    const reassessment = { finalRiskLevel: 'CRITICAL', reason: safetyState?.severity ? `${safetyState.severity} risk — manual SOS trigger` : 'Manual SOS trigger' }
    const safety = { alertType: questionState?.detectionResult?.alertType ?? 'UNKNOWN', triggerSOS: true }
    beginSOS(reassessment, safety)
  }

  function handleSOSCancel() {
    if (window.speechSynthesis) window.speechSynthesis.cancel() // stop any mid-countdown number immediately
    sosControllerRef.current?.cancel()
    resetToDashboard()
  }

  function resetToDashboard() {
    sosControllerRef.current = null
    askedForAlertTypeRef.current = null
    setScreen('DASHBOARD')
    setQuestionState(null)
    setSafetyState(null)
    setSosState(null)
    setShowNotificationToast(false)
    setScenario('BASELINE')
    setActiveScenario('BASELINE')
  }

  function handleScenarioSelect(scenario) {
    resetToDashboard()
    askedForAlertTypeRef.current = null
    setActiveScenario(scenario)
    setScenario(scenario)
  }

  const liveSensorData = {
    heartRate: sensorData.heartRate,
    spo2: `${sensorData.spo2}%`,
    skinTemperature: `${sensorData.skinTemperature}°C`,
    ambientTemperature: `${sensorData.ambientTemperature}°C`,
    humidity: `${sensorData.humidity}%`,
    aqi: sensorData.aqi,
    activity: sensorData.activity,
    impactG: `${sensorData.impactG}g`,
    movement: sensorData.movement ? 'Stable' : 'Still',
  }

  const isAlertActive = screen !== 'DASHBOARD'

  return (
    <main className={`app-shell ${isAlertActive ? 'alert-active' : ''}`}>
      <DemoController
        activeScenario={activeScenario}
        onScenarioSelect={handleScenarioSelect}
        liveSensorData={liveSensorData}
      />
      <section className="preview-stage">
        <div className="stage-label"><span /> PHONE PREVIEW <span /></div>
        <div className="phone-frame">
          <div className="phone-screen">
            <div className="phone-notch"><span /></div>
            <div className="phone-status"><span>9:41</span><span>▮▮▮　⌁　▰</span></div>

            <SMSNotificationToast
              visible={showNotificationToast}
              message={sosState ? `Message sent to ${sosState.emergencyContact}: "Emergency detected — ${sosState.reason}. Location: ${sosState.location}"` : ''}
            />

            {screen === 'ASKING' && questionState && (
              <AlertScreen
                alertType={questionState.detectionResult.alertType}
                reason={questionState.detectionResult.reason}
                questionText={questionState.questionConfig.question}
                secondsRemaining={questionState.secondsRemaining}
                buttonLabels={questionState.questionConfig.responses
                  .filter((r) => r !== RESPONSES.NO_RESPONSE) // NO_RESPONSE is automatic via timeout, not a button
                  .map((r) => ({ value: r, label: RESPONSE_LABELS[r] || r }))}
                onButtonPress={handleAlertButtonPress}
              />
            )}

            {screen === 'SAFETY' && safetyState && (
              <SafetyActionScreen
                riskType={safetyState.severity}
                instructions={safetyState.instructions}
                onSOSPress={handleManualSOSFromSafety}
                onResumeMonitoring={resetToDashboard}
              />
            )}

            {screen === 'SOS' && sosState && (
              <SOSCountdownScreen
                secondsRemaining={sosState.remainingSeconds}
                condition={sosState.alertType}
                location={sosState.location}
                contact={sosState.emergencyContact}
                isComplete={sosState.isComplete}
                onCancel={handleSOSCancel}
                onResumeMonitoring={resetToDashboard}
              />
            )}

            {screen === 'DASHBOARD' && (
              <Dashboard sensorData={sensorData} riskResult={riskResult} history={heartRateHistory} />
            )}

            <div className="phone-home" />
          </div>
        </div>
        <p className="preview-caption">Adaptive Edge Health Companion <span>•</span> Interactive demo shell</p>
      </section>
    </main>
  )
}