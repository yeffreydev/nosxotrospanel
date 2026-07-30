import { useState } from 'react';
import {
  Banner,
  Button,
  Chip,
  Input,
  SegmentedControl,
} from './ui';
import { useT } from '../lib/i18n';
import { apiErrorMessage } from '../lib/api';
import { TIME_PRESETS, WEEKDAYS, describeWeekdays, formatDate, todayISO } from '../lib/format';
import type { VolunteerScheduleBody, VolunteerScheduleRow } from '../hooks/api';

/**
 * Editor de disponibilidad de un voluntario: "¿qué días y a qué horas puedes venir?".
 *
 * Se declara por días fijos de la semana (el caso normal: "martes y jueves por la
 * mañana") o por un día suelto. Los días son chips y las horas tienen franjas
 * hechas, así que se llena de un par de toques en el móvil sin escribir horas.
 *
 * Lo usan las dos caras de lo mismo: el voluntario para su propio horario y el
 * organizador para apuntar el de alguien que se lo dijo por teléfono.
 */
export function AvailabilityEditor({
  schedules,
  onAdd,
  onDelete,
  adding,
  deleting,
  campaignId,
}: {
  schedules: VolunteerScheduleRow[];
  onAdd: (body: VolunteerScheduleBody) => Promise<unknown>;
  onDelete: (scheduleId: string) => void;
  adding?: boolean;
  deleting?: boolean;
  campaignId?: string;
}) {
  const t = useT();
  const [mode, setMode] = useState<'weekly' | 'once'>('weekly');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('13:00');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const toggleDay = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const valid = endTime > startTime && (mode === 'once' ? !!date : weekdays.length > 0);

  const submit = async () => {
    setError('');
    try {
      await onAdd({
        startTime,
        endTime,
        // El día se manda tal cual (YYYY-MM-DD): es un día del calendario, no un
        // instante, y convertirlo a ISO lo corría de día según la zona horaria.
        ...(mode === 'once' ? { date } : { weekdays }),
        note: note.trim() || undefined,
        campaignId,
      });
      setNote('');
      if (mode === 'weekly') setWeekdays([]);
    } catch (e) {
      setError(apiErrorMessage(e));
    }
  };

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-3)' }}>
      {error && <Banner tone="error">{error}</Banner>}

      <SegmentedControl
        value={mode}
        onChange={(v) => setMode(v as 'weekly' | 'once')}
        options={[
          { value: 'weekly', label: 'Días fijos' },
          { value: 'once', label: 'Un día' },
        ]}
      />

      {mode === 'weekly' ? (
        <div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>
            ¿Qué días de la semana puedes venir?
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {WEEKDAYS.map((d) => (
              <Chip key={d.value} active={weekdays.includes(d.value)} onClick={() => toggleDay(d.value)}>
                {d.short}
              </Chip>
            ))}
            <Chip
              active={weekdays.length === 7}
              onClick={() => setWeekdays(weekdays.length === 7 ? [] : WEEKDAYS.map((d) => d.value))}
            >
              Todos
            </Chip>
          </div>
          {weekdays.length > 0 && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: 6 }}>
              {describeWeekdays(weekdays)} · {startTime}–{endTime}
            </div>
          )}
        </div>
      ) : (
        <Input label={t('common.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      )}

      <div>
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 6 }}>Horario</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          {TIME_PRESETS.map((p) => (
            <Chip
              key={p.label}
              active={startTime === p.startTime && endTime === p.endTime}
              onClick={() => { setStartTime(p.startTime); setEndTime(p.endTime); }}
            >
              {p.label}
            </Chip>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <Input label={t('shift.start')} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <Input
            label={t('shift.end')}
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            error={endTime <= startTime ? 'Debe ser posterior al inicio' : undefined}
          />
        </div>
      </div>

      <Input
        label={t('common.note')}
        hint={t('common.optional')}
        placeholder="Puedo manejar la camioneta"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <Button icon="plus" disabled={!valid} loading={adding} onClick={submit}>
        {t('common.add')}
      </Button>

      {schedules.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
            Disponibilidad registrada
          </div>
          {schedules.map((s) => (
            <div
              key={s.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', padding: '2px 0' }}
            >
              <span>
                {s.date ? formatDate(s.date) : describeWeekdays(s.weekdays) || 'Sin días'} · {s.startTime}–{s.endTime}
              </span>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {s.note ?? ''}
                <Button
                  size="sm"
                  variant="ghost"
                  icon="close"
                  aria-label={t('common.delete')}
                  loading={deleting}
                  onClick={() => onDelete(s.id)}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
