const ceiling = 10 ** (-1 / 20)

function boostHeadroom(dry, boost) {
  if (boost > 0) return (ceiling - dry) / boost
  if (boost < 0) return (-ceiling - dry) / boost
  return 1
}

class WaveePeakLimiter extends AudioWorkletProcessor {
  constructor() {
    super()
    this.delay = Math.max(1, Math.round(sampleRate * 0.005))
    this.release = 1 - Math.exp(-1 / (sampleRate * 0.12))
    this.buffers = [new Float32Array(this.delay), new Float32Array(this.delay)]
    this.boostBuffers = [new Float32Array(this.delay), new Float32Array(this.delay)]
    this.boostRelease = 1 - Math.exp(-1 / (sampleRate * 0.001))
    this.boostGain = 1
    this.cursor = 0
    this.gain = 1
    this.hold = 0
  }

  process([input, boost], [output]) {
    if (!output?.length) return true
    for (let index = 0; index < output[0].length; index += 1) {
      const left = input?.[0]?.[index] ?? 0
      const right = input?.[1]?.[index] ?? left
      const peak = Math.max(Math.abs(left), Math.abs(right))
      const target = peak > ceiling ? ceiling / peak : 1
      if (target < this.gain) {
        this.gain = target
        this.hold = this.delay
      }
      const delayedLeft = this.buffers[0][this.cursor]
      const delayedRight = this.buffers[1][this.cursor]
      const delayedPeak = Math.max(Math.abs(delayedLeft), Math.abs(delayedRight))
      const outputGain = delayedPeak > ceiling ? Math.min(this.gain, ceiling / delayedPeak) : this.gain
      const dryLeft = delayedLeft * outputGain
      const dryRight = delayedRight * outputGain
      const boostLeft = this.boostBuffers[0][this.cursor]
      const boostRight = this.boostBuffers[1][this.cursor]
      // Reserve the dry mix and trim only the bass addition when the sum would clip.
      const boostLimit = Math.max(0, Math.min(boostHeadroom(dryLeft, boostLeft), boostHeadroom(dryRight, boostRight)))
      this.boostGain = Math.min(boostLimit, this.boostGain + (1 - this.boostGain) * this.boostRelease)
      output[0][index] = dryLeft + boostLeft * this.boostGain
      if (output[1]) output[1][index] = dryRight + boostRight * this.boostGain
      this.buffers[0][this.cursor] = left
      this.buffers[1][this.cursor] = right
      const wet = boost?.[0]?.[index] ?? 0
      this.boostBuffers[0][this.cursor] = wet
      this.boostBuffers[1][this.cursor] = boost?.[1]?.[index] ?? wet
      this.cursor = (this.cursor + 1) % this.delay
      if (this.hold > 0) {
        this.hold -= 1
      } else {
        this.gain += (target - this.gain) * this.release
      }
    }
    return true
  }
}

registerProcessor('wavee-peak-limiter', WaveePeakLimiter)
