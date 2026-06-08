const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 1.6;
const samples = Math.floor(sampleRate * duration);

// Ascending warm chord — Cmaj9 voicing: C4, E4, G4, B4, D5
const freqs = [
  { f: 261.63, amp: 1.0 },
  { f: 329.63, amp: 0.85 },
  { f: 392.0, amp: 0.7 },
  { f: 493.88, amp: 0.55 },
  { f: 587.33, amp: 0.4 },
];

const data = new Int16Array(samples);
for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  let sample = 0;
  for (const { f, amp } of freqs) {
    sample += amp * Math.sin(2 * Math.PI * f * t);
    sample += 0.18 * amp * Math.sin(2 * Math.PI * f * 2 * t);
    sample += 0.08 * amp * Math.sin(2 * Math.PI * f * 3 * t);
  }
  sample /= freqs.length;

  let env;
  if (t < 0.08) env = t / 0.08;
  else if (t < 0.25) env = 1;
  else env = Math.max(0, 1 - (t - 0.25) / 1.35);

  data[i] = Math.round(sample * env * 32767 * 0.55);
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

const out = path.join(__dirname, '..', 'assets', 'sounds', 'boot.wav');
fs.writeFileSync(out, buf);
console.log('Wrote', out, '(', buf.length, 'bytes)');
