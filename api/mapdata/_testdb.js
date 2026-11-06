// ฐานข้อมูล Mongo จำลองในหน่วยความจำสำหรับเทสต์ รองรับเฉพาะคำสั่งและตัวกรองที่ _mapdata_db.js ใช้
const matches = (doc, filter) => Object.entries(filter).every(([key, condition]) => {
  const value = doc[key]
  if (condition && typeof condition === 'object' && !(condition instanceof Date) && !Array.isArray(condition)) {
    return Object.entries(condition).every(([operator, argument]) => {
      if (operator === '$in') return argument.includes(value)
      if (operator === '$ne') return value !== argument
      if (operator === '$regex') return new RegExp(argument, condition.$options).test(String(value ?? ''))
      if (operator === '$options') return true
      throw new Error(`ตัวกรองที่เทสต์จำลองยังไม่รองรับ: ${operator}`)
    })
  }
  return value === condition
})

const equalityFields = (filter) => Object.fromEntries(Object.entries(filter).filter(([, condition]) => !(condition && typeof condition === 'object')))

let nextId = 1

const rank = (value) => (value instanceof Date ? value.getTime() : value)

class Cursor {
  constructor(rows) { this.rows = rows }
  sort(spec) {
    const keys = Object.entries(spec)
    this.rows = [...this.rows].sort((a, b) => {
      for (const [key, direction] of keys) {
        if (rank(a[key]) === rank(b[key])) continue
        return (rank(a[key]) > rank(b[key]) ? 1 : -1) * direction
      }
      return 0
    })
    return this
  }
  limit(count) { this.rows = this.rows.slice(0, count); return this }
  async toArray() { return structuredClone(this.rows) }
}

export class FakeCollection {
  constructor() { this.docs = [] }
  find(filter = {}) { return new Cursor(this.docs.filter((doc) => matches(doc, filter))) }
  async findOne(filter = {}) { const doc = this.docs.find((item) => matches(item, filter)); return doc ? structuredClone(doc) : null }
  async insertOne(doc) { this.docs.push(structuredClone({ _id: nextId++, ...doc })); return { insertedId: doc._id } }
  async countDocuments(filter = {}) { return this.docs.filter((doc) => matches(doc, filter)).length }
  async updateOne(filter, update, options = {}) {
    const doc = this.docs.find((item) => matches(item, filter))
    if (doc) {
      Object.assign(doc, structuredClone(update.$set ?? {}))
      return { matchedCount: 1, modifiedCount: 1 }
    }
    if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 }
    this.docs.push(structuredClone({ _id: nextId++, ...equalityFields(filter), ...update.$setOnInsert, ...update.$set }))
    return { matchedCount: 0, upsertedCount: 1 }
  }
  async updateMany(filter, update) {
    const rows = this.docs.filter((doc) => matches(doc, filter))
    for (const doc of rows) Object.assign(doc, structuredClone(update.$set ?? {}))
    return { matchedCount: rows.length, modifiedCount: rows.length }
  }
  async deleteOne(filter) {
    const index = this.docs.findIndex((doc) => matches(doc, filter))
    if (index >= 0) this.docs.splice(index, 1)
    return { deletedCount: index >= 0 ? 1 : 0 }
  }
  async deleteMany(filter) {
    const before = this.docs.length
    this.docs = this.docs.filter((doc) => !matches(doc, filter))
    return { deletedCount: before - this.docs.length }
  }
  async bulkWrite(operations) {
    for (const { updateOne } of operations) await this.updateOne(updateOne.filter, updateOne.update, { upsert: updateOne.upsert })
    return { ok: 1 }
  }
  async createIndexes() { return [] }
  async createIndex() { return 'ok' }
}

export class FakeDb {
  constructor() { this.collections = new Map() }
  collection(name) {
    if (!this.collections.has(name)) this.collections.set(name, new FakeCollection())
    return this.collections.get(name)
  }
  reset() { this.collections.clear() }
}
