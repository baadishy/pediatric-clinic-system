const API_BASE = '/api';

export interface Appointment {
  id?: string;
  _id?: string;
  patientName: string;
  birthDate: string;
  phone: string;
  clinicId: string;
  serviceId: string;
  clinicName?: string;
  serviceName?: string;
  appointmentDay: string;
  appointmentTime: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date | string;
}

export interface User {
  id: string;
  username: string;
  role: 'doctor' | 'assistant';
  name: string;
}

export interface WaitingItem {
  id: string;
  patient_id: string;
  appointment_id?: string;
  patient_name: string;
  patient_number: string;
  patient_phone?: string;
  birth_date: string;
  revisit_method: string;
  createdAt: string;
}

export interface Patient {
  id?: string;
  patient_number?: string;
  name: string;
  age_months: number;
  age_days?: number;
  birth_date?: string;
  weight: number;
  temperature?: string;
  height?: number;
  head_circumference?: number;
  gender: 'boy' | 'girl';
  complaint?: string;
  created_at?: string;
}

export interface MedicationRule {
  id?: string;
  name: string;
  type: 'liquid' | 'pill';
  mg_per_kg: number;
  doses_per_day: number;
  duration_days: number;
  concentration_mg_per_ml?: number;
  notes?: string;
}

export interface PrescriptionItem {
  medication_name: string;
  dose_description: string;
  frequency_description: string;
  duration_days: number;
  notes?: string;
}

export interface Prescription {
  id?: string;
  patient_id: string;
  appointment_id?: string;
  patient_number?: string;
  diagnosis: string;
  complaint?: string;
  items: PrescriptionItem[];
  service_name?: string;
  patient_name?: string;
  age_months?: number;
  age_days?: number;
  weight?: number;
  temperature?: string;
  birth_date?: string;
  gender?: 'boy' | 'girl';
  revisit_date?: string;
  revisit_method?: string;
  createdAt?: string;
}

export interface GrowthData {
  id?: string;
  patient_id: string;
  weight: number;
  height: number;
  head_circumference: number;
  age_months: number;
  age_days?: number;
  diagnosis?: string;
  complaint?: string;
  createdAt?: string;
}

export interface ClinicSettings {
  name: string;
  address: string;
  phone: string;
  logo?: string;
  layout?: any;
  bg_image?: string;
}

export interface Clinic {
  id: string;
  name: string;
}

export interface MedicalService {
  id?: string;
  name: string;
  price: number;
  assistant_fees: number;
  clinic_id: string;
}

async function handleResponse(res: Response, retries = 15, url = '', init?: RequestInit): Promise<any> {
  const contentType = res.headers.get('content-type');
  
  // 1. Handle JSON success/error
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem('pediatric_token');
        localStorage.removeItem('pediatric_user');
      }
      const errorMessage = data.error || `HTTP error! status: ${res.status}`;
      console.error(`API Error (${res.status}) at ${res.url}:`, data);
      throw new Error(errorMessage);
    }
    return data;
  }
  
  // 2. Handle non-JSON (HTML/Text)
  const text = await res.text();
  const lowerText = text.toLowerCase();
  
  // Platform "Starting Server..." page detection
  const isPlatformPage = 
    lowerText.includes('starting server...') || 
    lowerText.includes('please wait while your application starts') ||
    lowerText.includes('loading...') ||
    (res.status === 200 && (lowerText.includes('<!doctype html>') || lowerText.includes('<html')) && !url.includes('.html'));

  if (isPlatformPage && retries > 0) {
    console.log(`[API] Platform/Server not ready, retrying in 2s... (${retries} retries left for ${url})`);
    await new Promise(r => setTimeout(r, 2000));
    try {
      const newRes = await fetch(url, init);
      return handleResponse(newRes, retries - 1, url, init);
    } catch (e) {
      console.warn(`[API] Network error during retry for ${url}, waiting 2s...`, e);
      await new Promise(r => setTimeout(r, 2000));
      const nextRes = await fetch(url, init);
      return handleResponse(nextRes, retries - 1, url, init);
    }
  }
  
  const errorMessage = `Failed request to ${res.url || url}. Status: ${res.status} (${res.statusText}). Expected JSON but received ${contentType || 'unknown'}.`;
  console.error(errorMessage, text.substring(0, 500));
  throw new Error(`${errorMessage} Response start: ${text.substring(0, 100)}`);
}

const apiRequest = async (url: string, init?: RequestInit) => {
  const token = localStorage.getItem('pediatric_token');
  const headers = {
    ...((init && init.headers) || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch(url, { ...init, headers });
    return handleResponse(res, 10, url, init);
  } catch (e) {
    console.error(`Fetch failed for ${url}:`, e);
    throw e;
  }
};

export const api = {
  getDbStatus: async () => {
    return apiRequest(`${API_BASE}/db-status`);
  },
  login: async (username: string, password: string): Promise<{ token: string, user: User }> => {
    return apiRequest(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  },
  getWaitingList: async (): Promise<WaitingItem[]> => {
    return apiRequest(`${API_BASE}/waiting`);
  },
  addToWaitingList: async (patientId: string, revisit_method: string) => {
    return apiRequest(`${API_BASE}/waiting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, revisit_method })
    });
  },
  removeFromWaitingList: async (id: string) => {
    return apiRequest(`${API_BASE}/waiting/${id}`, {
      method: 'DELETE'
    });
  },
  createPatient: async (patient: Patient) => {
    return apiRequest(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patient)
    });
  },
  getMedicationRules: async () => {
    return apiRequest(`${API_BASE}/medication-rules`) as Promise<MedicationRule[]>;
  },
  createMedicationRule: async (rule: MedicationRule) => {
    return apiRequest(`${API_BASE}/medication-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
  },
  updateMedicationRule: async (id: string, rule: MedicationRule) => {
    return apiRequest(`${API_BASE}/medication-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
  },
  deleteMedicationRule: async (id: string) => {
    return apiRequest(`${API_BASE}/medication-rules/${id}`, {
      method: 'DELETE'
    });
  },
  createPrescription: async (prescription: Prescription) => {
    return apiRequest(`${API_BASE}/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prescription)
    });
  },
  getPrescriptions: async () => {
    return apiRequest(`${API_BASE}/prescriptions`) as Promise<Prescription[]>;
  },
  getPrescription: async (id: string) => {
    return apiRequest(`${API_BASE}/prescriptions/${id}`);
  },
  deletePrescription: async (id: string) => {
    return apiRequest(`${API_BASE}/prescriptions/${id}`, {
      method: 'DELETE'
    });
  },
  updatePrescription: async (id: string, prescription: Partial<Prescription>) => {
    return apiRequest(`${API_BASE}/prescriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prescription)
    });
  },
  getClinicSettings: async () => {
    return apiRequest(`${API_BASE}/clinic-settings`) as Promise<ClinicSettings>;
  },
  getPublicClinicName: async (): Promise<{ name: string }> => {
    const res = await fetch(`${API_BASE}/clinic/public`);
    return res.json();
  },
  updateClinicSettings: async (settings: ClinicSettings) => {
    return apiRequest(`${API_BASE}/clinic-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  },
  getClinics: async () => {
    return apiRequest(`${API_BASE}/clinics`) as Promise<Clinic[]>;
  },
  addClinic: async (clinic: Omit<Clinic, 'id'>) => {
    return apiRequest(`${API_BASE}/clinics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinic)
    });
  },
  updateClinic: async (id: string, clinic: Partial<Clinic>) => {
    return apiRequest(`${API_BASE}/clinics/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clinic)
    });
  },
  deleteClinic: async (id: string) => {
    return apiRequest(`${API_BASE}/clinics/${id}`, {
      method: 'DELETE'
    });
  },
  getServices: async () => {
    return apiRequest(`${API_BASE}/services`) as Promise<MedicalService[]>;
  },
  addService: async (service: MedicalService) => {
    return apiRequest(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service)
    });
  },
  updateService: async (id: string, service: Partial<MedicalService>) => {
    return apiRequest(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service)
    });
  },
  deleteService: async (id: string) => {
    return apiRequest(`${API_BASE}/services/${id}`, {
      method: 'DELETE'
    });
  },
  getGrowthData: async (patientId: string) => {
    return apiRequest(`${API_BASE}/patients/${patientId}/growth`) as Promise<GrowthData[]>;
  },
  addGrowthData: async (patientId: string, data: Omit<GrowthData, 'id' | 'patient_id'>) => {
    return apiRequest(`${API_BASE}/patients/${patientId}/growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  deleteGrowthData: async (id: string) => {
    return apiRequest(`${API_BASE}/growth/${id}`, {
      method: 'DELETE'
    });
  },
  getPatients: async () => {
    return apiRequest(`${API_BASE}/patients`) as Promise<Patient[]>;
  },
  searchPatients: async (query: string) => {
    return apiRequest(`${API_BASE}/patients/search?query=${encodeURIComponent(query)}`) as Promise<Patient[]>;
  },
  getPatient: async (id: string) => {
    return apiRequest(`${API_BASE}/patients/${id}`) as Promise<Patient>;
  },
  getAppointments: async (): Promise<Appointment[]> => {
    return apiRequest(`${API_BASE}/appointments`);
  },
  createAppointment: async (appt: Partial<Appointment>) => {
    return apiRequest(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appt)
    });
  },
  updateAppointment: async (id: string, appt: Partial<Appointment>) => {
    return apiRequest(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appt)
    });
  },
  deleteAppointment: async (id: string) => {
    return apiRequest(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE'
    });
  },
  checkInAppointment: async (id: string) => {
    return apiRequest(`${API_BASE}/appointments/${id}/check-in`, {
      method: 'POST'
    });
  },
  updatePatient: async (id: string, data: Partial<Patient>) => {
    return apiRequest(`${API_BASE}/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },
  deletePatient: async (id: string) => {
    return apiRequest(`${API_BASE}/patients/${id}`, {
      method: 'DELETE'
    });
  },
  uploadToCloudinary: async (base64Image: string): Promise<{ url: string }> => {
    return apiRequest(`${API_BASE}/upload-cloudinary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image })
    });
  }
};
