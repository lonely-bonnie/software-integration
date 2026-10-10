import { createContext, useContext } from 'react';
import messages from '../shared/english.json';
import type { Language, Settings } from './types';

export function makeI18n(language: Language, timeZone: Settings['timeZone']) {
  const t = (key: string, values: Record<string, string | number> = {}) => {
    let value = language === 'en' ? (messages as Record<string, string>)[key] || key : key;
    if (language === 'en') {
      value = value
        .replace(/服务返回 HTTP (\d+)/g, 'Service returned HTTP $1')
        .replace(/接口限流，等待重试/g, 'Rate limited; waiting to retry');
    }
    return value.replace(/\{(\w+)\}/g, (match, name) => String(values[name] ?? match));
  };
  const timeLabel = (timestamp: number | null) =>
    timestamp
      ? new Intl.DateTimeFormat(language, {
          timeZone: timeZone === 'local' ? undefined : timeZone,
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(timestamp)
      : t('尚无采样');
  const duration = (minutes: number | null) =>
    minutes === null
      ? t('额度窗口')
      : minutes >= 1440
        ? t('{0} 天窗口', { 0: +(minutes / 1440).toFixed(1) })
        : minutes >= 60
          ? t('{0} 小时窗口', { 0: +(minutes / 60).toFixed(1) })
          : t('{0} 分钟窗口', { 0: minutes });
  const countdown = (timestamp: number | null, now: number) => {
    if (!timestamp) return t('时间不可用');
    const seconds = Math.max(0, Math.floor((timestamp - now) / 1000));
    if (!seconds) return t('等待服务端确认重置');
    const days = Math.floor(seconds / 86400),
      hours = Math.floor((seconds % 86400) / 3600),
      mins = Math.floor((seconds % 3600) / 60);
    return language === 'en'
      ? `${days ? `${days}d ` : ''}${hours}h ${mins}m`
      : `${days ? `${days} 天 ` : ''}${hours} 小时 ${mins} 分`;
  };
  return { t, timeLabel, duration, countdown, language, timeZone };
}
export const I18nContext = createContext(makeI18n('zh-CN', 'local'));
export const useI18n = () => useContext(I18nContext);
