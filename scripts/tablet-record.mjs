// Record the FOM driver app running on an Android device (Expo Go) and drive it by tapping.
// Needs adb (platform-tools) and the device connected by USB with debugging on.
//
//   node scripts/tablet-record.mjs shot <out.png>
//   node scripts/tablet-record.mjs record <out.mp4> <guion.json>
//
// guion.json: [{ "wait": 1.5 }, { "tap": [x, y], "label": "Inspección" }, { "swipe": [x1,y1,x2,y2,ms] }, ...]
// Coordinates are device pixels. The recording is split into 3-minute chunks by Android;
// scripts here are short, so one chunk is enough. Nothing is installed or changed on the device.
import { spawnSync, spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'

const ADB = process.env.ADB || ['C:/Users/home/Documents/Codex/.tools/android-sdk/platform-tools/adb.exe', 'adb'].find(p => p === 'adb' || existsSync(p))
const adb = (...a) => spawnSync(ADB, a, { encoding: 'buffer', maxBuffer: 1 << 28 })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const [cmd, out, guion] = process.argv.slice(2)

if (cmd === 'shot') {
  writeFileSync(out, adb('exec-out', 'screencap', '-p').stdout)
  console.log(`Captura: ${out}`)
} else if (cmd === 'record') {
  const steps = JSON.parse(readFileSync(guion, 'utf8'))
  const remote = '/sdcard/fom-tutorial.mp4'
  adb('shell', 'rm', '-f', remote)
  const rec = spawn(ADB, ['shell', 'screenrecord', '--bit-rate', '16000000', '--time-limit', '170', remote], { stdio: 'ignore' })
  await sleep(1200)
  for (const s of steps) {
    if (s.wait) await sleep(s.wait * 1000)
    if (s.tap) adb('shell', 'input', 'tap', ...s.tap.map(String))
    if (s.swipe) adb('shell', 'input', 'swipe', ...s.swipe.map(String))
    if (s.text) adb('shell', 'input', 'text', s.text)
    if (s.key) adb('shell', 'input', 'keyevent', s.key)
    if (s.label) console.log(`· ${s.label}`)
  }
  await sleep(800)
  adb('shell', 'pkill', '-2', 'screenrecord')
  await new Promise(r => rec.on('exit', r))
  await sleep(800)
  const tmp = out.replace(/\.mp4$/, '.raw.mp4')
  adb('pull', remote, tmp)
  adb('shell', 'rm', '-f', remote)
  console.log(`Grabación: ${tmp}`)
} else {
  console.error('Uso: shot <out.png> | record <out.mp4> <guion.json>')
  process.exit(1)
}
