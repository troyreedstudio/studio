const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 2.2;
const samples = Math.floor(sampleRate * duration);

const detune = (freq, cents) => freq * Math.pow(2, cents / 1200);

const notes = [
  { f: 659.26, amp: 0.8, enterAt: 0.0 },
  { f: 987.77, amp: 0.6, enterAt: 0.08 },
  { f: 1318.51, amp: 0.45, enterAt: 0.16 },
  { f: 1567.98, amp: 0.32, enterAt: 0.24 },
];

const data = new Int16Array(samples);

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;

  let sample = 0;
  for (const { f, amp, enterAt } of notes) {
    if (t < enterAt) continue;
    const localT = t - enterAt;

    let env;
    if (localT < 0.02) env = localT / 0.02;
    else env = Math.max(0, Math.pow(1 - localT / 2.0, 1.2));

    sample += amp * env * 0.6 * Math.sin(2 * Math.PI * detune(f, -4) * t);
    sample += amp * env * 0.6 * Math.sin(2 * Math.PI * detune(f, +4) * t);
    sample += amp * env * 0.15 * Math.sin(2 * Math.PI * f * 2 * t);
  }
  sample /= notes.length;

  const shimmer = 1 + 0.018 * Math.sin(2 * Math.PI * 5.5 * t);

  data[i] = Math.round(sample * shimmer * 32767 * 0.55);
}

const buf = Buffer.alloc(44 + data.byteLength);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + data.byteLength, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(sampleRate, 24);
buf.writeUInt32LE(sampleRate * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(data.byteLength, 40);
Buffer.from(data.buffer).copy(buf, 44);

const out = path.join(__dirname, '..', 'assets', 'sounds', 'boot-bright.wav');
fs.writeFileSync(out, buf);
console.log('Wrote', out, '(', buf.length, 'bytes)');
