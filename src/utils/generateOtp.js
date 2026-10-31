import crypto from 'crypto'

export function generateOtp(digits = 6) {
    if (!Number.isInteger(digits) || digits < 1 || digits > 12) {
      throw new RangeError('digits must be an integer between 1 and 12')
    }
    let otp = ''
    for (let i = 0; i < digits; i++) otp += crypto.randomInt(0, 10)
    return otp
  }
  