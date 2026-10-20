// src/audio/TrainSound.js
import * as THREE from 'three';
import { sound } from './SoundEngine.js';

// Speed of sound in scene units per second. At the train's 40 units/s this gives the pitch shift
// chosen from the samples ("realistic Doppler").
const SPEED_OF_SOUND = 343;
const REF_DISTANCE = 25;     // full volume this close; quieter with distance beyond it
const MAX_DISTANCE = 220;    // silent beyond this
const SHAKE = 0.6;           // carriage rattle / sway / creak amount (0..1)
const JOINT_SPACING = 16.8;  // rail joints: a "da-dum" every this many units travelled
const PAIR_GAP = 4.4;        // between the two clacks of a "da-dum"
const TUNNEL_FADE = 0.5;     // time constant of the fade as the train slides into the tunnel (~1.5 s)
const SLEEP_AFTER = 3;       // seconds of silence before the generators are stopped (the 5 s gap
                             // between passes sleeps; the next pass wakes them fresh)

const _point = new THREE.Vector3();
const _toListener = new THREE.Vector3();
const _right = new THREE.Vector3();

/**
 * The train's sound, live: a continuous rumble, motor hum and rail hiss, rail-joint clacks every few
 * units travelled, and carriage shake (metal rattle, body sway, creaks). Each frame it is placed at
 * the visible part of the train nearest the camera, which gives its volume and left/right position;
 * the train's speed toward the camera gives the Doppler pitch. Camera movement doesn't bend the pitch.
 */
export class TrainSound {
  constructor(trainLoop) {
    this.train = trainLoop;
    this.layers = null;
    this.doppler = 1;
    this.travelled = 0;
    this.nextGrain = 0;
    this.nextCreak = 0;
    this.silentFor = 0;
  }

  update(dt, camera) {
    if (!sound.ready) return;
    const ctx = sound.ctx;
    const now = ctx.currentTime;
    const span = this.train.enabled ? this.train.visibleSpan() : null;

    let level = 0;
    if (span) {
      const listener = camera.position;
      _point.set(THREE.MathUtils.clamp(listener.x, span.minX, span.maxX), this.train.centerY, this.train.centerZ);
      _toListener.subVectors(listener, _point);
      const distance = Math.max(_toListener.length(), 1);
      _toListener.divideScalar(distance);
      const fadeOut = THREE.MathUtils.clamp((MAX_DISTANCE - distance) / 40, 0, 1);
      level = Math.min(1, REF_DISTANCE / distance) ** 1.3 * fadeOut;

      // Doppler from the train's own motion toward the camera, smoothed
      const velocityX = this.train.moving ? this.train.speed * this.train.direction : 0;
      const approach = THREE.MathUtils.clamp(velocityX * _toListener.x, -SPEED_OF_SOUND / 2, SPEED_OF_SOUND / 2);
      const target = SPEED_OF_SOUND / (SPEED_OF_SOUND - approach);
      this.doppler += (target - this.doppler) * Math.min(1, dt / 0.15);

      _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      this.pan = THREE.MathUtils.clamp(-_toListener.dot(_right) * 0.9, -1, 1);
    }

    // Asleep while silent; wake up when the train is back in earshot
    if (level < 0.003) {
      this.silentFor += dt;
      if (this.layers) {
        this.layers.out.gain.setTargetAtTime(0, now, TUNNEL_FADE);
        if (this.silentFor > SLEEP_AFTER) this.sleep();
      }
      return;
    }
    this.silentFor = 0;
    if (!this.layers) this.wake(ctx);

    const L = this.layers;
    const f = this.doppler;
    L.out.gain.setTargetAtTime(level, now, 0.05);
    L.pan.pan.setTargetAtTime(this.pan, now, 0.05);
    L.hum1.frequency.setTargetAtTime(82 * f, now, 0.05);
    L.hum2.frequency.setTargetAtTime(123 * f, now, 0.05);
    L.rumble.playbackRate.setTargetAtTime(f, now, 0.05);
    L.hiss.playbackRate.setTargetAtTime(f, now, 0.05);
    L.hissFilter.frequency.setTargetAtTime(2200 * f, now, 0.05);

    if (!this.train.moving) return;

    // Rail joints, by distance travelled: "da-dum"
    this.travelled += this.train.speed * dt;
    while (this.travelled >= JOINT_SPACING) {
      this.travelled -= JOINT_SPACING;
      this.clack(now, level, f);
      this.clack(now + PAIR_GAP / this.train.speed, level, f);
    }

    // Carriage rattle: tiny random metal ticks, scheduled a little ahead
    const rate = 25 + 45 * SHAKE;
    if (this.nextGrain < now) this.nextGrain = now;
    while (this.nextGrain < now + 0.1) {
      this.grain(this.nextGrain, level, f);
      this.nextGrain += (1 / rate) * (0.4 + Math.random() * 1.2);
    }

    // Now and then a car body creaks
    if (this.nextCreak < now) {
      if (Math.random() < 0.35 + 0.5 * SHAKE) this.creak(now, level, f);
      this.nextCreak = now + 1.1 + Math.random() * 1.4;
    }
  }

  // Continuous layers: rumble (with sway), motor hum, rail hiss. Each pass starts fresh: no pitch or
  // clack timing carried over from the previous one.
  wake(ctx) {
    this.doppler = 1;
    this.travelled = 0;
    this.nextGrain = 0;
    this.nextCreak = 0;
    const out = ctx.createGain();
    out.gain.value = 0;
    const pan = ctx.createStereoPanner();
    out.connect(pan).connect(sound.master);

    const rumble = this.loop(ctx, sound.brownNoise);
    const rumbleFilter = this.filter(ctx, 'lowpass', 160);
    const sway = ctx.createGain();
    rumble.connect(rumbleFilter).connect(sway).connect(this.gain(ctx, 0.9)).connect(out);
    // The cars rocking: two slow wobbles on the rumble's volume
    const swayDepth = this.gain(ctx, 0.35 * SHAKE);
    const lfo1 = this.osc(ctx, 'sine', 5.3);
    const lfo2 = this.osc(ctx, 'sine', 2.9);
    lfo1.connect(swayDepth);
    lfo2.connect(swayDepth);
    swayDepth.connect(sway.gain);

    const hum1 = this.osc(ctx, 'sawtooth', 82);
    const hum2 = this.osc(ctx, 'sawtooth', 123);
    const humFilter = this.filter(ctx, 'lowpass', 500);
    hum1.connect(humFilter);
    hum2.connect(humFilter);
    humFilter.connect(this.gain(ctx, 0.12)).connect(out);

    const hiss = this.loop(ctx, sound.noise);
    const hissFilter = this.filter(ctx, 'bandpass', 2200, 0.7);
    hiss.connect(hissFilter).connect(this.gain(ctx, 0.12)).connect(out);

    const sources = [rumble, lfo1, lfo2, hum1, hum2, hiss];
    sources.forEach((s) => s.start());
    this.layers = { out, pan, rumble, hum1, hum2, hiss, hissFilter, sources };
  }

  sleep() {
    this.layers.sources.forEach((s) => s.stop());
    this.layers.out.disconnect();
    this.layers = null;
  }

  // One-shots go straight to the master with their own pan, so each keeps the place it was made at
  oneShot(ctx, node, gain) {
    const pan = ctx.createStereoPanner();
    pan.pan.value = this.pan;
    node.connect(gain).connect(pan).connect(sound.master);
  }

  clack(time, level, f) {
    const ctx = sound.ctx;
    const source = this.burst(ctx);
    const gain = ctx.createGain();
    sound.envelope(gain, time, 0.002, 0.9 * level, 0.05);
    this.oneShot(ctx, source.connect(this.filter(ctx, 'bandpass', 700 * f, 1.5)), gain);
    source.start(time, Math.random());
    source.stop(time + 0.08);
  }

  grain(time, level, f) {
    const ctx = sound.ctx;
    const source = this.burst(ctx);
    const gain = ctx.createGain();
    const length = 0.004 + Math.random() * 0.012;
    sound.envelope(gain, time, 0.001, level * SHAKE * (0.08 + Math.random() * 0.32), length);
    const filter = this.filter(ctx, 'bandpass', (2600 + Math.random() * 3200) * f, 4 + Math.random() * 6);
    this.oneShot(ctx, source.connect(filter), gain);
    source.start(time, Math.random() * 1.9);
    source.stop(time + length + 0.02);
  }

  creak(time, level, f) {
    const ctx = sound.ctx;
    const osc = this.osc(ctx, 'sawtooth', (240 + Math.random() * 160) * f);
    osc.frequency.linearRampToValueAtTime((180 + Math.random() * 120) * f, time + 0.22);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(level * SHAKE * 0.18, time + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.26);
    this.oneShot(ctx, osc.connect(this.filter(ctx, 'bandpass', 520 * f, 9)), gain);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  loop(ctx, buffer) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  burst(ctx) {
    const source = ctx.createBufferSource();
    source.buffer = sound.noise;
    return source;
  }

  osc(ctx, type, frequency) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    return osc;
  }

  filter(ctx, type, frequency, q = 1) {
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  gain(ctx, value) {
    const gain = ctx.createGain();
    gain.gain.value = value;
    return gain;
  }
}
