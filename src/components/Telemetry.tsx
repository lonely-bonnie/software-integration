import { Activity, Cpu, Radio } from 'lucide-react';
import { useI18n } from '../i18n';
import type { Bucket, Point, Status } from '../types';

const statusLabels: Record<Status, string> = {
  ready: '已连接',
  demo: '演示数据',
  unconfigured: '等待配置',
  unavailable: '暂无数据',
  stale: '数据过期',
  error: '连接失败',
  disabled: '已停用',
};
export function StatusMark({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <span className={`status status-${status}`}>
      <i />
      {t(statusLabels[status])}
    </span>
  );
}
export function Sparkline({
  inbound = [],
  outbound = [],
}: {
  inbound?: Point[];
  outbound?: Point[];
}) {
  const { t, language, timeZone } = useI18n();
  const all = [...inbound, ...outbound];
  if (!all.length)
    return (
      <div className="chart-empty">
        <Activity size={28} />
        <span>{t('连接后显示最近 30 分钟流量')}</span>
        <small>{t('缺失数据不会填为零')}</small>
      </div>
    );
  const max = Math.max(1, ...all.map((x) => x.mbps)) * 1.18,
    start = Math.min(...all.map((x) => x.timestamp)),
    end = Math.max(start + 1, ...all.map((x) => x.timestamp));
  const points = (data: Point[]) =>
    data
      .map(
        (p) =>
          `${52 + ((p.timestamp - start) / (end - start)) * 668},${142 - (p.mbps / max) * 110}`,
      )
      .join(' ');
  return (
    <div className="chart">
      <svg
        viewBox="0 0 760 184"
        role="img"
        aria-label={t('最近三十分钟公网入站与出站速率，单位 Mbps')}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--green)" stopOpacity=".19" />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1="52"
              x2="720"
              y1={142 - v * 110}
              y2={142 - v * 110}
              stroke="var(--line)"
              strokeDasharray="3 7"
            />
            <text x="4" y={146 - v * 110}>
              {(max * v).toFixed(0)}
            </text>
          </g>
        ))}
        <text x="3" y="18">
          Mbps
        </text>
        {outbound.length > 1 && (
          <polygon points={`52,142 ${points(outbound)} 720,142`} fill="url(#chart-fill)" />
        )}
        <polyline points={points(outbound)} stroke="var(--green)" strokeWidth="2.5" fill="none" />
        <polyline
          points={points(inbound)}
          stroke="var(--blue)"
          strokeWidth="2"
          strokeDasharray="6 4"
          fill="none"
        />
        <text x="52" y="175">
          {new Date(start).toLocaleTimeString(language, {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timeZone === 'local' ? undefined : timeZone,
          })}
        </text>
        <text x="720" y="175" textAnchor="end">
          {new Date(end).toLocaleTimeString(language, {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timeZone === 'local' ? undefined : timeZone,
          })}
        </text>
      </svg>
      <div className="chart-legend">
        <span>
          <i className="blue-line" />
          {t('入站')}
        </span>
        <span>
          <i />
          {t('出站')}
        </span>
        <span>
          {t('采样时间')} ·{' '}
          {timeZone === 'local'
            ? t('跟随系统')
            : timeZone === 'Asia/Shanghai'
              ? t('北京时间')
              : 'UTC'}
        </span>
      </div>
    </div>
  );
}
export function QuotaWindow({
  bucket,
  now,
  stale,
}: {
  bucket: Bucket;
  now: number;
  stale: boolean;
}) {
  const { t, duration, countdown, timeLabel } = useI18n();
  return (
    <div className="quota-window">
      <div className="quota-top">
        <span>{duration(bucket.windowDurationMins)}</span>
        <span className="bucket-name">{t(bucket.name)}</span>
      </div>
      <div className="quota-value">
        <strong>
          {bucket.remainingPercent.toFixed(0)}
          <small>%</small>
        </strong>
        <span>{t('剩余额度')}</span>
      </div>
      <div
        className="quota-track"
        role="progressbar"
        aria-label={t('{0} {1}剩余额度', {
          0: t(bucket.name),
          1: duration(bucket.windowDurationMins),
        })}
        aria-valuenow={bucket.remainingPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${bucket.remainingPercent}%` }} />
      </div>
      <div className="reset">
        <Radio size={13} />
        <span>{stale ? t('旧快照，重置待确认') : countdown(bucket.resetsAt, now)}</span>
      </div>
      <small className="reset-absolute">
        {bucket.resetsAt
          ? t('重置于 {0}', { 0: timeLabel(bucket.resetsAt) })
          : t('服务未提供重置时间')}
      </small>
    </div>
  );
}
