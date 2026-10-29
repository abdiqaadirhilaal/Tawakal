const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });

counterSchema.statics.next = async function next(key) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const doc = await this.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { new: true, upsert: true });
      return doc.seq;
    } catch (err) {
      // Laba codsi oo isku mar abuuraya isla tiriyaha: isku day mar kale.
      if (err.code !== 11000 || attempt >= 5) throw err;
    }
  }
};

module.exports = mongoose.model('Counter', counterSchema);
