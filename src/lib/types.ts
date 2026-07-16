/* ============================================================
   NOSXOTROS — Tipos del dominio (espejo de API_CONTRACT.md)
   ============================================================ */

export type Role = 'DONOR' | 'VOLUNTEER' | 'MANAGER' | 'REGISTRAR' | 'ADMIN';

export type CampaignStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'FUNDED'
  | 'COMPLETED'
  | 'CANCELLED';

export type CampaignCategory =
  | 'HEALTH'
  | 'EDUCATION'
  | 'ENVIRONMENT'
  | 'ENTREPRENEURSHIP'
  | 'COMMUNITY'
  | 'EMERGENCY'
  | 'ANIMALS'
  | 'CULTURE'
  | 'TECHNOLOGY'
  | 'SPORTS'
  | 'OTHER';

export type DonationType = 'MONEY' | 'GOODS' | 'TIME';
export type PaymentMethod = 'YAPE' | 'PLIN' | 'CARD' | 'CASH' | 'IN_KIND';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type DonationStatus =
  | 'PROMISED'
  | 'RECEIVED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EmergencyStatus = 'ACTIVE' | 'MONITORING' | 'RESOLVED' | 'DRAFT';
export type CenterStatus = 'OPEN' | 'NEAR_FULL' | 'FULL' | 'CLOSED';
export type ShiftStatus = 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
export type BeneficiaryStatus = 'PENDING' | 'VALIDATED' | 'SERVED' | 'REJECTED';
export type DispatchStatus = 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
export type InventoryMovementType = 'IN' | 'OUT' | 'ADJUST';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface VolunteerBadge {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  earnedAt?: string;
}

export interface VolunteerProfile {
  id: string;
  userId: string;
  skills: string[];
  bio?: string;
  radiusKm?: number;
  baseLat?: number;
  baseLng?: number;
  interests?: string[];
  totalHours: number;
  impactPoints: number;
  passportCode: string;
  badges: VolunteerBadge[];
  brigades?: MyBrigade[];
}

export interface Organization {
  id: string;
  name: string;
  type?: string;
  verified: boolean;
  impactLens?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  locale?: string;
  organizationId?: string;
  volunteerProfile?: VolunteerProfile;
  organization?: Organization;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface TraceEvent {
  id: string;
  status: string;
  note?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount?: number;
  reference?: string;
}

export interface Donation {
  id: string;
  code: string;
  type: DonationType;
  status: DonationStatus;
  amount?: number;
  quantity?: number;
  unit?: string;
  description?: string;
  anonymous?: boolean;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  categoryId?: string;
  category?: Category;
  emergencyId?: string;
  emergency?: Emergency;
  campaignId?: string;
  campaign?: Campaign;
  centerId?: string;
  payment?: Payment;
  events?: TraceEvent[];
  createdAt: string;
}

export interface CampaignOrganizer {
  id: string;
  fullName: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface CampaignUpdate {
  id: string;
  title: string;
  body: string;
  photoUrl?: string;
  createdAt: string;
}

export interface CampaignRecentDonor {
  id: string;
  name: string;
  amount?: number;
  createdAt: string;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  summary: string;
  story: string;
  category: CampaignCategory;
  status: CampaignStatus;
  coverPhoto?: string;
  goalAmount?: number | null;
  raisedAmount: number;
  volunteerSkills?: string[];
  currency: string;
  backersCount: number;
  progressPct: number;
  deadline?: string;
  district?: string;
  lat?: number;
  lng?: number;
  featured: boolean;
  yapeNumber?: string;
  yapePhone?: string;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  qrImageUrl?: string;
  emergencyId?: string;
  organizerId: string;
  organizer?: CampaignOrganizer;
  updates?: CampaignUpdate[];
  recentDonors?: CampaignRecentDonor[];
  _count?: { donations: number; updates: number };
  createdAt: string;
}

export interface Need {
  id: string;
  title: string;
  categoryId?: string;
  category?: Category;
  targetQty: number;
  fulfilledQty?: number;
  unit?: string;
  priority?: Severity;
  isBlocked?: boolean;
}

export interface BrigadeMember {
  id: string;
  role?: string;
  volunteerId?: string;
  userId?: string;
  volunteer?: { id: string; user?: { id: string; fullName: string } };
  user?: { id: string; fullName: string };
}

export interface Brigade {
  id: string;
  campaignId: string;
  zoneId?: string;
  name: string;
  meetingPoint?: string;
  meetingPointMapUrl?: string;
  contactPhone?: string;
  zone?: { id: string; name: string; mapUrl?: string; severity: Severity };
  members?: BrigadeMember[];
}

export interface ZoneDispatch {
  id: string;
  status: DispatchStatus;
  items?: {
    id: string;
    description: string;
    quantity: number;
    delivered: boolean;
    beneficiary?: { id: string; fullName: string } | null;
  }[];
}

export interface Zone {
  id: string;
  campaignId: string;
  emergencyId?: string;
  name: string;
  mapUrl?: string;
  reference?: string;
  description?: string;
  severity: Severity;
  lat?: number;
  lng?: number;
  needs?: Need[];
  brigades?: Brigade[];
  beneficiaries?: { id: string; fullName: string; status: BeneficiaryStatus }[];
  dispatches?: ZoneDispatch[];
}

/** Voluntario inscrito en una campaña (vista del organizador). */
export interface CampaignVolunteer {
  id: string;
  volunteerId: string;
  skills: string[];
  note?: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  brigade?: { memberId: string; id: string; name: string; role?: string | null } | null;
}

/** Estado de inscripción del usuario autenticado en una campaña. */
export interface MyCampaignEnrollment {
  enrolled: boolean;
  id?: string;
  skills?: string[];
  note?: string | null;
  createdAt?: string;
}

export interface CampaignOperations {
  campaign: {
    id: string;
    slug: string;
    title: string;
    organizerId: string;
    organizer?: { id: string; fullName: string };
  };
  zones: Zone[];
  centers: Center[];
}

/** Brigada del voluntario (desde /volunteers/me). */
export interface MyBrigade {
  memberId: string;
  role?: string;
  brigadeId: string;
  name: string;
  meetingPoint?: string;
  meetingPointMapUrl?: string;
  contactPhone?: string;
  campaign?: { id: string; title: string; slug: string };
  zone?: {
    id: string;
    name: string;
    mapUrl?: string;
    reference?: string;
    severity: Severity;
    needs?: Need[];
  } | null;
}

export interface Emergency {
  id: string;
  title: string;
  description?: string;
  severity: Severity;
  status: EmergencyStatus;
  district?: string;
  lat?: number;
  lng?: number;
  needs?: Need[];
  centers?: Center[];
  campaigns?: { id: string; slug: string; title: string }[];
  primaryCenterId?: string;
  primaryCenter?: Center;
  mapUrl?: string;
  needsCount?: number;
  beneficiariesCount?: number;
  donationsCount?: number;
  coverPct?: number;
  createdAt: string;
}

export interface EmergencyMapPoint {
  id: string;
  title: string;
  lat: number;
  lng: number;
  severity: Severity;
  status: EmergencyStatus;
  needsCount: number;
  beneficiariesCount: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId?: string;
  category?: Category;
  quantity: number;
  unit?: string;
  expiresAt?: string;
}

export interface InventoryCategoryGroup {
  category: string;
  categoryId: string;
  totalQuantity: number;
  items: InventoryItem[];
}

export interface Center {
  id: string;
  name: string;
  address?: string;
  district?: string;
  lat?: number;
  lng?: number;
  capacity: number;
  currentLoad: number;
  loadPct: number;
  status: CenterStatus;
  contactPhone?: string;
  openingHours?: string;
  mapUrl?: string;
  campaignId?: string;
  inventory?: InventoryItem[];
  inventoryByCategory?: InventoryCategoryGroup[];
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  volunteerId: string;
  status?: string;
  checkinAt?: string;
  checkoutAt?: string;
  hours?: number;
}

export interface Shift {
  id: string;
  title: string;
  description?: string;
  skill?: string;
  startAt: string;
  endAt: string;
  capacity: number;
  enrolledCount: number;
  status: ShiftStatus;
  centerId?: string;
  center?: Center;
  emergencyId?: string;
  emergency?: Emergency;
  lat?: number;
  lng?: number;
  distanceKm?: number;
  enrolled?: boolean;
  assignment?: ShiftAssignment;
  assignments?: ShiftAssignment[];
}

export interface PassportShiftEntry {
  id: string;
  title: string;
  date: string;
  hours: number;
  points: number;
}

export interface Passport {
  totalHours: number;
  impactPoints: number;
  passportCode: string;
  badges: VolunteerBadge[];
  history: PassportShiftEntry[];
}

export interface Beneficiary {
  id: string;
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
  photoUrl?: string;
  emergencyId?: string;
  campaignId?: string;
  zoneId?: string;
  status: BeneficiaryStatus;
  clientId?: string;
  createdAt?: string;
}

export interface BeneficiarySyncResult {
  created: number;
  duplicates: number;
  errors: number;
}

export interface DispatchItem {
  description: string;
  quantity: number;
  donationId?: string;
  beneficiaryId?: string;
}

export interface Dispatch {
  id: string;
  code?: string;
  fromCenterId: string;
  fromCenter?: Center;
  emergencyId?: string;
  destLat?: number;
  destLng?: number;
  destAddress?: string;
  driverName?: string;
  status: DispatchStatus;
  items: DispatchItem[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  type?: string;
  read: boolean;
  createdAt: string;
}

export interface CenterMini {
  id: string;
  name: string;
  loadPct: number;
  status: CenterStatus;
}

export interface PublicDashboard {
  totalRaised: number;
  donationsCount: number;
  volunteersCount: number;
  hoursLogged: number;
  beneficiariesServed: number;
  activeEmergencies: number;
  centers: CenterMini[];
  topNeeds: Need[];
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface KpiDashboard {
  traceabilityPct: number;
  avgDeployMinutes: number;
  volunteerConversionPct: number;
  effectiveCollectionPct: number;
  nps: number;
  easeAvg: number;
  donationsByType: { type: DonationType; count: number; amount?: number }[];
  donationsTrend: TrendPoint[];
  inventoryByCategory: { category: string; quantity: number }[];
}

export type EmergencyReportStatus = 'PENDING' | 'REVIEWED' | 'CONVERTED' | 'REJECTED';

export interface EmergencyReport {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: Severity;
  status: EmergencyReportStatus;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  district?: string | null;
  photoUrl?: string | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  anonymous: boolean;
  reviewNote?: string | null;
  emergencyId?: string | null;
  emergency?: { id: string; title: string } | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
