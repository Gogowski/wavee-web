const ceiling = 10 ** (-1 / 20)

class WaveePeakLimiter extends AudioWorkletProcessor {
  constructor() {
    super()
    this.delay = Math.max(1, Math.round(sampleRate * 0.005))
    this.release = 1 - Math.exp(-1 / (sampleRate * 0.12))
    this.buffers = [new Float32Array(this.delay), new Float32Array(this.delay)]
    this.cursor = 0
    this.gain = 1
    this.hold = 0
  }

  process([input], [output]) {
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
      output[0][index] = delayedLeft * outputGain
      if (output[1]) output[1][index] = delayedRight * outputGain
      this.buffers[0][this.cursor] = left
      this.buffers[1][this.cursor] = right
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
