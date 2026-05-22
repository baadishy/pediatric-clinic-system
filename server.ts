import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { MongoClient, ObjectId as MongoObjectId } from "mongodb";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "pediatric_secret_777";

const MONGODB_URI = process.env.MONGODB_URI;
const useMongo = !!MONGODB_URI;

class ObjectId {
  private value: any;

  constructor(id?: any) {
    if (useMongo) {
      if (!id) {
        this.value = new MongoObjectId();
      } else if (id instanceof ObjectId) {
        this.value = id.value;
      } else if (id instanceof MongoObjectId) {
        this.value = id;
      } else if (typeof id === 'string' && MongoObjectId.isValid(id)) {
        try {
          this.value = new MongoObjectId(id);
        } catch (e) {
          this.value = id;
        }
      } else {
        this.value = id;
      }
    } else {
      if (!id) {
        this.value = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      } else if (id instanceof ObjectId) {
        this.value = id.value;
      } else {
        this.value = id.toString();
      }
    }
  }

  toString() {
    return this.value ? this.value.toString() : '';
  }

  equals(other: any) {
    if (!other) return false;
    return this.toString() === other.toString();
  }

  toBSON() {
    return this.value;
  }
}

const dbName = "clinic.sqlite";
const dbDir = process.env.APPDATA || 
              (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Application Support') : process.env.HOME) || 
              process.cwd();
// Create writable path safely
const dbPath = path.join(dbDir, dbName);
const sqliteDb = new Database(dbPath);

function matchesQuery(doc: any, query: any): boolean {
  if (!query || Object.keys(query).length === 0) return true;
  
  for (const [key, val] of Object.entries(query)) {
    if (key === '$or') {
      if (!Array.isArray(val)) return false;
      const anyMatch = val.some(q => matchesQuery(doc, q));
      if (!anyMatch) return false;
      continue;
    }
    
    let docVal;
    if (key === '_id') {
      docVal = doc._id || doc.id;
    } else {
      docVal = doc[key];
    }
    
    if (val && typeof val === 'object' && '$regex' in val) {
      const regexStr = (val as any).$regex;
      const options = (val as any).$options || '';
      try {
        const regex = new RegExp(regexStr, options);
        if (!regex.test(String(docVal || ''))) return false;
      } catch (err) {
        return false;
      }
      continue;
    }
    
    const docStr = docVal != null ? docVal.toString() : '';
    const queryStr = val != null ? val.toString() : '';
    
    if (docStr !== queryStr) {
      return false;
    }
  }
  return true;
}

function applyUpdate(doc: any, update: any) {
  if (!update) return doc;
  const newDoc = { ...doc };
  
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      newDoc[k] = v;
    }
  }
  
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      newDoc[k] = (newDoc[k] || 0) + Number(v);
    }
  }
  
  newDoc.updatedAt = new Date().toISOString();
  return newDoc;
}

function normalizeData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof ObjectId) return obj.toString();
  if (Array.isArray(obj)) return obj.map(normalizeData);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = normalizeData(v);
    }
    return res;
  }
  return obj;
}

class VirtualCollection {
  constructor(private name: string) {
    sqliteDb.prepare(`
      CREATE TABLE IF NOT EXISTS [${this.name}] (
        _id TEXT PRIMARY KEY,
        data TEXT
      )
    `).run();
  }

  getAll(): any[] {
    const rows = sqliteDb.prepare(`SELECT * FROM [${this.name}]`).all() as any[];
    return rows.map(r => JSON.parse(r.data));
  }

  private save(doc: any) {
    const norm = normalizeData(doc);
    sqliteDb.prepare(`
      INSERT INTO [${this.name}] (_id, data) VALUES (?, ?)
      ON CONFLICT(_id) DO UPDATE SET data = excluded.data
    `).run(norm._id.toString(), JSON.stringify(norm));
  }

  private deleteOneId(id: string) {
    sqliteDb.prepare(`DELETE FROM [${this.name}] WHERE _id = ?`).run(id);
  }

  async countDocuments(query: any = {}): Promise<number> {
    const docs = this.getAll();
    return docs.filter(d => matchesQuery(d, query)).length;
  }

  async findOne(query: any = {}): Promise<any | null> {
    const docs = this.getAll();
    const result = docs.find(d => matchesQuery(d, query));
    return result || null;
  }

  async insertOne(doc: any): Promise<{ insertedId: ObjectId }> {
    const newDoc = { ...doc };
    if (!newDoc._id) {
      newDoc._id = new ObjectId();
    } else {
      newDoc._id = new ObjectId(newDoc._id);
    }
    this.save(newDoc);
    return { insertedId: newDoc._id };
  }

  async insertMany(docs: any[]): Promise<any> {
    for (const doc of docs) {
      const newDoc = { ...doc };
      if (!newDoc._id) {
        newDoc._id = new ObjectId();
      } else {
        newDoc._id = new ObjectId(newDoc._id);
      }
      this.save(newDoc);
    }
    return { success: true };
  }

  async updateOne(query: any, update: any, options: any = {}): Promise<any> {
    const docs = this.getAll();
    let found = false;
    for (const doc of docs) {
      if (matchesQuery(doc, query)) {
        found = true;
        const updated = applyUpdate(doc, update);
        this.save(updated);
        break;
      }
    }
    if (!found && options.upsert) {
      const _id = query._id ? query._id : new ObjectId();
      const newDoc = applyUpdate({ _id, ...query }, update);
      this.save(newDoc);
    }
    return { modifiedCount: found ? 1 : 0 };
  }

  async findOneAndUpdate(query: any, update: any, options: any = {}): Promise<any> {
    const docs = this.getAll();
    let matchedDoc = null;
    for (const doc of docs) {
      if (matchesQuery(doc, query)) {
        matchedDoc = doc;
        break;
      }
    }
    let updated = null;
    if (matchedDoc) {
      updated = applyUpdate(matchedDoc, update);
      this.save(updated);
    } else if (options.upsert) {
      const _id = query._id ? query._id : new ObjectId();
      const newDoc = applyUpdate({ _id, ...query }, update);
      this.save(newDoc);
      updated = newDoc;
    }
    return Object.assign({ value: updated }, updated);
  }

  async deleteOne(query: any): Promise<{ deletedCount: number }> {
    const docs = this.getAll();
    const idx = docs.findIndex(d => matchesQuery(d, query));
    if (idx !== -1) {
      this.deleteOneId(docs[idx]._id.toString());
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(query: any = {}): Promise<{ deletedCount: number }> {
    const docs = this.getAll();
    let deletedCount = 0;
    for (const doc of docs) {
      if (matchesQuery(doc, query)) {
        this.deleteOneId(doc._id.toString());
        deletedCount++;
      }
    }
    return { deletedCount };
  }

  find(query: any = {}) {
    let currentDocs = this.getAll().filter(d => matchesQuery(d, query));

    const cursor = {
      sort(sortObj: any) {
        currentDocs.sort((a, b) => {
          for (const [field, order] of Object.entries(sortObj)) {
            const valA = a[field];
            const valB = b[field];
            if (valA === undefined || valB === undefined) continue;
            if (valA < valB) return order === -1 ? 1 : -1;
            if (valA > valB) return order === -1 ? -1 : 1;
          }
          return 0;
        });
        return cursor;
      },
      limit(limitNum: number) {
        currentDocs = currentDocs.slice(0, limitNum);
        return cursor;
      },
      async toArray() {
        return currentDocs;
      }
    };
    return cursor;
  }

  aggregate(pipeline: any[]): any {
    let result = this.getAll();

    for (const stage of pipeline) {
      if (stage.$sort) {
        result.sort((a, b) => {
          for (const [field, order] of Object.entries(stage.$sort)) {
            const valA = a[field];
            const valB = b[field];
            if (valA === undefined || valB === undefined) continue;
            if (valA < valB) return order === -1 ? 1 : -1;
            if (valA > valB) return order === -1 ? -1 : 1;
          }
          return 0;
        });
      } else if (stage.$lookup) {
        const { from, localField, foreignField, as } = stage.$lookup;
        const foreignColl = new VirtualCollection(from);
        const foreignDocs = foreignColl.getAll();

        result = result.map(doc => {
          const localVal = doc[localField] ? doc[localField].toString() : '';
          const matchDocs = foreignDocs.filter(fDoc => {
            const foreignVal = fDoc[foreignField] ? fDoc[foreignField].toString() : '';
            return localVal === foreignVal;
          });
          return {
            ...doc,
            [as]: matchDocs
          };
        });
      } else if (stage.$unwind) {
        const path = stage.$unwind;
        const cleanPath = path.startsWith('$') ? path.substring(1) : path;
        const expandedResult: any[] = [];
        for (const doc of result) {
          const arr = doc[cleanPath];
          if (Array.isArray(arr) && arr.length > 0) {
            for (const item of arr) {
              expandedResult.push({
                ...doc,
                [cleanPath]: item
              });
            }
          } else {
            expandedResult.push(doc);
          }
        }
        result = expandedResult;
      }
    }

    return {
      async toArray() {
        return result;
      }
    };
  }
}

class AtlasMongoCollection {
  private nativeColl: any;

  constructor(collectionName: string, mongoDbInstance: any) {
    this.nativeColl = mongoDbInstance.collection(collectionName);
  }

  private unwrap(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof ObjectId) {
      return obj.toBSON();
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.unwrap(item));
    }
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(obj)) {
        result[key] = this.unwrap(val);
      }
      return result;
    }
    return obj;
  }

  private wrap(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => this.wrap(item));
    }
    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, val] of Object.entries(obj)) {
        if (val instanceof MongoObjectId) {
          result[key] = val.toString();
        } else {
          result[key] = this.wrap(val);
        }
      }
      return result;
    }
    return obj;
  }

  async countDocuments(query: any = {}): Promise<number> {
    const rawQuery = this.unwrap(query);
    return await this.nativeColl.countDocuments(rawQuery);
  }

  async findOne(query: any = {}): Promise<any | null> {
    const rawQuery = this.unwrap(query);
    const doc = await this.nativeColl.findOne(rawQuery);
    return this.wrap(doc);
  }

  async insertOne(doc: any): Promise<{ insertedId: ObjectId }> {
    const rawDoc = this.unwrap(doc);
    const result = await this.nativeColl.insertOne(rawDoc);
    return {
      insertedId: new ObjectId(result.insertedId)
    };
  }

  async insertMany(docs: any[]): Promise<any> {
    const rawDocs = this.unwrap(docs);
    return await this.nativeColl.insertMany(rawDocs);
  }

  async updateOne(query: any, update: any, options: any = {}): Promise<any> {
    const rawQuery = this.unwrap(query);
    const rawUpdate = this.unwrap(update);
    return await this.nativeColl.updateOne(rawQuery, rawUpdate, options);
  }

  async findOneAndUpdate(query: any, update: any, options: any = {}): Promise<any> {
    const rawQuery = this.unwrap(query);
    const rawUpdate = this.unwrap(update);
    const res = await this.nativeColl.findOneAndUpdate(rawQuery, rawUpdate, {
      ...options,
      returnDocument: 'after'
    });
    
    const wrapped = this.wrap(res);
    if (!wrapped) return null;
    return Object.assign({ value: wrapped }, wrapped);
  }

  async deleteOne(query: any): Promise<{ deletedCount: number }> {
    const rawQuery = this.unwrap(query);
    return await this.nativeColl.deleteOne(rawQuery);
  }

  async deleteMany(query: any = {}): Promise<{ deletedCount: number }> {
    const rawQuery = this.unwrap(query);
    return await this.nativeColl.deleteMany(rawQuery);
  }

  find(query: any = {}) {
    const rawQuery = this.unwrap(query);
    let cursor = this.nativeColl.find(rawQuery);

    const adapterCursor = {
      sort(sortObj: any) {
        cursor = cursor.sort(sortObj);
        return adapterCursor;
      },
      limit(limitNum: number) {
        cursor = cursor.limit(limitNum);
        return adapterCursor;
      },
      toArray: async () => {
        const docs = await cursor.toArray();
        return this.wrap(docs);
      }
    };
    return adapterCursor;
  }

  aggregate(pipeline: any[]): any {
    const rawPipeline = this.unwrap(pipeline);
    let cursor = this.nativeColl.aggregate(rawPipeline);

    const adapterCursor = {
      toArray: async () => {
        const docs = await cursor.toArray();
        return this.wrap(docs);
      }
    };
    return adapterCursor;
  }
}

let mongoClient: MongoClient | null = null;
let mongoDb: any = null;

if (useMongo) {
  try {
    console.log("MongoDB MONGODB_URI is provided. Initializing connection...");
    mongoClient = new MongoClient(MONGODB_URI!);
  } catch (err) {
    console.error("Failed to construct MongoClient. Falling back to local SQLite.", err);
  }
}

const db = {
  collection(name: string) {
    if (mongoDb) {
      return new AtlasMongoCollection(name, mongoDb);
    } else {
      return new VirtualCollection(name);
    }
  }
};

import { ALL_MEDICATIONS } from "./drug_data";

async function initDB() {
  try {
    if (useMongo && mongoClient) {
      console.log("Connecting to MongoDB Atlas...");
      await mongoClient.connect();
      mongoDb = mongoClient.db();
      console.log("Successfully connected to MongoDB Atlas!");
    } else {
      console.log("Connected to SQLite Database (Virtual MongoDB)");
    }

    // Collection names
    const patientsColl = db.collection("patients");
    const medsColl = db.collection("medication_rules");
    const prescriptionsColl = db.collection("prescriptions");
    const settingsColl = db.collection("clinic_settings");
    const clinicsColl = db.collection("clinics");
    const servicesColl = db.collection("services");
    const growthColl = db.collection("growth_data");
    const usersColl = db.collection("users");
    const appointmentsColl = db.collection("appointments");

    // Seed users
    const userCount = await usersColl.countDocuments();
    if (userCount === 0) {
      const doctorPass = await bcrypt.hash(process.env.DOCTOR_PASSWORD || "doctor123", 10);
      const assistantPass = await bcrypt.hash(process.env.ASSISTANT_PASSWORD || "assistant123", 10);
      
      await usersColl.insertMany([
        { username: "doctor", password: doctorPass, role: "doctor", name: "Dr. Mina" },
        { username: "assistant", password: assistantPass, role: "assistant", name: "Clinic Assistant" }
      ]);
      console.log("Seeded default credentials inside the database");
    }

    // Seed exhaustive medication rules
    const medCount = await medsColl.countDocuments();
    if (medCount < 200) { 
      await medsColl.deleteMany({});
      await medsColl.insertMany(ALL_MEDICATIONS);
      console.log(`Seeded ${ALL_MEDICATIONS.length} medications rules`);
    }

    // Initialize clinic settings with patient counter if needed
    const settings = await settingsColl.findOne({ id: 1 });
    if (!settings) {
      await settingsColl.insertOne({
        id: 1,
        name: "Dr. Mina Pediatric Clinic",
        address: "6th of October City",
        phone: "0123456789",
        next_patient_number: 1000
      });
      console.log("Initialized clinic settings");
    } else if (settings.next_patient_number === undefined) {
      await settingsColl.updateOne({ id: 1 }, { $set: { next_patient_number: 1000 } });
      console.log("Added next_patient_number to existing settings");
    }

  } catch (error) {
    console.error("Database initialization failed:", error);
    if (useMongo) {
      console.log("Attempting automatic fallback to SQLite due to Atlas connection error...");
      mongoDb = null; // unset mongoDb to force SQLite collections
      await initDB(); // re-initialize SQLite DB safely
    }
  }
}

initDB();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error("JWT Verify Error:", err.message);
      return res.status(401).json({ error: "Session expired or invalid token" });
    }
    req.user = user;
    next();
  });
};

const authorize = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      console.warn(`Access Denied: User ${req.user.username} (role: ${req.user.role}) attempted to access ${req.originalUrl} - required roles: ${roles.join(', ')}`);
      return res.status(403).json({ error: `Access forbidden: Role '${req.user.role}' is not authorized for this action.` });
    }
    next();
  };
};

// Auth APIs
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await db.collection("users").findOne({ username });

  if (!user) return res.status(401).json({ error: "Invalid username or password" });

  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) return res.status(401).json({ error: "Invalid username or password" });

  const token = jwt.sign(
    { id: user._id.toString(), username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ 
    token, 
    user: { id: user._id, username: user.username, role: user.role, name: user.name } 
  });
});

// Waiting List APIs
app.get("/api/waiting", authenticateToken, async (req, res) => {
  const waiting = await db.collection("waiting_list")
    .aggregate([
      { $sort: { createdAt: 1 } },
      {
        $lookup: {
          from: "patients",
          localField: "patient_id",
          foreignField: "_id",
          as: "patient_info"
        }
      },
      { $unwind: "$patient_info" }
    ]).toArray();

  res.json(waiting.map((w: any) => ({
    id: w._id.toString(),
    patient_id: w.patient_id.toString(),
    appointment_id: w.appointment_id ? w.appointment_id.toString() : undefined,
    patient_name: w.patient_info.name,
    patient_number: w.patient_info.patient_number,
    birth_date: w.patient_info.birth_date,
    revisit_method: w.revisit_method,
    createdAt: w.createdAt
  })));
});

app.post("/api/waiting", authenticateToken, async (req, res) => {
  const { patient_id, revisit_method } = req.body;
  
  // Check if already in waiting list
  const existing = await db.collection("waiting_list").findOne({ 
    patient_id: new ObjectId(patient_id),
    status: 'waiting'
  });
  
  if (existing) return res.status(400).json({ error: "Patient already in waiting list" });

  const result = await db.collection("waiting_list").insertOne({
    patient_id: new ObjectId(patient_id),
    revisit_method,
    status: 'waiting',
    createdAt: new Date()
  });

  res.json({ id: result.insertedId.toString() });
});

app.delete("/api/waiting/:id", authenticateToken, async (req, res) => {
  await db.collection("waiting_list").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// Appointment APIs
app.get("/api/appointments", authenticateToken, async (req, res) => {
  const appointments = await db.collection("appointments").find().sort({ appointmentDay: 1, appointmentTime: 1 }).toArray();
  
  // Manual join to include clinic and service names
  const clinics = await db.collection("clinics").find().toArray();
  const services = await db.collection("services").find().toArray();
  
  const clinicMap = Object.fromEntries(clinics.map((c: any) => [c._id.toString(), c.name]));
  const serviceMap = Object.fromEntries(services.map((s: any) => [s._id.toString(), s.name]));
  
  const joinedAppointments = appointments.map((a: any) => ({
    ...a,
    id: a._id.toString(),
    clinicId: a.clinicId?.toString() || a.clinicId,
    serviceId: a.serviceId?.toString() || a.serviceId,
    clinicName: clinicMap[a.clinicId?.toString()] || 'Unknown Clinic',
    serviceName: serviceMap[a.serviceId?.toString()] || 'Unknown Service'
  }));
  
  res.json(joinedAppointments);
});

app.post("/api/appointments", authenticateToken, async (req, res) => {
  const result = await db.collection("appointments").insertOne({
    ...req.body,
    status: req.body.status || 'pending',
    createdAt: new Date()
  });
  res.json({ id: result.insertedId.toString() });
});

app.put("/api/appointments/:id", authenticateToken, async (req, res) => {
  const { id, _id, ...updateData } = req.body;
  const objectId = new ObjectId(req.params.id);

  if (updateData.status === 'cancelled') {
    await db.collection("appointments").deleteOne({ _id: objectId });
    return res.json({ success: true, deleted: true });
  }

  // Get current appointment to see if it is changing status to confirmed
  const appt = await db.collection("appointments").findOne({ _id: objectId });
  if (appt && updateData.status === 'confirmed' && appt.status !== 'confirmed') {
    // Perform check-in logic to register the patient and move them to the active waiting queue
    let patientId;
    const existingPatient = await db.collection("patients").findOne({ 
      $or: [
        { name: appt.patientName },
        { phone: appt.phone }
      ]
    });

    if (existingPatient) {
      patientId = existingPatient._id;
    } else {
      const settingsUpdate = await db.collection("clinic_settings").findOneAndUpdate(
        { id: 1 },
        { $inc: { next_patient_number: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      const settings = settingsUpdate.value || settingsUpdate;
      const patientNumber = (settings?.next_patient_number || 1000).toString();

      const result = await db.collection("patients").insertOne({
        name: appt.patientName,
        birth_date: appt.birthDate,
        patient_phone: appt.phone,
        patient_number: patientNumber,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      patientId = result.insertedId;
    }

    const service = await db.collection("services").findOne({ _id: new ObjectId(appt.serviceId) });
    const revisit_method = service ? service.name : "Appointment";

    // Insert to waiting list if not already there
    const waitingExists = await db.collection("waiting_list").findOne({ appointment_id: objectId, status: 'waiting' });
    if (!waitingExists) {
      await db.collection("waiting_list").insertOne({
        patient_id: patientId,
        revisit_method,
        appointment_id: objectId,
        status: 'waiting',
        createdAt: new Date()
      });
    }

    // Since they are confirmed and registered, delete the appointment from schedules database
    await db.collection("appointments").deleteOne({ _id: objectId });
    return res.json({ success: true, deleted: true });
  }

  await db.collection("appointments").updateOne(
    { _id: objectId },
    { $set: updateData }
  );
  res.json({ success: true });
});

// New Check-in API: Appointment -> Waiting List
app.post("/api/appointments/:id/check-in", authenticateToken, async (req, res) => {
  const apptId = req.params.id;
  const appt = await db.collection("appointments").findOne({ _id: new ObjectId(apptId) });
  
  if (!appt) return res.status(404).json({ error: "Appointment not found" });

  // 1. Create or Find Patient
  let patientId;
  const existingPatient = await db.collection("patients").findOne({ 
    $or: [
      { name: appt.patientName },
      { phone: appt.phone }
    ]
  });

  if (existingPatient) {
    patientId = existingPatient._id;
  } else {
    // Increment patient number
    const settingsUpdate = await db.collection("clinic_settings").findOneAndUpdate(
      { id: 1 },
      { $inc: { next_patient_number: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const settings = settingsUpdate.value || settingsUpdate;
    const patientNumber = (settings?.next_patient_number || 1000).toString();

    const result = await db.collection("patients").insertOne({
      name: appt.patientName,
      birth_date: appt.birthDate,
      patient_phone: appt.phone,
      patient_number: patientNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    patientId = result.insertedId;
  }

  // 2. Add to Waiting List
  const service = await db.collection("services").findOne({ _id: new ObjectId(appt.serviceId) });
  const revisit_method = service ? service.name : "Appointment";

  await db.collection("waiting_list").insertOne({
    patient_id: patientId,
    revisit_method,
    appointment_id: new ObjectId(apptId), // Track source
    status: 'waiting',
    createdAt: new Date()
  });

  // 3. Delete from Appointment database - they have now successfully checked in
  await db.collection("appointments").deleteOne({ _id: new ObjectId(apptId) });

  res.json({ success: true, patientId: patientId.toString() });
});

app.delete("/api/appointments/:id", authenticateToken, async (req, res) => {
  await db.collection("appointments").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// Patient APIs
app.get("/api/patients", authenticateToken, authorize(['doctor']), async (req, res) => {
  const patients = await db.collection("patients").find().sort({ createdAt: -1 }).toArray();
  res.json(patients.map((p: any) => ({ ...p, id: p._id.toString() })));
});

app.get("/api/patients/search", authenticateToken, authorize(['doctor', 'assistant']), async (req, res) => {
  const { query } = req.query;
  const patients = await db.collection("patients")
    .find({ 
      $or: [
        { name: { $regex: query as string, $options: 'i' } },
        { patient_number: query as string }
      ]
    })
    .limit(10)
    .toArray();
  res.json(patients.map((p: any) => ({ ...p, id: p._id.toString() })));
});

app.get("/api/patients/:id", authenticateToken, authorize(['doctor', 'assistant']), async (req, res) => {
  try {
    const patient = await db.collection("patients").findOne({ _id: new ObjectId(req.params.id) });
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json({ ...patient, id: patient._id.toString() });
  } catch (e) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

app.post("/api/patients", authenticateToken, authorize(['doctor', 'assistant']), async (req, res) => {
  const { name, age_months, age_days, birth_date, weight, height, head_circumference, complaint, gender } = req.body;
  
  // Get and increment patient number
  const settingsUpdate = await db.collection("clinic_settings").findOneAndUpdate(
    { id: 1 },
    { $inc: { next_patient_number: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  
  // In newer mongodb driver versions, it returns the document directly if result metadata is not requested
  const settings = settingsUpdate.value || settingsUpdate;
  let nextNum = settings?.next_patient_number;
  if (!nextNum) nextNum = 1000; // Start at 1000 if not set

  const patientNumber = nextNum.toString();

  const result = await db.collection("patients").insertOne({
    name, 
    age_months, 
    age_days: age_days || 0,
    birth_date, 
    weight, 
    height, 
    head_circumference, 
    complaint, 
    gender,
    patient_number: patientNumber,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  res.json({ id: result.insertedId.toString(), patient_number: patientNumber });
});

app.put("/api/patients/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  const { age_months, age_days, birth_date, weight, height, head_circumference, complaint } = req.body;
  await db.collection("patients").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { 
        age_months, 
        age_days: age_days || 0, 
        birth_date, 
        weight, 
        height, 
        head_circumference, 
        complaint, 
        updatedAt: new Date() 
      } 
    }
  );
  res.json({ success: true });
});

app.delete("/api/patients/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  try {
    const id = new ObjectId(req.params.id);
    await db.collection("patients").deleteOne({ _id: id });
    await db.collection("prescriptions").deleteMany({ patient_id: id });
    await db.collection("growth_data").deleteMany({ patient_id: id });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// Medication Rules APIs
app.get("/api/medication-rules", authenticateToken, authorize(['doctor', 'assistant']), async (req, res) => {
  const rules = await db.collection("medication_rules").find().sort({ category: 1, name: 1 }).toArray();
  res.json(rules.map((r: any) => ({ ...r, id: r._id.toString() })));
});

app.post("/api/medication-rules", authenticateToken, authorize(['doctor']), async (req, res) => {
  const result = await db.collection("medication_rules").insertOne(req.body);
  res.json({ id: result.insertedId.toString() });
});

app.put("/api/medication-rules/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  const { id, _id, ...data } = req.body;
  await db.collection("medication_rules").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: data }
  );
  res.json({ success: true });
});

app.delete("/api/medication-rules/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  await db.collection("medication_rules").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

app.get("/api/clinic/public", async (req, res) => {
  const settings = await db.collection("clinic_settings").findOne({ id: 1 });
  res.json({ name: settings?.name || "عيادة الأطفال" });
});

// Prescription APIs
app.get("/api/prescriptions", authenticateToken, authorize(['doctor']), async (req, res) => {
  const prescriptions = await db.collection("prescriptions")
    .aggregate([
      { $sort: { createdAt: -1 } },
      { 
        $lookup: { 
          from: "patients", 
          localField: "patient_id", 
          foreignField: "_id", 
          as: "patient_info" 
        } 
      },
      { $unwind: "$patient_info" }
    ]).toArray();
    
  res.json(prescriptions.map((p: any) => ({
    ...p,
    id: p._id.toString(),
    patient_id: p.patient_id.toString(),
    patient_name: p.patient_info.name,
    patient_number: p.patient_info.patient_number,
    age_months: p.patient_info.age_months,
    age_days: p.patient_info.age_days,
    weight: p.patient_info.weight,
    height: p.patient_info.height,
    head_circumference: p.patient_info.head_circumference,
    gender: p.patient_info.gender,
    birth_date: p.patient_info.birth_date,
    complaint: p.complaint || p.patient_info.complaint,
  })));
});

app.post("/api/prescriptions", authenticateToken, authorize(['doctor']), async (req, res) => {
  const { patient_id, diagnosis, complaint, items, service_name, revisit_date, revisit_method, temperature, appointment_id } = req.body;
  const result = await db.collection("prescriptions").insertOne({
    patient_id: new ObjectId(patient_id),
    diagnosis,
    complaint,
    items,
    service_name,
    revisit_date,
    revisit_method,
    temperature,
    createdAt: new Date()
  });

  // If this prescription completed an appointment, remove it
  if (appointment_id) {
    await db.collection("appointments").deleteOne({ _id: new ObjectId(appointment_id) });
  } else {
    // Try to find if this patient is currently in the waiting list and has an associated appointment
    const waitingItem = await db.collection("waiting_list").findOne({ 
      patient_id: new ObjectId(patient_id),
      status: 'waiting'
    });
    if (waitingItem && waitingItem.appointment_id) {
       await db.collection("appointments").deleteOne({ _id: new ObjectId(waitingItem.appointment_id) });
    }
  }

  res.json({ id: result.insertedId.toString() });
});

app.get("/api/prescriptions/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  const prescription = await db.collection("prescriptions").findOne({ _id: new ObjectId(req.params.id) });
  if (!prescription) return res.status(404).json({ error: "Prescription not found" });
  
  const patient = await db.collection("patients").findOne({ _id: prescription.patient_id });
  res.json({
    ...prescription,
    id: prescription._id.toString(),
    patient_id: prescription.patient_id.toString(),
    patient_name: patient?.name,
    patient_number: patient?.patient_number,
    age_months: patient?.age_months,
    age_days: patient?.age_days,
    weight: patient?.weight,
    height: patient?.height,
    head_circumference: patient?.head_circumference,
    gender: patient?.gender,
    birth_date: patient?.birth_date,
  });
});

app.delete("/api/prescriptions/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  await db.collection("prescriptions").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

app.put("/api/prescriptions/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  const { diagnosis, items, service_name, revisit_date, revisit_method } = req.body;
  await db.collection("prescriptions").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { diagnosis, items, service_name, revisit_date, revisit_method, updatedAt: new Date() } }
  );
  res.json({ success: true });
});

// Settings & Clinics & Services APIs
app.get("/api/clinic-settings", authenticateToken, authorize(['doctor', 'assistant']), async (req, res) => {
  const settings = await db.collection("clinic_settings").findOne({ id: 1 });
  res.json(settings);
});

app.post("/api/clinic-settings", authenticateToken, authorize(['doctor']), async (req, res) => {
  const { name, address, phone, layout, bg_image, logo } = req.body;
  
  const updateFields: any = {};
  if (name !== undefined) updateFields.name = name;
  if (address !== undefined) updateFields.address = address;
  if (phone !== undefined) updateFields.phone = phone;
  if (layout !== undefined) updateFields.layout = layout;
  if (bg_image !== undefined) updateFields.bg_image = bg_image;
  if (logo !== undefined) updateFields.logo = logo;

  await db.collection("clinic_settings").updateOne(
    { id: 1 }, 
    { $set: updateFields }, 
    { upsert: true }
  );
  res.json({ success: true });
});

// Cloudinary Secure Push API Proxy (Hides credentials from browser / clients)
app.post("/api/upload-cloudinary", authenticateToken, authorize(['doctor']), async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: "No image payload provided" });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(400).json({ 
      error: "Cloudinary credentials missing.",
      code: "CLOUDINARY_NOT_CONFIGURED"
    });
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "prescriptions";
    
    // Cloudinary signature order: sorted alphabetically
    const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto
      .createHash("sha1")
      .update(signatureStr)
      .digest("hex");

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: image,
        api_key: apiKey,
        timestamp: timestamp,
        folder: folder,
        signature: signature
      })
    });

    const result: any = await response.json();
    if (!response.ok) {
      console.error("Cloudinary request returned error status:", response.status, result);
      return res.status(500).json({ error: result.error?.message || "Cloudinary connection error" });
    }

    res.json({ url: result.secure_url });
  } catch (error: any) {
    console.error("Cloudinary Upload Exception:", error);
    res.status(500).json({ error: error.message || "Failed to transmit photo to Cloudinary" });
  }
});

app.get("/api/clinics", authenticateToken, authorize(['doctor', 'assistant']), async (req, res) => {
  const clinics = await db.collection("clinics").find().toArray();
  res.json(clinics.map((c: any) => ({ ...c, id: c._id.toString() })));
});

app.post("/api/clinics", authenticateToken, authorize(['doctor']), async (req, res) => {
  const result = await db.collection("clinics").insertOne(req.body);
  res.json({ id: result.insertedId.toString() });
});

app.put("/api/clinics/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  const { id, _id, ...data } = req.body;
  await db.collection("clinics").updateOne({ _id: new ObjectId(req.params.id) }, { $set: data });
  res.json({ success: true });
});

app.delete("/api/clinics/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  try {
    const clinicId = req.params.id;
    await db.collection("clinics").deleteOne({ _id: new ObjectId(clinicId) });
    // Also delete all services in this clinic
    await db.collection("services").deleteMany({ clinic_id: clinicId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete clinic" });
  }
});

app.get("/api/services", authenticateToken, authorize(['doctor', 'assistant']), async (req, res) => {
  const services = await db.collection("services").find().toArray();
  res.json(services.map((s: any) => ({ 
    ...s, 
    id: s._id.toString(),
    clinic_id: s.clinic_id ? s.clinic_id.toString() : s.clinic_id 
  })));
});

app.post("/api/services", authenticateToken, authorize(['doctor']), async (req, res) => {
  const result = await db.collection("services").insertOne(req.body);
  res.json({ id: result.insertedId.toString() });
});

app.put("/api/services/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  const { id, _id, ...data } = req.body;
  await db.collection("services").updateOne({ _id: new ObjectId(req.params.id) }, { $set: data });
  res.json({ success: true });
});

app.delete("/api/services/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  await db.collection("services").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

// Growth Data APIs
app.get("/api/patients/:id/growth", authenticateToken, authorize(['doctor', 'assistant']), async (req, res) => {
  const data = await db.collection("growth_data")
    .find({ patient_id: new ObjectId(req.params.id) })
    .sort({ age_months: 1 })
    .toArray();
  res.json(data.map((d: any) => ({ ...d, id: d._id.toString() })));
});

app.post("/api/patients/:id/growth", authenticateToken, authorize(['doctor']), async (req, res) => {
  const result = await db.collection("growth_data").insertOne({
    ...req.body,
    patient_id: new ObjectId(req.params.id),
    createdAt: new Date()
  });
  res.json({ id: result.insertedId.toString() });
});

app.delete("/api/growth/:id", authenticateToken, authorize(['doctor']), async (req, res) => {
  await db.collection("growth_data").deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ success: true });
});

app.get("/api/health-check", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
