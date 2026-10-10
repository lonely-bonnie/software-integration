import { useEffect, useState } from 'react';
import { Download, FolderOpen, Info, Languages, RotateCcw, Upload } from 'lucide-react';
import { bridge, defaultSettings, isPreview } from '../bridge';
import { useI18n } from '../i18n';
import type { AppInfo, Settings } from '../types';
import brand from '../../shared/brand.json';
import manifest from '../../package.json';

interface Props {
  draft: Settings;
  settings: Settings;
  setDraft: (value: Settings) => void;
  onError: (value: string) => void;
  onNotice: (value: string) => void;
}
export function GeneralSettings({ draft, settings, setDraft, onError, onNotice }: Props) {
  const { t } = useI18n();
  const [info, setInfo] = useState<AppInfo | null>(null);
  useEffect(() => {
    void bridge
      .getInfo()
      .then(setInfo)
      .catch(() => onError('读取软件信息失败'));
  }, []);
  const action = async (job: () => Promise<unknown>) => {
    try {
      await job();
    } catch (e) {
      onError(e instanceof Error ? e.message : '操作失败，请稍后重试');
    }
  };
  return (
    <>
      <section className="panel settings-panel general-settings">
        <h2>
          <Languages size={19} />
          {t('通用设置')}
        </h2>
        <p className="settings-note">{t('语言与外观可立即预览，保存后生效。')}</p>
        <div className="form-row">
          <label>
            {t('界面语言')}
            <select
              aria-label={t('界面语言')}
              value={draft.language}
              onChange={(e) =>
                setDraft({ ...draft, language: e.target.value as Settings['language'] })
              }
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            {t('显示时区')}
            <select
              value={draft.timeZone}
              onChange={(e) =>
                setDraft({ ...draft, timeZone: e.target.value as Settings['timeZone'] })
              }
            >
              <option value="local">{t('跟随系统')}</option>
              <option value="Asia/Shanghai">{t('北京时间')}</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.launchAtLogin}
            disabled={!info?.startupAvailable}
            onChange={(e) => setDraft({ ...draft, launchAtLogin: e.target.checked })}
          />
          <span>
            {t('登录 Windows 后启动')}
            <small>{t('仅安装版支持，可随时关闭。')}</small>
          </span>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.startMinimized}
            disabled={isPreview}
            onChange={(e) => setDraft({ ...draft, startMinimized: e.target.checked })}
          />
          <span>
            {t('启动时收起到托盘')}
            <small>{t('双击托盘图标可打开窗口。')}</small>
          </span>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.reduceMotion}
            onChange={(e) => setDraft({ ...draft, reduceMotion: e.target.checked })}
          />
          <span>
            {t('减少界面动画')}
            <small>{t('同时尊重系统的减少动态效果偏好。')}</small>
          </span>
        </label>
      </section>
      <section className="panel settings-panel">
        <h2>
          <Info size={19} />
          {t('关于与配置管理')}
        </h2>
        <div className="about-brand">
          <strong>{brand.name}</strong>
          <span>
            v{manifest.version} · Windows x64 · {t('测试版')}
          </span>
        </div>
        {info?.configurationWarning && (
          <p role="alert" className="message error">
            {t(info.configurationWarning)}
          </p>
        )}
        <p className="settings-note">{t('向星辰大海，连接你的工作世界。')}</p>
        <p className="settings-detail">
          {t(
            '导出已保存的偏好与网站入口，不包含 Token、Droplet ID 或本机 Codex 路径。导入后可检查并保存。',
          )}
        </p>
        <div className="settings-actions">
          <button
            className="secondary-button"
            disabled={isPreview}
            onClick={() =>
              void action(async () => {
                if (await bridge.exportSettings()) onNotice('配置已导出');
              })
            }
          >
            <Download size={14} />
            {t('导出配置')}
          </button>
          <button
            className="secondary-button"
            disabled={isPreview}
            onClick={() =>
              void action(async () => {
                const next = await bridge.importSettings();
                if (next) {
                  setDraft(next);
                  onNotice('配置已导入预览，请检查后保存');
                }
              })
            }
          >
            <Upload size={14} />
            {t('导入配置')}
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              setDraft({
                ...structuredClone(defaultSettings),
                digitalOcean: { ...settings.digitalOcean },
                codexPath: settings.codexPath,
              });
              onNotice('默认偏好已载入预览，保存后生效；连接配置保留');
            }}
          >
            <RotateCcw size={14} />
            {t('恢复默认偏好')}
          </button>
        </div>
        <div className="settings-actions">
          <button
            className="text-button"
            onClick={() => void action(() => bridge.openSupport('releases'))}
          >
            {t('查看新版与下载')}
          </button>
          <button
            className="text-button"
            onClick={() => void action(() => bridge.openSupport('issues'))}
          >
            {t('反馈问题')}
          </button>
          <button
            className="text-button"
            disabled={isPreview}
            onClick={() => void action(() => bridge.openSupport('data'))}
          >
            <FolderOpen size={14} />
            {t('打开数据目录')}
          </button>
        </div>
        <p className="settings-detail">
          {t(
            '设置保存在当前 Windows 用户的应用数据目录；升级与普通卸载保留配置。Token 使用 Windows 加密，不能直接复制给其他电脑。',
          )}
        </p>
      </section>
    </>
  );
}
