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
  CampaignOperations,
  CampaignUpdate,
  Category,
  Center,
  Dispatch,
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
// Alta manual de inventario (sin QR): crea el artículo y genera su SKU.
export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      centerId,
      body,
    }: {
      centerId: string;
      body: { name: string; categoryId: string; quantity: number; unit?: string; expiresAt?: string };
    }) => api.post(`/centers/${centerId}/inventory`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centers'] });
      qc.invalidateQueries({ queryKey: ['center'] });
    },
  });
}
export function useCreateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Center>) => api.post<Center>('/centers', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['centers'] }),
  });
}

/* ---------------- Campaigns (grow) ---------------- */
export interface CreateCampaignBody {
  title: string;
  summary: string;
  story: string;
  goalAmount?: number;
  volunteerSkills?: string[];
  category?: string;
  coverPhoto?: string;
  deadline?: string;
  district?: string;
  lat?: number;
  lng?: number;
  yapeNumber?: string;
  yapePhone?: string;
  bankName?: string;
  bankAccount?: string;
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
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateCampaignBody> & { status?: string } }) =>
      api.patch<Campaign>(`/campaigns/${id}`, body).then((r) => r.data),
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
export function useBeneficiaries(params?: { emergencyId?: string; status?: string; q?: string }) {
  return useQuery({
    queryKey: ['beneficiaries', params],
    queryFn: () => get<Beneficiary[]>('/beneficiaries', params),
  });
}
export function useCreateBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      docNumber: string;
      fullName: string;
      householdSize?: number;
      phone?: string;
      district?: string;
      emergencyId?: string;
    }) => api.post<Beneficiary>('/beneficiaries', body).then((r) => r.data),
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
export function useDispatches(params?: { status?: string; emergencyId?: string }) {
  return useQuery({
    queryKey: ['dispatches', params],
    queryFn: () => get<Dispatch[]>('/dispatches', params),
  });
}
export function useCreateDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Dispatch>) =>
      api.post<Dispatch>('/dispatches', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispatches'] }),
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

/* ---------------- Brigades of the current volunteer ---------------- */
export function useCreateOrganization() {
  return useMutation({
    mutationFn: (body: { name: string; ruc: string; type?: string; contactPhone?: string; contactEmail?: string }) =>
      api.post<Organization>('/organizations', body).then((r) => r.data),
  });
}
