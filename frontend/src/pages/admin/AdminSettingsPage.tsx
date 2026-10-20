import { useTerms } from '../../hooks/useTerms';
import {
  brandIconNames,
  siteSettingsSchema,
  settingsPatchSchema,
  type SiteSettings,
} from '@study-tracker/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import BackupPanel, {
  type MaintenanceAction,
} from '../../components/admin/BackupPanel';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import TerminologyPresetPicker from '../../components/settings/TerminologyPresetPicker';
import NotificationChannelStatus from '../../components/admin/NotificationChannelStatus';
import PageHeader from '../../components/common/PageHeader';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { backupAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';

const sections = [
  ['general', 'Genel'],
  ['security', 'Güvenlik'],
  ['appearance', 'Görünüm'],
  ['terminology', 'Kelimeler'],
  ['notifications', 'Bildirimler'],
  ['backup', 'Yedekleme ve sıfırlama'],
] as const;
type Section = (typeof sections)[number][0];
function SettingsForm({
  initial,
  onReset,
}: {
  initial: SiteSettings;
  onReset: () => Promise<void>;
}) {
  const { adminSettings, updateSettings, isLoading } = useSettingsStore();
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [section, setSection] = useState<Section>('general');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [action, setAction] = useState<MaintenanceAction | null>(null);
  const prefix = useId();
  const mounted = useRef(true);
  const epoch = useRef(useAuthStore.getState().epoch);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = () =>
    mounted.current &&
    epoch.current === useAuthStore.getState().epoch &&
    useAuthStore.getState().user?.role === 'admin';
  const mutation = useAccountMutation([]);
  const client = useQueryClient();
  const keys = useAccountQueryKeys();
  const dirty = (Object.keys(draft) as (keyof SiteSettings)[]).some(
    (key) => draft[key] !== baseline[key],
  );
  useEffect(() => {
    if (!dirty && !mutation.isPending && adminSettings) {
      setDraft(adminSettings);
      setBaseline(adminSettings);
    }
  }, [adminSettings, dirty, mutation.isPending]);
  const busy = mutation.isPending || isLoading;
  const resetDraft = (settings: SiteSettings) => {
    setDraft(settings);
    setBaseline(settings);
    setErrors({});
    mutation.clearError();
  };
  const field = (
    name: keyof SiteSettings,
    label: string,
    control: ReactNode,
  ) => (
    <div>
      <label
        htmlFor={`${prefix}-${name}`}
        className="mb-2 block text-sm font-medium"
      >
        {label}
      </label>
      {control}
      {errors[name] && (
        <p id={`${prefix}-${name}-error`} className="mt-1 text-sm text-red-600">
          {errors[name]}
        </p>
      )}
    </div>
  );
  const input = (name: keyof SiteSettings, label: string, type = 'text') =>
    field(
      name,
      label,
      <input
        id={`${prefix}-${name}`}
        className="input"
        type={type}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `${prefix}-${name}-error` : undefined}
        value={String(draft[name] ?? '')}
        onChange={(event) =>
          setDraft({
            ...draft,
            [name]:
              type === 'number'
                ? Number(event.target.value)
                : event.target.value,
          })
        }
      />,
    );
  const toggle = (
    name:
      | 'allowRegistration'
      | 'maintenanceMode'
      | 'emailNotifications'
      | 'pushNotifications',
    label: string,
    description: string,
  ) => (
    <label className="flex items-start gap-3 rounded-lg border border-[var(--line)] p-4">
      <input
        className="mt-1"
        type="checkbox"
        checked={draft[name]}
        onChange={(event) =>
          setDraft({ ...draft, [name]: event.target.checked })
        }
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-1 block text-sm text-[var(--muted)]">
          {description}
        </span>
      </span>
    </label>
  );
  const save = async () => {
    if (!dirty || busy || !current()) return;
    const result = siteSettingsSchema.safeParse(draft);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [
            String(issue.path[0]),
            'Geçerli bir değer girin.',
          ]),
        ),
      );
      return;
    }
    const patch = settingsPatchSchema.parse(
      Object.fromEntries(
        (Object.keys(result.data) as (keyof SiteSettings)[])
          .filter((key) => result.data[key] !== baseline[key])
          .map((key) => [key, result.data[key]]),
      ),
    );
    if (Object.keys(patch).length === 0) {
      resetDraft(result.data);
      return;
    }
    setErrors({});
    const saved = await mutation.save(
      () => updateSettings(patch),
      'Site ayarları kaydedildi ve uygulandı.',
    );
    const confirmed = useSettingsStore.getState().adminSettings;
    if (saved && current() && confirmed) resetDraft(confirmed);
  };
  const confirm = async () => {
    if (!action || dirty || !current()) return false;
    const saved = await mutation.save(
      () =>
        action.kind === 'restore'
          ? backupAPI.restoreBackup(action.backup.id)
          : backupAPI.resetData(action.mode),
      action.kind === 'restore'
        ? 'Yedek geri yüklendi. Yeniden giriş yapın.'
        : 'Seçilen veriler sıfırlandı; güvenlik yedeği saklandı.',
    );
    if (!saved || !current()) return false;
    if (action.kind === 'restore') {
      useAuthStore.getState().logout();
      return true;
    }
    await client.invalidateQueries({ queryKey: keys.resource() });
    if (current()) await onReset();
    return true;
  };
  const t = useTerms();
  const message =
    action?.kind === 'restore'
      ? 'Mevcut verinin güvenlik yedeği alınacak. Seçilen yedekteki hesaplar, parolalar, ayarlar ve çalışma verileri geri gelecek; sonradan yapılan değişiklikler yerini yedekteki verilere bırakacak. Bütün oturumlar kapanacak ve yeniden giriş gerekecek.'
      : action?.kind === 'reset' && action.mode === 'all'
        ? `Kullanıcı hesapları, bütün ${t.course({ plural: true })}, ${t.topic({ plural: true })}, planlar, ${t.session({ plural: true })}, ölçülen çalışma geçmişi, ${t.topic()} ilerlemeleri ve site ayarları silinecek. Yönetici hesapları ve yedekler korunacak. Önce güvenlik yedeği alınır; geri dönüş yedeği geri yüklemeyi gerektirir.`
        : `Yalnızca site ayarları varsayılanlara dönecek. Hesaplar, ${t.course({ plural: true })}, ${t.topic({ plural: true })} ve çalışma geçmişi korunacak. Önce güvenlik yedeği alınır.`;
  return (
    <>
      <nav
        aria-label="Site ayarı bölümleri"
        className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-4"
      >
        {sections.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={section === id ? 'page' : undefined}
            className={`btn ${section === id ? 'btn-primary' : 'btn-secondary'}`}
            disabled={busy}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="panel space-y-6 p-5 sm:p-6"
        aria-label="Site ayarları formu"
        aria-busy={busy}
      >
        <fieldset
          disabled={busy || !!action}
          className="space-y-5 disabled:opacity-60"
        >
          {section === 'general' && (
            <>
              <h2 className="text-base font-medium">Site kimliği</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {input('siteName', 'Site adı')}
                {input('siteUrl', 'Site URL', 'url')}
              </div>
              {field(
                'siteDescription',
                'Site açıklaması',
                <textarea
                  id={`${prefix}-siteDescription`}
                  className="input"
                  rows={3}
                  value={draft.siteDescription}
                  aria-invalid={!!errors.siteDescription}
                  aria-describedby={
                    errors.siteDescription
                      ? `${prefix}-siteDescription-error`
                      : undefined
                  }
                  onChange={(event) =>
                    setDraft({ ...draft, siteDescription: event.target.value })
                  }
                />,
              )}
              {input('adminEmail', 'Yönetici iletişim e-postası', 'email')}
              <p className="text-xs text-[var(--muted)]">
                Site adı bütün görünen marka alanlarına uygulanır. Site URL
                alanı hosting adresinizi veya alan adınızı değiştirmez.
              </p>
            </>
          )}
          {section === 'security' && (
            <>
              <h2 className="text-base font-medium">Erişim kuralları</h2>
              {toggle(
                'allowRegistration',
                'Yeni kayıtlara izin ver',
                'Kapatıldığında yeni kullanıcı kaydı sunucuda reddedilir.',
              )}
              {toggle(
                'maintenanceMode',
                'Bakım modu',
                'Yalnızca yöneticiler giriş yapabilir ve korunan alanlara erişebilir.',
              )}
              {input(
                'sessionTimeout',
                'Boşta oturum süresi (dakika)',
                'number',
              )}
              <p className="text-xs text-[var(--muted)]">
                1–1440 dakika. Etkin alt sınır erişim anahtarının ömrüdür (en
                fazla 15 dakika); süre yenileme sırasında denetlenir.
              </p>
            </>
          )}
          {section === 'notifications' && (
            <>
              <h2 className="text-base font-medium">Bildirim kanalları</h2>
              <p className="text-sm text-[var(--muted)]">
                Kullanıcılar hatırlatma ve özetleri kendileri seçer; burada kapatılan kanal kimseye sunulmaz.
              </p>
              {toggle('emailNotifications', 'E-posta bildirimleri', 'Seans hatırlatmaları, sabah planı ve haftalık özet e-postaları.')}
              {toggle('pushNotifications', 'Tarayıcı bildirimleri', 'Sekme kapalıyken de gelen seans hatırlatmaları.')}
              <NotificationChannelStatus />
            </>
          )}
          {section === 'appearance' && (
            <>
              <h2 className="text-base font-medium">Marka görünümü</h2>
              {input('siteLogo', 'Logo URL', 'url')}
              {field(
                'siteIcon',
                'Site ikonu veya ikon URL',
                <input
                  id={`${prefix}-siteIcon`}
                  className="input"
                  list={`${prefix}-icons`}
                  value={draft.siteIcon ?? ''}
                  aria-invalid={!!errors.siteIcon}
                  aria-describedby={
                    errors.siteIcon ? `${prefix}-siteIcon-error` : undefined
                  }
                  onChange={(event) =>
                    setDraft({ ...draft, siteIcon: event.target.value })
                  }
                />,
              )}
              <datalist id={`${prefix}-icons`}>
                {brandIconNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <p className="text-xs text-[var(--muted)]">
                Yerleşik ikon adlarından birini veya HTTP(S) görsel adresini
                kullanın. Logo URL boşsa site ikonu gösterilir.
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                {input('primaryColor', 'Ana renk (HEX)')}
              </div>
            </>
          )}
          {section === 'terminology' && (
            <>
              <h2 className="text-base font-medium">Kelime seti</h2>
              <p className="text-sm text-[var(--muted)]">
                Arayüzdeki ana kavramların adı seçtiğiniz sete göre değişir. Kayıtlı veriler ve
                yetkiler etkilenmez; yalnızca görünen kelimeler değişir.
              </p>
              <TerminologyPresetPicker
                name={`${prefix}-terminologyPreset`}
                value={draft.terminologyPreset}
                onChange={(terminologyPreset) => {
                  if (terminologyPreset) setDraft({ ...draft, terminologyPreset });
                }}
              />
            </>
          )}
          {section === 'backup' && (
            <>
              <h2 className="text-base font-medium">Otomatik yedekleme</h2>
              {field(
                'backup_interval',
                'Otomatik yedekleme aralığı',
                <select
                  id={`${prefix}-backup_interval`}
                  className="input"
                  value={draft.backup_interval}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      backup_interval: event.target
                        .value as SiteSettings['backup_interval'],
                    })
                  }
                >
                  <option value="1">Her gün</option>
                  <option value="5">5 günde bir</option>
                  <option value="7">7 günde bir</option>
                </select>,
              )}
              <p className="text-sm text-[var(--muted)]">
                Son başarılı otomatik yedekten itibaren seçilen süre dolduğunda
                yeni yedek alınır. Sistem her 5 dakikada bir kontrol eder.
              </p>
            </>
          )}
        </fieldset>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm text-red-600">
            Geçersiz alanlar:{' '}
            {Object.keys(errors)
              .map(
                (key) =>
                  ({
                    siteName: 'Site adı',
                    siteUrl: 'Site URL',
                    siteDescription: 'Site açıklaması',
                    adminEmail: 'Yönetici e-postası',
                    sessionTimeout: 'Oturum süresi',
                    primaryColor: 'Ana renk',
                    secondaryColor: 'İkincil renk',
                    siteLogo: 'Logo URL',
                    siteIcon: 'Site ikonu',
                  })[key] ?? key,
              )
              .join(', ')}
            . İlgili bölümdeki değerleri kontrol edin.
          </p>
        )}
        {!action && mutation.errorMessage && (
          <p role="alert" className="text-sm text-red-600">
            {mutation.errorMessage}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <p className="text-sm text-[var(--muted)]" role="status">
            {mutation.isPending
              ? 'İşlem sürüyor…'
              : dirty
                ? 'Kaydedilmemiş değişiklikler var.'
                : 'Kaydedilmemiş değişiklik yok.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || !dirty}
              onClick={() => resetDraft(adminSettings ?? baseline)}
            >
              Değişikliklerden vazgeç
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !dirty}
            >
              {mutation.isPending ? 'Bekleniyor…' : 'Değişiklikleri kaydet'}
            </button>
          </div>
        </div>
      </form>
      {section === 'backup' && (
        <div className="panel p-5 sm:p-6">
          <BackupPanel
            busy={busy || !!action}
            dirty={dirty}
            onAction={(next) => {
              mutation.clearError();
              setAction(next);
            }}
            onCreate={() => {
              if (!current()) return;
              void mutation
                .save(
                  () => backupAPI.createBackup(),
                  'Yedek doğrulandı ve sunucuda saklandı.',
                )
                .then((saved) => {
                  if (saved && current())
                    void client.invalidateQueries({
                      queryKey: keys.resource('backups'),
                    });
                });
            }}
          />
        </div>
      )}
      {action && (
        <ConfirmDialog
          isOpen
          title={
            action.kind === 'restore'
              ? `Yedeği geri yükle (#${action.backup.id})`
              : action.mode === 'all'
                ? 'Kullanıcı ve çalışma verilerini temizle'
                : 'Site ayarlarını sıfırla'
          }
          message={message}
          type="danger"
          confirmText={
            action.kind === 'restore'
              ? 'Yedeği geri yükle'
              : 'Sıfırlamayı uygula'
          }
          onClose={() => setAction(null)}
          onConfirm={confirm}
        >
          {mutation.errorMessage && (
            <p role="alert" className="text-sm text-red-600">
              {mutation.errorMessage}
            </p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
function SettingsWorkspace() {
  const {
    adminSettings,
    fetchAdminSettings,
    error,
    isLoading,
    clearAdminSettings,
  } = useSettingsStore();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    void fetchAdminSettings();
  }, [fetchAdminSettings]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Site ayarları"
        description="Site kimliğini, erişim kurallarını ve yedeklemeyi yönetin."
      />
      {error && (
        <div
          role="alert"
          className="panel flex flex-wrap items-center gap-3 p-4"
        >
          <p>{error}</p>
          <button
            className="btn btn-secondary"
            disabled={isLoading}
            onClick={() => void fetchAdminSettings()}
          >
            Ayarları tekrar yükle
          </button>
        </div>
      )}
      {adminSettings ? (
        <SettingsForm
          key={version}
          initial={adminSettings}
          onReset={async () => {
            clearAdminSettings();
            setVersion((value) => value + 1);
            await fetchAdminSettings();
          }}
        />
      ) : (
        !error && <p role="status">Yönetim ayarları yükleniyor…</p>
      )}
    </div>
  );
}
export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <SettingsWorkspace /> : null;
}
