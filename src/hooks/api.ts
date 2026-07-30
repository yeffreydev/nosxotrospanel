import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { flushQueue } from '../lib/offline';
import type {
  AppNotification,
  AuthResponse,
  Beneficiary,
  BeneficiarySyncResult,
  Brigade,
  Campaign,
  CampaignStatus,
  CampaignOperations,
  CampaignUpdate,
  CampaignVolunteer,
  CampaignGoals,
  MyCampaignEnrollment,
  Category,
  Center,
  InventoryItem,
  InventoryMovement,
  Dispatch,
  DispatchItem,
  Donation,
  Emergency,
  EmergencyMapPoint,
  EmergencyReport,
  EmergencyReportStatus,
  KpiDashboard,
  Need,
  Organization,
  Passport,
  PublicDashboard,
  Shift,
  User,
  Zone,
} from '../lib/types';

/* ---------------- generic helpers ---------------- */
async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await api.get<T>(url, { params });
  return data;
}

/* ---------------- Auth ---------------- */
export function useLogin() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  });
}
export function useRegister() {
  return useMutation({
    mutationFn: (body: {
      email: string;
      password: string;
      fullName: string;
      role?: string;
      phone?: string;
      locale?: string;
    }) => api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  });
}
export function useGoogleLogin() {
  return useMutation({
    mutationFn: (body: { idToken: string; role?: string }) =>
      api.post<AuthResponse>('/auth/google', body).then((r) => r.data),
  });
}
export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => get<User>('/auth/me'),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/* ---------------- Dashboards ---------------- */
export function usePublicDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'public'],
    queryFn: () => get<PublicDashboard>('/dashboard/public'),
    staleTime: 60 * 1000,
  });
}
export function useKpis(enabled = true) {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => get<KpiDashboard>('/dashboard/kpis'),
    enabled,
  });
}

/* ---------------- Emergencies ---------------- */
export function useEmergencies(params?: { status?: string; severity?: string }) {
  return useQuery({
    queryKey: ['emergencies', params],
    queryFn: () => get<Emergency[]>('/emergencies', params),
  });
}
export function useEmergency(id?: string) {
  return useQuery({
    queryKey: ['emergency', id],
    queryFn: () => get<Emergency>(`/emergencies/${id}`),
    enabled: !!id,
  });
}
export function useEmergencyMap() {
  return useQuery({
    queryKey: ['emergencies', 'map'],
    queryFn: () => get<EmergencyMapPoint[]>('/emergencies/map'),
  });
}
export function useCreateEmergency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Emergency>) =>
      api.post<Emergency>('/emergencies', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergencies'] }),
  });
}
export function useUpdateEmergency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Emergency> }) =>
      api.patch<Emergency>(`/emergencies/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergencies'] }),
  });
}
/* ---------------- Emergency reports (reportes ciudadanos) ---------------- */
export function useEmergencyReports(params?: { status?: string }) {
  return useQuery({
    queryKey: ['emergencyReports', params],
    queryFn: () => get<EmergencyReport[]>('/emergencies/reports', params),
  });
}
export function useUpdateEmergencyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { status?: EmergencyReportStatus; reviewNote?: string };
    }) => api.patch<EmergencyReport>(`/emergencies/reports/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emergencyReports'] }),
  });
}
export function useCreateCampaignFromEmergency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emergencyId: string) =>
      api.post<Campaign>(`/emergencies/${emergencyId}/campaign`, {}).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}
export function useConvertEmergencyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Emergency>(`/emergencies/reports/${id}/convert`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergencyReports'] });
      qc.invalidateQueries({ queryKey: ['emergencies'] });
    },
  });
}

export function useCreateNeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Need> }) =>
      api.post<Need>(`/emergencies/${id}/needs`, body).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['emergency', v.id] });
      qc.invalidateQueries({ queryKey: ['emergencies'] });
    },
  });
}

/* ---------------- Centers + Inventory ---------------- */
export function useCenters(params?: { status?: string }) {
  return useQuery({
    queryKey: ['centers', params],
    queryFn: () => get<Center[]>('/centers', params),
  });
}
export function useCenter(id?: string) {
  return useQuery({
    queryKey: ['center', id],
    queryFn: () => get<Center>(`/centers/${id}`),
    enabled: !!id,
  });
}
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/categories'),
    staleTime: 10 * 60 * 1000,
  });
}
export function useScanInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      sku: string;
      type: 'IN' | 'OUT' | 'ADJUST';
      quantity: number;
      reason?: string;
      donationId?: string;
    }) => api.post('/inventory/scan', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centers'] });
      qc.invalidateQueries({ queryKey: ['center'] });
    },
  });
}
// Ingreso manual de producto (sin QR).
//
// El backend agrupa por nombre + unidad: si el centro ya tiene ese producto, suma
// la cantidad y devuelve `merged: true` en vez de crear otra línea.
export interface CreateInventoryItemBody {
  name: string;
  categoryId: string;
  quantity: number;
  unit?: string;
  expiresAt?: string;
  note?: string;
}
export function useCreateInventoryItem(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ centerId, body }: { centerId: string; body: CreateInventoryItemBody }) =>
      api
        .post<InventoryItem & { merged: boolean }>(`/centers/${centerId}/inventory`, body)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centers'] });
      qc.invalidateQueries({ queryKey: ['center'] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'goals'] });
      invalidateOps(qc, campaignId);
    },
  });
}
// Corrige un producto ya registrado (nombre, categoría, unidad, stock real).
export function useUpdateInventoryItem(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      centerId,
      itemId,
      body,
    }: {
      centerId: string;
      itemId: string;
      body: {
        name?: string;
        categoryId?: string;
        unit?: string;
        quantity?: number;
        expiresAt?: string;
        reason?: string;
      };
    }) => api.patch<InventoryItem>(`/centers/${centerId}/inventory/${itemId}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centers'] });
      qc.invalidateQueries({ queryKey: ['center'] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'goals'] });
      invalidateOps(qc, campaignId);
    },
  });
}
// Historial de movimientos del almacén de un centro.
export function useCenterMovements(centerId?: string, enabled = true) {
  return useQuery({
    queryKey: ['center', centerId, 'movements'],
    queryFn: () => get<InventoryMovement[]>(`/centers/${centerId}/movements`),
    enabled: !!centerId && enabled,
  });
}
export function useCreateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Center>) => api.post<Center>('/centers', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['centers'] }),
  });
}
export function useUpdateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Center> }) =>
      api.patch<Center>(`/centers/${id}`, body).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['centers'] });
      qc.invalidateQueries({ queryKey: ['center', v.id] });
      qc.invalidateQueries({ queryKey: ['campaign'] });
    },
  });
}
// Crea una categoría propia si la que el organizador necesita no existe.
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; unit?: string; icon?: string; kind?: string }) =>
      api.post<Category>('/categories', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

/* ---------------- Uploads (imágenes) ---------------- */
export interface UploadedImage {
  filename: string;
  mimetype: string;
  size: number;
  url: string; // URL absoluta servida por el backend (/uploads/<archivo>)
}

// Sube una imagen al backend y devuelve su URL pública, lista para guardarla en
// coverPhoto / qrImageUrl / photoUrl.
export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api
        .post<UploadedImage>('/uploads/image', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },
  });
}

/* ---------------- Campaigns (grow) ---------------- */
export interface CreateCampaignBody {
  title: string;
  summary: string;
  story: string;
  /** Meta de dinero. null la quita. */
  goalAmount?: number | null;
  volunteerSkills?: string[];
  /** Meta de voluntarios: cuántas personas necesita la campaña. null la quita. */
  volunteerGoal?: number | null;
  category?: string;
  coverPhoto?: string;
  deadline?: string;
  /** Ubicación principal: con ella el backend crea la zona principal. */
  region?: string;
  province?: string;
  district?: string;
  address?: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
  yapeNumber?: string;
  yapePhone?: string;
  bankName?: string;
  bankAccount?: string;
  cci?: string;
  accountHolder?: string;
  qrImageUrl?: string;
  status?: 'DRAFT' | 'ACTIVE';
}
export function useCampaigns(params?: {
  status?: string;
  category?: string;
  q?: string;
  organizerId?: string;
  featured?: string;
}) {
  return useQuery({
    queryKey: ['campaigns', params],
    queryFn: () => get<Campaign[]>('/campaigns', params),
  });
}
export function useCampaign(idOrSlug?: string) {
  return useQuery({
    queryKey: ['campaign', idOrSlug],
    queryFn: () => get<Campaign>(`/campaigns/${idOrSlug}`),
    enabled: !!idOrSlug,
  });
}
export function useMyCampaigns(enabled = true) {
  return useQuery({
    queryKey: ['campaigns', 'mine'],
    queryFn: () => get<Campaign[]>('/campaigns/mine'),
    enabled,
  });
}
export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCampaignBody) =>
      api.post<Campaign>('/campaigns', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}
export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    // El alta solo ofrece DRAFT/ACTIVE, pero editando se pasa por todos los
    // estados (pausar, cerrar, cancelar), así que aquí se acepta el enum entero.
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Omit<Partial<CreateCampaignBody>, 'status'> & { status?: CampaignStatus };
    }) => api.patch<Campaign>(`/campaigns/${id}`, body).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign', v.id] });
    },
  });
}
export function usePostCampaignUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { title: string; body: string; photoUrl?: string } }) =>
      api.post<CampaignUpdate>(`/campaigns/${id}/updates`, body).then((r) => r.data),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['campaign', v.id] }),
  });
}

/* ---------------- Donations ---------------- */
export interface CreateDonationBody {
  type: 'MONEY' | 'GOODS' | 'TIME';
  amount?: number;
  quantity?: number;
  description?: string;
  categoryId?: string;
  emergencyId?: string;
  campaignId?: string;
  centerId?: string;
  paymentMethod?: string;
  anonymous?: boolean;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
}
export function useCreateDonation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDonationBody) =>
      api.post<Donation>('/donations', body).then((r) => r.data),
    onSuccess: (_d, body) => {
      qc.invalidateQueries({ queryKey: ['donations'] });
      if (body.campaignId) {
        qc.invalidateQueries({ queryKey: ['campaign', body.campaignId] });
        qc.invalidateQueries({ queryKey: ['campaigns'] });
      }
    },
  });
}
export function useConfirmPayment() {
  return useMutation({
    mutationFn: ({ id, reference }: { id: string; reference?: string }) =>
      api.post<Donation>(`/donations/${id}/confirm-payment`, { reference }).then((r) => r.data),
  });
}
export function useMyDonations(params?: { status?: string; type?: string; campaignId?: string }) {
  return useQuery({
    queryKey: ['donations', params],
    queryFn: () => get<Donation[]>('/donations', params),
  });
}
/** Donaciones de una campaña (para el panel del organizador). */
export function useCampaignDonations(campaignId?: string) {
  return useQuery({
    queryKey: ['donations', 'campaign', campaignId],
    queryFn: () => get<Donation[]>('/donations', { campaignId }),
    enabled: !!campaignId,
  });
}
export function useTrackDonation(code?: string) {
  return useQuery({
    queryKey: ['donation', 'track', code],
    queryFn: () => get<Donation>(`/donations/track/${code}`),
    enabled: !!code,
    retry: false,
  });
}
/** Consulta pública de donaciones por correo o por teléfono. */
export function useLookupDonations() {
  return useMutation({
    mutationFn: (params: { email?: string; phone?: string }) =>
      get<Donation[]>('/donations/lookup', params),
  });
}
export function useUpdateDonationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { status: string; note?: string; lat?: number; lng?: number };
    }) => api.patch<Donation>(`/donations/${id}/status`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donations'] }),
  });
}

/* ---------------- Volunteers + Shifts ---------------- */
export function useVolunteerMe(enabled = true) {
  return useQuery({
    queryKey: ['volunteers', 'me'],
    queryFn: () => get<User['volunteerProfile']>('/volunteers/me'),
    enabled,
  });
}
export function usePassport(enabled = true) {
  return useQuery({
    queryKey: ['volunteers', 'passport'],
    queryFn: () => get<Passport>('/volunteers/me/passport'),
    enabled,
  });
}
export function useShifts(params?: {
  skill?: string;
  emergencyId?: string;
  centerId?: string;
  status?: string;
  near?: number;
  lat?: number;
  lng?: number;
}) {
  return useQuery({
    queryKey: ['shifts', params],
    queryFn: () => get<Shift[]>('/shifts', params),
  });
}
export function useEnrollShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/shifts/${id}/enroll`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}
export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lat, lng }: { id: string; lat: number; lng: number }) =>
      api.post(`/shifts/${id}/checkin`, { lat, lng }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });
}
export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/shifts/${id}/checkout`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['volunteers'] });
    },
  });
}

/* ---------------- Beneficiaries ---------------- */
export function useBeneficiaries(params?: {
  emergencyId?: string;
  campaignId?: string;
  status?: string;
  q?: string;
}) {
  return useQuery({
    queryKey: ['beneficiaries', params],
    queryFn: () => get<Beneficiary[]>('/beneficiaries', params),
  });
}
export interface BeneficiaryBody {
  docNumber: string;
  fullName: string;
  householdSize?: number;
  phone?: string;
  address?: string;
  district?: string;
  notes?: string;
  photoUrl?: string;
  emergencyId?: string;
  campaignId?: string;
  zoneId?: string;
}
export function useCreateBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BeneficiaryBody) =>
      api.post<Beneficiary>('/beneficiaries', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}
export function useUpdateBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<BeneficiaryBody> & { status?: string } }) =>
      api.patch<Beneficiary>(`/beneficiaries/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}
export function useDeleteBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/beneficiaries/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}
export function useUpdateBeneficiaryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Beneficiary>(`/beneficiaries/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}
export function useSyncBeneficiaries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => flushQueue() as Promise<BeneficiarySyncResult | null>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}

/* ---------------- Dispatches ---------------- */
export function useDispatches(params?: { status?: string; emergencyId?: string; zoneId?: string }) {
  return useQuery({
    queryKey: ['dispatches', params],
    queryFn: () => get<Dispatch[]>('/dispatches', params),
  });
}
export interface CreateDispatchBody {
  fromCenterId: string;
  emergencyId?: string;
  /** Zona de atención destino: de ella salen dirección y pin si no se escriben. */
  zoneId?: string;
  destAddress?: string;
  driverName?: string;
  items: DispatchItem[];
}
export function useCreateDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDispatchBody) =>
      api.post<Dispatch>('/dispatches', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      // El despacho descuenta del centro y toca las zonas de la campaña.
      qc.invalidateQueries({ queryKey: ['centers'] });
      qc.invalidateQueries({ queryKey: ['campaign'] });
    },
  });
}
export function useUpdateDispatchStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Dispatch>(`/dispatches/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispatches'] }),
  });
}

/* ---------------- Organizations ---------------- */
export function useOrganizations(params?: { type?: string; verified?: boolean }) {
  return useQuery({
    queryKey: ['organizations', params],
    queryFn: () => get<Organization[]>('/organizations', params),
  });
}

/* ---------------- Notifications ---------------- */
export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => get<AppNotification[]>('/notifications'),
    enabled,
    refetchInterval: 60 * 1000,
  });
}
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/notifications/read-all').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/* ---------------- Campaign Ops: zonas + brigadas ---------------- */
export interface CreateZoneBody {
  name: string;
  mapUrl?: string;
  reference?: string;
  description?: string;
  severity?: string;
  lat?: number;
  lng?: number;
  emergencyId?: string;
}
export interface CreateBrigadeBody {
  name: string;
  zoneId?: string;
  meetingPoint?: string;
  meetingPointMapUrl?: string;
  contactPhone?: string;
}

export function useCampaignOperations(idOrSlug?: string) {
  return useQuery({
    queryKey: ['campaign', idOrSlug, 'operations'],
    queryFn: () => get<CampaignOperations>(`/campaigns/${idOrSlug}/operations`),
    enabled: !!idOrSlug,
  });
}
function invalidateOps(qc: ReturnType<typeof useQueryClient>, campaignId?: string) {
  qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'operations'] });
  qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'brigades'] });
}
// Todas las brigadas de la campaña, incluidas las que no tienen zona asignada
// (las de /operations solo vienen anidadas dentro de cada zona).
export function useCampaignBrigades(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'brigades'],
    queryFn: () => get<Brigade[]>(`/campaigns/${campaignId}/brigades`),
    enabled: !!campaignId,
  });
}
// Zonas de atención de una campaña. Se usan como destino al despachar, así que
// hacen falta también fuera del panel de operaciones.
export function useCampaignZones(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'zones'],
    queryFn: () => get<Zone[]>(`/campaigns/${campaignId}/zones`),
    enabled: !!campaignId,
  });
}
export function useCreateZone(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateZoneBody) =>
      api.post<Zone>(`/campaigns/${campaignId}/zones`, body).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}
export function useUpdateZone(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateZoneBody> }) =>
      api.patch<Zone>(`/zones/${id}`, body).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}
export function useDeleteZone(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/zones/${id}`).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}
export function useAddZoneNeed(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ zoneId, body }: { zoneId: string; body: { title: string; targetQty: number; unit?: string; priority?: string; categoryId?: string; isBlocked?: boolean } }) =>
      api.post<Need>(`/zones/${zoneId}/needs`, body).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}
/* ---------------- Metas de la campaña (dinero, voluntarios, especies) ---------------- */
export interface CampaignNeedBody {
  title: string;
  targetQty: number;
  unit?: string;
  categoryId?: string;
  priority?: string;
  isBlocked?: boolean;
  zoneId?: string;
}

/** Tablero de metas: lo que se necesita y cuánto lleva recolectado. */
export function useCampaignGoals(idOrSlug?: string, date?: string) {
  return useQuery({
    queryKey: ['campaign', idOrSlug, 'goals', date ?? ''],
    queryFn: () => get<CampaignGoals>(`/campaigns/${idOrSlug}/goals`, date ? { date } : undefined),
    enabled: !!idOrSlug,
  });
}
function invalidateGoals(qc: ReturnType<typeof useQueryClient>, campaignId?: string) {
  qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'goals'] });
  invalidateOps(qc, campaignId);
}
export function useCreateCampaignNeed(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CampaignNeedBody) =>
      api.post<Need>(`/campaigns/${campaignId}/needs`, body).then((r) => r.data),
    onSuccess: () => invalidateGoals(qc, campaignId),
  });
}
export function useUpdateCampaignNeed(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CampaignNeedBody> }) =>
      api.patch<Need>(`/needs/${id}`, body).then((r) => r.data),
    onSuccess: () => invalidateGoals(qc, campaignId),
  });
}
export function useDeleteCampaignNeed(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/needs/${id}`).then((r) => r.data),
    onSuccess: () => invalidateGoals(qc, campaignId),
  });
}

export function useCreateBrigade(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBrigadeBody) =>
      api.post<Brigade>(`/campaigns/${campaignId}/brigades`, body).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}
export function useUpdateBrigade(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateBrigadeBody> }) =>
      api.patch<Brigade>(`/brigades/${id}`, body).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}
export function useDeleteBrigade(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/brigades/${id}`).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}
export function useAddBrigadeMember(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brigadeId, body }: { brigadeId: string; body: { volunteerId?: string; userId?: string; role?: string } }) =>
      api.post(`/brigades/${brigadeId}/members`, body).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}
export function useRemoveBrigadeMember(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brigadeId, memberId }: { brigadeId: string; memberId: string }) =>
      api.delete(`/brigades/${brigadeId}/members/${memberId}`).then((r) => r.data),
    onSuccess: () => invalidateOps(qc, campaignId),
  });
}

/* ---------------- Voluntarios inscritos en una campaña ---------------- */
// Solo se puede sumar a una brigada a quien está inscrito en la campaña.
function invalidateCampaignVolunteers(qc: ReturnType<typeof useQueryClient>, campaignId?: string) {
  qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'volunteers'] });
  invalidateOps(qc, campaignId);
}

export function useCampaignVolunteers(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'volunteers'],
    queryFn: () => get<CampaignVolunteer[]>(`/campaigns/${campaignId}/volunteers`),
    enabled: !!campaignId,
  });
}

/** Inscripción del usuario autenticado (para el botón "Inscribirme" en la campaña). */
export function useMyCampaignEnrollment(campaignId?: string, enabled = true) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'volunteers', 'me'],
    queryFn: () => get<MyCampaignEnrollment>(`/campaigns/${campaignId}/volunteers/me`),
    enabled: !!campaignId && enabled,
  });
}

export function useEnrollAsVolunteer(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { skills?: string[]; note?: string }) =>
      api.post(`/campaigns/${campaignId}/volunteers/me`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'volunteers', 'me'] });
      invalidateCampaignVolunteers(qc, campaignId);
    },
  });
}

export function useLeaveCampaign(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/campaigns/${campaignId}/volunteers/me`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'volunteers', 'me'] });
      invalidateCampaignVolunteers(qc, campaignId);
    },
  });
}

/** El organizador inscribe a un usuario ya registrado, por correo. */
export function useAddCampaignVolunteer(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; skills?: string[]; note?: string }) =>
      api.post(`/campaigns/${campaignId}/volunteers`, body).then((r) => r.data),
    onSuccess: () => invalidateCampaignVolunteers(qc, campaignId),
  });
}

export function useRemoveCampaignVolunteer(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (volunteerId: string) =>
      api.delete(`/campaigns/${campaignId}/volunteers/${volunteerId}`).then((r) => r.data),
    onSuccess: () => invalidateCampaignVolunteers(qc, campaignId),
  });
}

/* ---------------- Brigades of the current volunteer ---------------- */
export function useCreateOrganization() {
  return useMutation({
    mutationFn: (body: { name: string; ruc: string; type?: string; contactPhone?: string; contactEmail?: string }) =>
      api.post<Organization>('/organizations', body).then((r) => r.data),
  });
}

/* ---------------- Despacho desde el inventario de un centro ---------------- */
export interface DispatchCenterItemBody {
  itemId: string;
  quantity: number;
  /** Zona de atención a la que va la ayuda (obligatoria salvo que la aporte el beneficiario). */
  zoneId?: string;
  beneficiaryId?: string;
  driverName?: string;
  destAddress?: string;
  note?: string;
}
export function useDispatchCenterItem(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ centerId, body }: { centerId: string; body: DispatchCenterItemBody }) =>
      api.post<Dispatch>(`/centers/${centerId}/dispatch`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centers'] });
      qc.invalidateQueries({ queryKey: ['center'] });
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'goals'] });
      invalidateOps(qc, campaignId);
    },
  });
}

/* ---------------- Voluntarios (gestión por el gestor) ---------------- */
export interface VolunteerProfileRow {
  id: string;
  availability?: string | null;
  skills: string[];
  user: { id: string; fullName: string; email: string; phone?: string | null };
  _count?: { schedules: number };
}
export interface VolunteerScheduleRow {
  id: string;
  date?: string | null;
  /** Días de la semana de una disponibilidad recurrente (0=domingo … 6=sábado). */
  weekdays?: number[];
  validFrom?: string | null;
  validTo?: string | null;
  startTime: string;
  endTime: string;
  note?: string | null;
  campaignId?: string | null;
}

/** Con qué voluntarios se cuenta un día concreto. */
export interface CampaignAvailabilityRow {
  id: string;
  volunteerId: string | null;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  isGuest: boolean;
  skills: string[];
  available: boolean;
  slots: { id: string; startTime: string; endTime: string; note?: string | null; recurring: boolean }[];
}
export interface CampaignAvailability {
  date: string;
  weekday: number;
  total: number;
  availableCount: number;
  volunteers: CampaignAvailabilityRow[];
}
export function useCampaignAvailability(campaignId?: string, date?: string) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'availability', date ?? ''],
    queryFn: () =>
      get<CampaignAvailability>(
        `/campaigns/${campaignId}/volunteers/availability`,
        date ? { date } : undefined,
      ),
    enabled: !!campaignId,
  });
}
export function useVolunteersList(q?: string) {
  return useQuery({
    queryKey: ['volunteers', q ?? ''],
    queryFn: () => get<VolunteerProfileRow[]>('/volunteers', q ? { q } : undefined),
  });
}
export function useCreateVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { fullName: string; phone?: string; email?: string; availability?: string; skills?: string[] }) =>
      api.post<{ id: string; email: string; fullName: string; volunteerProfile?: { id: string } }>('/volunteers', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['volunteers'] }),
  });
}
export function useVolunteerSchedules(volunteerId?: string, enabled = true) {
  return useQuery({
    queryKey: ['volunteer', volunteerId, 'schedule'],
    queryFn: () => get<VolunteerScheduleRow[]>(`/volunteers/${volunteerId}/schedule`),
    enabled: !!volunteerId && enabled,
  });
}
export interface VolunteerScheduleBody {
  startTime: string;
  endTime: string;
  /** Día concreto ("el sábado 12") como YYYY-MM-DD. Excluyente con weekdays. */
  date?: string;
  /** Días de la semana recurrentes (0=domingo … 6=sábado). */
  weekdays?: number[];
  validFrom?: string;
  validTo?: string;
  note?: string;
  campaignId?: string;
}
export function useAddVolunteerSchedule(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ volunteerId, body }: { volunteerId: string; body: VolunteerScheduleBody }) =>
      api.post<VolunteerScheduleRow>(`/volunteers/${volunteerId}/schedule`, body).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['volunteer', v.volunteerId, 'schedule'] });
      qc.invalidateQueries({ queryKey: ['volunteers'] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'availability'] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'goals'] });
    },
  });
}
export function useDeleteVolunteerSchedule(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ volunteerId, scheduleId }: { volunteerId: string; scheduleId: string }) =>
      api.delete(`/volunteers/${volunteerId}/schedule/${scheduleId}`).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['volunteer', v.volunteerId, 'schedule'] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'availability'] });
    },
  });
}

/* --- Disponibilidad declarada por el propio voluntario (/volunteers/me) --- */
export function useMySchedules(enabled = true) {
  return useQuery({
    queryKey: ['volunteers', 'me', 'schedule'],
    queryFn: () => get<VolunteerScheduleRow[]>('/volunteers/me/schedule'),
    enabled,
  });
}
export function useAddMySchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VolunteerScheduleBody) =>
      api.post<VolunteerScheduleRow>('/volunteers/me/schedule', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['volunteers', 'me', 'schedule'] }),
  });
}
export function useDeleteMySchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) =>
      api.delete(`/volunteers/me/schedule/${scheduleId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['volunteers', 'me', 'schedule'] }),
  });
}

/* ---------------- Usuarios (alta con rol por el gestor) ---------------- */
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; fullName: string; role: string; password?: string; phone?: string }) =>
      api.post<User>('/users', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

/* ---------------- Colaboradores de campaña ---------------- */
export interface CampaignCollaboratorRow {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string; role: string };
}
export function useCampaignCollaborators(campaignId?: string) {
  return useQuery({
    queryKey: ['campaign', campaignId, 'collaborators'],
    queryFn: () => get<CampaignCollaboratorRow[]>(`/campaigns/${campaignId}/collaborators`),
    enabled: !!campaignId,
  });
}
export function useAddCollaborator(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { userId?: string; email?: string }) =>
      api.post<CampaignCollaboratorRow>(`/campaigns/${campaignId}/collaborators`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'collaborators'] }),
  });
}
export function useRemoveCollaborator(campaignId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/campaigns/${campaignId}/collaborators/${userId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign', campaignId, 'collaborators'] }),
  });
}
