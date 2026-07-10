import { Sheet, Button, EmptyState, CenteredSpinner } from './ui';
import s from './layout/layout.module.css';
import { useT } from '../lib/i18n';
import { useNotifications, useMarkAllRead, useMarkNotificationRead } from '../hooks/api';
import { relativeTime } from '../lib/format';

export function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { data, isLoading } = useNotifications(open);
  const markAll = useMarkAllRead();
  const markOne = useMarkNotificationRead();
  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <Sheet open={open} onClose={onClose} title={t('notif.title')} side="right">
      {unread > 0 && (
        <div style={{ marginBottom: 'var(--sp-3)' }}>
          <Button variant="subtle" size="sm" block onClick={() => markAll.mutate()} loading={markAll.isPending}>
            {t('notif.markAll')}
          </Button>
        </div>
      )}
      {isLoading ? (
        <CenteredSpinner />
      ) : items.length === 0 ? (
        <EmptyState icon="bell" title={t('notif.empty')} />
      ) : (
        <div>
          {items.map((n) => (
            <div
              key={n.id}
              className={`${s.notifItem} ${!n.read ? s.notifUnread : ''}`}
              onClick={() => !n.read && markOne.mutate(n.id)}
            >
              <div style={{ flex: 1 }}>
                <div className={s.notifTitle}>{n.title}</div>
                {n.body && <div className={s.notifBody}>{n.body}</div>}
                <div className={s.notifTime}>{relativeTime(n.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
