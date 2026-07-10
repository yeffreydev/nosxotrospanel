import { useCallback, useEffect, useState } from 'react';

// Evento no estándar de Chromium para instalar la PWA.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferred: BeforeInstallPromptEvent | null = null;

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ se reporta como Mac con touch
  const isIPadOS = /macintosh/i.test(ua) && 'ontouchend' in document;
  return isIDevice || isIPadOS;
}

/**
 * Maneja el ciclo de instalación de la PWA:
 *  - `canInstall`  → hay prompt nativo disponible (Android/desktop Chromium).
 *  - `promptInstall()` → dispara el diálogo nativo, devuelve true si aceptó.
 *  - `isIOS`       → mostrar instrucciones manuales (iOS no soporta el prompt).
 *  - `installed`   → ya corre como app instalada (standalone).
 */
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(!!deferred);
  const [installed, setInstalled] = useState<boolean>(detectStandalone());
  const isIOS = detectIOS();

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferred = null;
      setCanInstall(false);
      setInstalled(true);
    };
    const mq = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = () => setInstalled(detectStandalone());

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    mq.addEventListener?.('change', onDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      deferred = null;
      setCanInstall(false);
      return true;
    }
    return false;
  }, []);

  return { canInstall, installed, isIOS, promptInstall };
}
