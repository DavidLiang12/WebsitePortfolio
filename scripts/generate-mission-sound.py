"""Render the original stereo swish-and-latch for the 620 ms mission doors."""
from pathlib import Path
import math
import random
import struct
import wave

rate, duration = 44100, 0.60
rng = random.Random(1996)
noise = [0.0, 0.0]
phase = 0.0
samples = []
for i in range(round(rate * duration)):
    t = i / rate
    travel = min(1.0, t / 0.49)
    envelope = math.sin(math.pi * travel) ** 1.6 if t < 0.49 else 0.0
    phase += 2 * math.pi * (180 - 95 * travel) / rate
    signals = []
    for channel in range(2):
        noise[channel] = noise[channel] * 0.83 + rng.uniform(-1, 1) * 0.17
        signals.append(envelope * (noise[channel] * 0.48 + math.sin(phase + channel * 0.2) * 0.075))
    # Opposing swishes converge to the center as the two panels meet.
    blend = 0.5 * travel
    latch_t = t - 0.47
    latch = (math.sin(2 * math.pi * 130 * latch_t) * 0.16 + rng.uniform(-1, 1) * 0.09) * math.exp(-latch_t * 65) if latch_t >= 0 else 0
    fade = min(1.0, t / 0.012, (duration - t) / 0.025)
    samples.extend(((signals[c] * (1 - blend) + signals[1-c] * blend + latch) * max(0, fade)) for c in range(2))
peak = max(abs(value) for value in samples)
target = Path(__file__).absolute().parents[1] / 'Sound' / 'mission-doors.wav'
with wave.open(str(target), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes(b''.join(struct.pack('<h', round(value / peak * 0.65 * 32767)) for value in samples))
print(f'{target.name}: {duration:.2f}s stereo, peak -3.7 dBFS')
