import type { Beneficiary, BeneficiarySyncResult } from './types';
import { api } from './api';

const QUEUE_KEY = 'nx_beneficiary_queue';

export interface QueuedBeneficiary {
  clientId: string;
  docType?: string;
  docNumber: string;
  fullName: string;
  householdSize?: number;
  phone?: string;
  lat?: number;
  lng?: number;
  address?: string;
  district?: string;
  needs?: string[];
  emergencyId?: string;
  campaignId?: string;
  queuedAt: string;
}

export function readQueue(): QueuedBeneficiary[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedBeneficiary[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedBeneficiary[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
  notify();
}

export function enqueueBeneficiary(record: Omit<QueuedBeneficiary, 'queuedAt'>): QueuedBeneficiary {
  const item: QueuedBeneficiary = { ...record, queuedAt: new Date().toISOString() };
  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function clearQueue() {
  writeQueue([]);
}

export function queueCount(): number {
  return readQueue().length;
}

/** Try to flush the offline queue via batch sync. Returns null if nothing/offline. */
export async function flushQueue(): Promise<BeneficiarySyncResult | null> {
  const queue = readQueue();
  if (queue.length === 0) return null;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  const records = queue.map(({ queuedAt: _queuedAt, ...rest }) => rest);
  const { data } = await api.post<BeneficiarySyncResult>('/beneficiaries/sync', { records });
  clearQueue();
  return data;
}

/** Create a beneficiary online, or queue it offline. */
export async function createOrQueueBeneficiary(
  record: Omit<QueuedBeneficiary, 'queuedAt'>,
): Promise<{ queued: boolean; beneficiary?: Beneficiary }> {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (offline) {
    enqueueBeneficiary(record);
    return { queued: true };
  }
  try {
    const { data } = await api.post<Beneficiary>('/beneficiaries', record);
    return { queued: false, beneficiary: data };
  } catch (err) {
    // Network failure → fall back to queue (but rethrow real validation errors).
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (!status) {
      enqueueBeneficiary(record);
      return { queued: true };
    }
    throw err;
  }
}

// --- tiny pub/sub so React components can react to queue size changes ---
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function newClientId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
