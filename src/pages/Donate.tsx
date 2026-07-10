import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import css from './donate.module.css';
import {
  Button,
  Card,
  Chip,
  Input,
  Select,
  Checkbox,
  NumberStepper,
  ProgressBar,
  RadioCard,
  Banner,
  Icon,
  useToast,
} from '../components/ui';
import {
  useCreateDonation,
  useConfirmPayment,
  useEmergencies,
  useCampaigns,
  useCenters,
} from '../hooks/api';
import type { CreateDonationBody } from '../hooks/api';
import { useAuth } from '../store/auth';
import { useT } from '../lib/i18n';
import { formatSoles } from '../lib/format';
import { apiErrorMessage } from '../lib/api';
import type { DonationType, PaymentMethod } from '../lib/types';

type Step = 'type' | 'details' | 'destination' | 'payment' | 'donor' | 'confirm' | 'success';

const AMOUNT_PRESETS = [20, 50, 100, 200];

const PAY_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'YAPE', label: 'Yape' },
  { value: 'PLIN', label: 'Plin' },
  { value: 'CARD', label: 'Tarjeta' },
];

export default function Donate() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const createDonation = useCreateDonation();
  const confirmPayment = useConfirmPayment();
  const { data: emergencies } = useEmergencies({ status: 'ACTIVE' });
  const { data: campaigns } = useCampaigns({ status: 'ACTIVE' });
  const { data: centers } = useCenters();

  const [step, setStep] = useState<Step>('type');
  const [type, setType] = useState<DonationType | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [hours, setHours] = useState(2);
  const [description, setDescription] = useState('');
  const [destType, setDestType] = useState<'emergency' | 'campaign' | 'center'>('emergency');
  const [emergencyId, setEmergencyId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [centerId, setCenterId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('YAPE');
  const [anonymous, setAnonymous] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const selectedCampaign = campaigns?.find((c) => c.id === campaignId);

  // Build the ordered list of steps based on choices.
  const flow = useMemo<Step[]>(() => {
    const steps: Step[] = ['type', 'details', 'destination'];
    if (type === 'MONEY') steps.push('payment');
    if (!user) steps.push('donor');
    steps.push('confirm');
    return steps;
  }, [type, user]);

  const stepIndex = flow.indexOf(step);
  const progress = step === 'success' ? 100 : ((stepIndex + 1) / flow.length) * 100;

  function goNext() {
    setError('');
    const next = flow[stepIndex + 1];
    if (next) setStep(next);
  }
  function goBack() {
    setError('');
    if (step === 'success') {
      reset();
      return;
    }
    const prev = flow[stepIndex - 1];
    if (prev) setStep(prev);
  }

  function reset() {
    setStep('type');
    setType(null);
    setAmount('');
    setQuantity(1);
    setHours(2);
    setDescription('');
    setDestType('emergency');
    setEmergencyId('');
    setCampaignId('');
    setCenterId('');
    setPaymentMethod('YAPE');
    setAnonymous(false);
    setDonorName('');
    setDonorEmail('');
    setDonorPhone('');
    setCode('');
    setError('');
  }

  function chooseType(tp: DonationType) {
    setType(tp);
    setStep('details');
  }

  const detailsValid =
    type === 'MONEY'
      ? typeof amount === 'number' && amount > 0
      : type === 'GOODS'
        ? quantity > 0 && description.trim().length > 0
        : hours > 0 && donorPhone.trim().length >= 6;

  async function submit() {
    if (!type) return;
    setError('');
    const body: CreateDonationBody = {
      type,
      emergencyId: destType === 'emergency' && emergencyId ? emergencyId : undefined,
      campaignId: destType === 'campaign' && campaignId ? campaignId : undefined,
      centerId: destType === 'center' && centerId ? centerId : undefined,
      description: description || undefined,
      donorPhone: donorPhone || undefined,
      anonymous: !user ? anonymous : undefined,
      donorName: !user && !anonymous ? donorName || undefined : undefined,
      donorEmail: !user && !anonymous ? donorEmail || undefined : undefined,
    };
    if (type === 'MONEY') {
      body.amount = typeof amount === 'number' ? amount : 0;
      body.paymentMethod = paymentMethod;
    } else if (type === 'GOODS') {
      body.quantity = quantity;
      body.paymentMethod = 'IN_KIND';
    } else {
      body.quantity = hours;
      body.paymentMethod = 'IN_KIND';
    }

    try {
      const donation = await createDonation.mutateAsync(body);
      if (type === 'MONEY') {
        await confirmPayment.mutateAsync({ id: donation.id, reference: 'SIM' });
      }
      setCode(donation.code);
      setStep('success');
      toast.success(t('toast.donationDone'), { title: t('donate.successTitle') });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(code).then(
      () => toast.success(t('toast.copied')),
      () => undefined,
    );
  }

  const emergencyOptions = [
    { value: '', label: t('donate.anyWhereNeeded') },
    ...(emergencies ?? []).map((e) => ({ value: e.id, label: e.title })),
  ];
  const campaignOptions = [
    { value: '', label: t('donate.anyWhereNeeded') },
    ...(campaigns ?? []).map((c) => ({ value: c.id, label: c.title })),
  ];
  const centerOptions = [
    { value: '', label: t('donate.anyWhereNeeded') },
    ...(centers ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];

  function destinationLabel() {
    if (destType === 'campaign')
      return campaignOptions.find((o) => o.value === campaignId)?.label;
    if (destType === 'center')
      return centerOptions.find((o) => o.value === centerId)?.label;
    return emergencyOptions.find((o) => o.value === emergencyId)?.label;
  }

  const submitting = createDonation.isPending || confirmPayment.isPending;

  if (step === 'success') {
    return (
      <div className={`n-page ${css.wrap}`}>
        <div className={css.success}>
          <span className={css.successBadge}>
            <Icon name="checkCircle" size={52} />
          </span>
          <h1 className={css.successTitle}>{t('donate.successTitle')}</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: 380 }}>{t('donate.successSub')}</p>
          <div className={css.codeChip}>
            {code}
            <button type="button" className={css.codeCopy} onClick={copyCode} aria-label={t('common.copy')}>
              <Icon name="copy" size={18} />
            </button>
          </div>
          <div className={css.footerBtns} style={{ width: '100%', maxWidth: 360 }}>
            <Button block icon="pin" onClick={() => navigate(`/seguir/${code}`)}>
              {t('donate.trackThis')}
            </Button>
            <Button block variant="ghost" icon="heart" onClick={reset}>
              {t('donate.donateAgain')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`n-page ${css.wrap}`}>
      <div className={css.progressRow}>
        {stepIndex > 0 && (
          <button type="button" className={css.backBtn} onClick={goBack} aria-label={t('common.back')}>
            <Icon name="chevronLeft" size={22} />
          </button>
        )}
        <div style={{ flex: 1 }}>
          <ProgressBar value={progress} showPct={false} />
        </div>
        <span className={css.stepLabel}>
          {stepIndex + 1}/{flow.length}
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <Banner tone="error" title={t('common.error')}>
            {error}
          </Banner>
        </div>
      )}

      <Card className={css.stepCard}>
        {step === 'type' && (
          <>
            <h1 className={css.stepTitle}>{t('donate.chooseType')}</h1>
            <div className={css.radioStack}>
              <RadioCard
                icon="heart"
                title={t('donate.money')}
                desc={t('donate.moneyHint')}
                active={type === 'MONEY'}
                onClick={() => chooseType('MONEY')}
              />
              <RadioCard
                icon="gift"
                title={t('donate.goods')}
                desc={t('donate.goodsHint')}
                active={type === 'GOODS'}
                onClick={() => chooseType('GOODS')}
              />
              <RadioCard
                icon="spark"
                title={t('donate.voluntariado')}
                desc={t('donate.voluntariadoHint')}
                active={type === 'TIME'}
                onClick={() => chooseType('TIME')}
              />
            </div>
          </>
        )}

        {step === 'details' && type === 'MONEY' && (
          <>
            <h1 className={css.stepTitle}>{t('donate.amount')}</h1>
            <div className={css.chipRow}>
              {AMOUNT_PRESETS.map((p) => (
                <Chip key={p} active={amount === p} onClick={() => setAmount(p)}>
                  {formatSoles(p)}
                </Chip>
              ))}
            </div>
            <div className={css.field}>
              <Input
                label={t('donate.amount')}
                hint={t('common.optional')}
                type="number"
                inputMode="numeric"
                min={1}
                prefix="S/"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <Button block icon="arrowRight" iconRight="arrowRight" disabled={!detailsValid} onClick={goNext}>
              {t('common.continue')}
            </Button>
          </>
        )}

        {step === 'details' && type === 'GOODS' && (
          <>
            <h1 className={css.stepTitle}>{t('donate.goods')}</h1>
            <div className={css.field}>
              <NumberStepper label={t('donate.quantity')} value={quantity} min={1} max={999} onChange={setQuantity} />
            </div>
            <div className={css.field}>
              <Input
                label={t('donate.goods')}
                placeholder="Frazadas, agua, alimentos…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button block iconRight="arrowRight" disabled={!detailsValid} onClick={goNext}>
              {t('common.continue')}
            </Button>
          </>
        )}

        {step === 'details' && type === 'TIME' && (
          <>
            <h1 className={css.stepTitle}>{t('donate.voluntariado')}</h1>
            <Banner tone="info" title={t('donate.voluntariadoHint')}>
              Crea tu cuenta de voluntario para inscribirte a turnos y ganar tu Pasaporte de Impacto.
            </Banner>
            <div style={{ height: 'var(--sp-3)' }} />
            {!user && (
              <Button
                block
                variant="gold"
                icon="spark"
                onClick={() => navigate('/registro?role=VOLUNTEER')}
                style={{ marginBottom: 'var(--sp-4)' }}
              >
                Quiero ser voluntario
              </Button>
            )}
            <div className={css.field}>
              <NumberStepper label={t('vol.hours')} value={hours} min={1} max={40} onChange={setHours} />
            </div>
            <div className={css.field}>
              <Input
                label={t('donate.phone')}
                required
                type="tel"
                inputMode="tel"
                placeholder="987654321"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
                error={donorPhone && donorPhone.trim().length < 6 ? t('donate.phoneRequired') : undefined}
              />
            </div>
            <div className={css.field}>
              <Input
                label="¿En qué puedes ayudar?"
                placeholder="Logística, cocina, traslados…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button block iconRight="arrowRight" disabled={!detailsValid} onClick={goNext}>
              {t('common.continue')}
            </Button>
          </>
        )}

        {step === 'destination' && (
          <>
            <h1 className={css.stepTitle}>{t('donate.destination')}</h1>
            <div className={css.chipRow}>
              <Chip active={destType === 'emergency'} onClick={() => setDestType('emergency')}>
                {t('donate.destEmergency')}
              </Chip>
              <Chip active={destType === 'campaign'} onClick={() => setDestType('campaign')}>
                {t('donate.destCampaign')}
              </Chip>
              <Chip active={destType === 'center'} onClick={() => setDestType('center')}>
                {t('donate.destCenter')}
              </Chip>
            </div>
            <div className={css.field}>
              {destType === 'emergency' && (
                <Select
                  label={t('donate.destEmergency')}
                  options={emergencyOptions}
                  value={emergencyId}
                  onChange={(e) => setEmergencyId(e.target.value)}
                />
              )}
              {destType === 'campaign' && (
                <Select
                  label={t('donate.destCampaign')}
                  options={campaignOptions}
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                />
              )}
              {destType === 'center' && (
                <Select
                  label={t('donate.chooseCenter')}
                  options={centerOptions}
                  value={centerId}
                  onChange={(e) => setCenterId(e.target.value)}
                />
              )}
            </div>
            {destType === 'campaign' && type === 'MONEY' && selectedCampaign &&
              (selectedCampaign.yapeNumber || selectedCampaign.bankAccount) && (
                <Banner tone="info" title={t('donate.payInfo')}>
                  {selectedCampaign.yapeNumber && (
                    <div>{t('donate.yape')}: <strong>{selectedCampaign.yapeNumber}</strong></div>
                  )}
                  {selectedCampaign.bankAccount && (
                    <div>
                      {t('donate.account')}: <strong>{selectedCampaign.bankName} {selectedCampaign.bankAccount}</strong>
                    </div>
                  )}
                  {selectedCampaign.accountHolder && (
                    <div>{t('donate.holder')}: {selectedCampaign.accountHolder}</div>
                  )}
                </Banner>
              )}
            <div style={{ height: 'var(--sp-3)' }} />
            <Button block iconRight="arrowRight" onClick={goNext}>
              {t('common.continue')}
            </Button>
          </>
        )}

        {step === 'payment' && (
          <>
            <h1 className={css.stepTitle}>{t('donate.payment')}</h1>
            <div className={css.chipRow}>
              {PAY_OPTIONS.map((p) => (
                <Chip key={p.value} active={paymentMethod === p.value} onClick={() => setPaymentMethod(p.value)}>
                  {p.label}
                </Chip>
              ))}
            </div>
            <Button block iconRight="arrowRight" onClick={goNext}>
              {t('common.continue')}
            </Button>
          </>
        )}

        {step === 'donor' && (
          <>
            <h1 className={css.stepTitle}>{t('donate.yourData')}</h1>
            <div className={css.field}>
              <Checkbox checked={anonymous} onChange={setAnonymous}>
                {t('donate.anonymous')}
              </Checkbox>
            </div>
            {!anonymous && (
              <>
                <div className={css.field}>
                  <Input
                    label={t('donate.name')}
                    hint={t('common.optional')}
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                  />
                </div>
                <div className={css.field}>
                  <Input
                    label={t('donate.email')}
                    hint={t('common.optional')}
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                  />
                </div>
              </>
            )}
            <Button block iconRight="arrowRight" onClick={goNext}>
              {t('common.continue')}
            </Button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <h1 className={css.stepTitle}>{t('donate.review')}</h1>
            <div className={css.summary}>
              <div className={css.summaryRow}>
                <span className={css.summaryKey}>{t('donate.chooseType')}</span>
                <span className={css.summaryVal}>
                  {type === 'MONEY' ? t('donate.money') : type === 'GOODS' ? t('donate.goods') : t('donate.voluntariado')}
                </span>
              </div>
              {type === 'MONEY' && (
                <>
                  <div className={css.summaryRow}>
                    <span className={css.summaryKey}>{t('donate.amount')}</span>
                    <span className={`${css.summaryVal} ${css.summaryTotal}`}>
                      {formatSoles(typeof amount === 'number' ? amount : 0)}
                    </span>
                  </div>
                  <div className={css.summaryRow}>
                    <span className={css.summaryKey}>{t('donate.payment')}</span>
                    <span className={css.summaryVal}>
                      {PAY_OPTIONS.find((p) => p.value === paymentMethod)?.label}
                    </span>
                  </div>
                </>
              )}
              {type === 'GOODS' && (
                <div className={css.summaryRow}>
                  <span className={css.summaryKey}>{t('donate.quantity')}</span>
                  <span className={css.summaryVal}>
                    {quantity} · {description}
                  </span>
                </div>
              )}
              {type === 'TIME' && (
                <div className={css.summaryRow}>
                  <span className={css.summaryKey}>{t('vol.hours')}</span>
                  <span className={css.summaryVal}>
                    {hours} h · {description}
                  </span>
                </div>
              )}
              <div className={css.summaryRow}>
                <span className={css.summaryKey}>{t('donate.destination')}</span>
                <span className={css.summaryVal}>{destinationLabel()}</span>
              </div>
            </div>
            <div className={css.footerBtns}>
              <Button block size="lg" variant="gold" icon="heart" loading={submitting} onClick={submit}>
                {t('donate.confirm')}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
