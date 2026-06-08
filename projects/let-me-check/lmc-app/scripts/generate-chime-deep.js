const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 3.0;
const samples = Math.floor(sampleRate * duration);

const detune = (freq, cents) => freq * Math.pow(2, cents / 1200);

const notes = [
  { f: 65.41, amp: 0.55 },
  { f: 130.81, amp: 0.6 },
  { f: 164.81, amp: 0.55 },
  { f: 196.0, amp: 0.5 },
  { f: 246.94, amp: 0.45 },
  { f: 329.63, amp: 0.35 },
];

const data = new Int16Array(samples);

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;

  const glide = t < 0.8 ? -8 * Math.pow(1 - t / 0.8, 1.5) : 0;

  let sample = 0;
  for (const { f, amp } of notes) {
    const fGlided = detune(f, glide);

    sample += amp * 0.5 * Math.sin(2 * Math.PI * detune(fGlided, -5) * t);
    sample += amp * 0.5 * Math.sin(2 * Math.PI * detune(fGlided, +5) * t);

    const filterOpen = Math.min(1, t / 1.4);
    sample += amp * 0.18 * filterOpen * Math.sin(2 * Math.PI * fGlided * 2 * t);
    sample += amp * 0.07 * filterOpen * Math.sin(2 * Math.PI * fGlided * 3 * t);
  }
  sample /= notes.length;

  let env;
  if (t < 0.7) {
    env = Math.pow(t / 0.7, 1.8);
  } else if (t < 1.3) {
    env = 1;
  } else {
    env = Math.max(0, Math.pow(1 - (t - 1.3) / 1.7, 1.4));
  }

  const shimmer = 1 + 0.01 * Math.sin(2 * Math.PI * 3.2 * t);

  data[i] = Math.round(sample * env * shimmer * 32767 * 0.62);
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

const out = path.join(__dirname, '..', 'assets', 'sounds', 'boot-deep.wav');
fs.writeFileSync(out, buf);
console.log('Wrote', out, '(', buf.length, 'bytes)');
