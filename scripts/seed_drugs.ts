import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pediatric_clinic";

const medicationRules = [
  // Antipyretics
  {
    name: "Cetal drops (100mg/ml)",
    type: "Antipyretic",
    mg_per_kg: 15,
    doses_per_day: 4,
    duration_days: 3,
    concentration_mg_per_ml: 100,
    notes: "Paracetamol. 2-3 drops per kg every 6 hours."
  },
  {
    name: "Pyral syp (120mg/5ml)",
    type: "Antipyretic",
    mg_per_kg: 15,
    doses_per_day: 4,
    duration_days: 3,
    concentration_mg_per_ml: 24,
    notes: "Paracetamol elixir."
  },
  {
    name: "Abimol syp (150mg/5ml)",
    type: "Antipyretic",
    mg_per_kg: 15,
    doses_per_day: 4,
    duration_days: 3,
    concentration_mg_per_ml: 30,
    notes: "Paracetamol suspension."
  },
  {
    name: "Brufen syp (100mg/5ml)",
    type: "Antipyretic/Analgesic",
    mg_per_kg: 10,
    doses_per_day: 3,
    duration_days: 3,
    concentration_mg_per_ml: 20,
    notes: "Ibuprofen. Allowed starting from 6 months."
  },
  {
    name: "Dolphin-K drops",
    type: "Antipyretic/Analgesic",
    mg_per_kg: 2,
    doses_per_day: 3,
    duration_days: 3,
    concentration_mg_per_ml: 15, // Approx concentration for drops calculation
    notes: "Diclofenac. 1-2 drops per kg every 8 hours."
  },
  // Analgesics
  {
    name: "Ketofan susp (20mg/5ml)",
    type: "Analgesic",
    mg_per_kg: 1,
    doses_per_day: 3,
    duration_days: 3,
    concentration_mg_per_ml: 4,
    notes: "Ketoprofen."
  },
  // Antihistamines
  {
    name: "Fenistil drops",
    type: "Antihistaminic",
    mg_per_kg: 0.1, // Approximate for drop calculations
    doses_per_day: 3,
    duration_days: 5,
    concentration_mg_per_ml: 1,
    notes: "Dimetindene. 1 drop per kg per day divided into 3 doses."
  },
  {
    name: "Zyrtec drops (10mg/ml)",
    type: "Antihistaminic",
    mg_per_kg: 0.25,
    doses_per_day: 1,
    duration_days: 5,
    concentration_mg_per_ml: 10,
    notes: "Cetirizine. Once daily at night."
  },
  // Corticosteroids
  {
    name: "Predsol syp (5mg/5ml)",
    type: "Corticosteroid",
    mg_per_kg: 1.5,
    doses_per_day: 2,
    duration_days: 5,
    concentration_mg_per_ml: 1,
    notes: "Prednisolone."
  },
  // Mucolytics
  {
    name: "Ambroxol drops (7.5mg/ml)",
    type: "Mucolytic",
    mg_per_kg: 1.5,
    doses_per_day: 2,
    duration_days: 5,
    concentration_mg_per_ml: 7.5,
    notes: "Ambroxol hydrochloride."
  },
  // Antibiotics
  {
    name: "Erythrin susp (200mg/5ml)",
    type: "Antibiotic (Macrolide)",
    mg_per_kg: 40,
    doses_per_day: 3,
    duration_days: 7,
    concentration_mg_per_ml: 40,
    notes: "Erythromycin. Divide total dose into 3."
  },
  {
    name: "Klacid susp (125mg/5ml)",
    type: "Antibiotic (Macrolide)",
    mg_per_kg: 15,
    doses_per_day: 2,
    duration_days: 7,
    concentration_mg_per_ml: 25,
    notes: "Clarithromycin. Divide total dose into 2."
  },
  {
    name: "Zithrokan susp (200mg/5ml)",
    type: "Antibiotic (Macrolide)",
    mg_per_kg: 10,
    doses_per_day: 1,
    duration_days: 3,
    concentration_mg_per_ml: 40,
    notes: "Azithromycin. Once daily for 3 days."
  },
  {
    name: "Augmentin susp (156mg/5ml)",
    type: "Antibiotic (Penicillin)",
    mg_per_kg: 45,
    doses_per_day: 2,
    duration_days: 7,
    concentration_mg_per_ml: 31.2,
    notes: "Amoxicillin/Clavulanate."
  },
  {
    name: "Augmentin susp (457mg/5ml)",
    type: "Antibiotic (Penicillin)",
    mg_per_kg: 45,
    doses_per_day: 2,
    duration_days: 7,
    concentration_mg_per_ml: 91.4,
    notes: "Amoxicillin/Clavulanate High concentration."
  }
];

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db();
    const collection = db.collection('medication_rules');

    // Optional: Clear existing rules
    // await collection.deleteMany({});

    for (const rule of medicationRules) {
      await collection.updateOne(
        { name: rule.name },
        { $set: rule },
        { upsert: true }
      );
      console.log(`Seeded: ${rule.name}`);
    }

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await client.close();
  }
}

seed();
