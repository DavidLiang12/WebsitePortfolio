"""Render the portfolio's synthesized effects without opening an audio device.

Run with: python3 scripts/generate-sound-clips.py
The browser plays these small WAVs through HTML audio instead of AudioContext.
"""

import math
from pathlib import Path
import random
import struct
import wave


RATE = 44100
OUTPUT = Path(__file__).resolve().parents[1] / "Sound" / "generated"


def write(name, samples):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT / f"{name}.wav"), "wb") as clip:
        clip.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        clip.writeframes(b"".join(struct.pack("<h", round(max(-1, min(1, sample)) * 32767)) for sample in samples))


def note(midi):
    hz = 440 * 2 ** ((midi - 69) / 12)
    for i in range(math.ceil(RATE * .29)):
        t = i / RATE
        if t < .018:
            envelope = t / .018
        elif t < .27:
            envelope = .02 ** ((t - .018) / .252)
        else:
            envelope = .02 * (.29 - t) / .02
        yield math.sin(2 * math.pi * hz * t) * envelope


def transition(kind):
    duration = .48 if kind == "tape" else .52
    noise = random.Random(kind)
    warm_noise = phase = 0
    for i in range(math.ceil(RATE * duration)):
        t = i / RATE
        p = t / duration
        warm_noise = warm_noise * .97 + (noise.random() * 2 - 1) * .03
        phase += 2 * math.pi * (210 - 85 * p if kind == "cd" else 145) / RATE
        pulse = sum(math.exp(-((t - offset - .11) / .048) ** 2) for offset in (0, .045, .09)) / 2 if kind == "tape" else 1
        yield math.sin(math.pi * p) ** 1.8 * (math.sin(phase) * .14 * pulse + warm_noise * .65)


def iris(notes):
    for i in range(math.ceil(RATE * .52)):
        t = i / RATE
        sample = 0
        for index, midi in enumerate(notes):
            start = index * .10
            peak = .022 if index else .045
            if t < start:
                continue
            if t < start + .065:
                envelope = peak * (t - start) / .065
            elif t < .31:
                envelope = peak * (.012 / peak) ** ((t - start - .065) / (.31 - start - .065))
            elif t < .50:
                envelope = .012 * (.0001 / .012) ** ((t - .31) / .19)
            else:
                envelope = .0001 * (.52 - t) / .02
            hz = 440 * 2 ** ((midi - 69) / 12)
            sample += math.sin(2 * math.pi * hz * (t - start)) * envelope
        yield sample


if __name__ == "__main__":
    for midi in (60, 62, 64, 67, 69, 72):
        write(f"note-{midi}", note(midi))
    for kind in ("tape", "cd"):
        write(f"transition-{kind}", transition(kind))
    for page, phases in {"games": {"out": (60, 64), "in": (67, 72)}, "projects": {"out": (57, 60), "in": (62, 69)}}.items():
        for phase, notes in phases.items():
            write(f"iris-{page}-{phase}", iris(notes))
