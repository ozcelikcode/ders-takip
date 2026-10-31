import { useTerms } from '../../hooks/useTerms';
import {
  brandIconNames,
  customTerminologyFrom,
  languages,
  siteSettingsSchema,
  settingsPatchSchema,
  type SiteSettings,
} from '@study-tracker/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackupPanel, {
  type MaintenanceAction,
} from '../../components/admin/BackupPanel';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AdminPasswordField from '../../components/admin/AdminPasswordField';
import AuditLogPanel from '../../components/admin/AuditLogPanel';
import CustomTerminologyEditor from '../../components/settings/CustomTerminologyEditor';
import TerminologyPresetPicker from '../../components/settings/TerminologyPresetPicker';
import NotificationChannelStatus from '../../components/admin/NotificationChannelStatus';
import PageHeader from '../../components/common/PageHeader';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { backupAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useText } from '../../store/languageStore';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';

// Custom words are an object; compare settings by value, not identity.
const sameSetting = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

const sections = ['general', 'security', 'appearance', 'terminology', 'notifications', 'backup', 'audit'] as const;
type Section = (typeof sections)[number];
const isSection = (value: string | null): value is Section => sections.some((id) => id === value);
function SettingsForm({
  initial,
  onReset,
}: {
  initial: SiteSettings;
  onReset: () => Promise<void>;
}) {
  const text = useText().siteSettings;
  const { adminSettings, updateSettings, isLoading } = useSettingsStore();
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  // The open section lives in the address (`?section=backup`), so a link or the page switcher can open it directly.
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const section: Section = isSection(requested) ? requested : 'general';
  const setSection = (id: Section) => setParams(id === 'general' ? {} : { section: id }, { replace: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [action, setAction] = useState<MaintenanceAction | null>(null);
  // Restoring and resetting are confirmed with the administrator's password.
  const [confirmation, setConfirmation] = useState({ password: '', missing: false });
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
  const customInLanguage = draft.customTerminology?.language === draft.language;
  const dirty = (Object.keys(draft) as (keyof SiteSettings)[]).some(
    (key) => !sameSetting(draft[key], baseline[key]),
  );
  useUnsavedChangesWarning(dirty);
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
    <label className="flex items-start gap-3 rounded-lg border border-(--line) p-4">
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
        <span className="mt-1 block text-sm text-(--muted)">
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
            text.invalidValue,
          ]),
        ),
      );
      return;
    }
    const patch = settingsPatchSchema.parse(
      Object.fromEntries(
        (Object.keys(result.data) as (keyof SiteSettings)[])
          .filter((key) => !sameSetting(result.data[key], baseline[key]))
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
      text.saved,
    );
    const confirmed = useSettingsStore.getState().adminSettings;
    if (saved && current() && confirmed) resetDraft(confirmed);
  };
  const confirm = async () => {
    if (!action || dirty || !current()) return false;
    if (!confirmation.password) {
      setConfirmation({ password: '', missing: true });
      return false;
    }
    const saved = await mutation.save(
      () =>
        action.kind === 'restore'
          ? backupAPI.restoreBackup(action.backup.id, confirmation.password)
          : backupAPI.resetData(action.mode, confirmation.password),
      action.kind === 'restore'
        ? text.restored
        : text.resetDone,
    );
    if (!saved || !current()) return false;
    if (action.kind === 'restore') {
      useAuthStore.getState().logout();
      return true;
    }
    await client.invalidateQueries({ queryKey: keys.resource() });
    if (!current()) return true;
    // The reset form opens on its first section, where the restored values start.
    setSection('general');
    await onReset();
    return true;
  };
  const t = useTerms();
  const message =
    action?.kind === 'restore'
      ? text.restoreMessage
      : action?.kind === 'reset' && action.mode === 'all'
        ? text.resetAllMessage(t)
        : text.resetSettingsMessage(t);
  return (
    <>
      <nav
        aria-label={text.sectionNav}
        className="flex flex-wrap gap-2 border-b border-(--line) pb-4"
      >
        {sections.map((id) => (
          <button
            key={id}
            type="button"
            aria-current={section === id ? 'page' : undefined}
            className={`btn ${section === id ? 'btn-primary' : 'btn-secondary'}`}
            disabled={busy}
            onClick={() => setSection(id)}
          >
            {text.sections[id]}
          </button>
        ))}
      </nav>
      {section === 'audit' ? (
        <div className="panel p-5 sm:p-6">
          <AuditLogPanel />
        </div>
      ) : (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="panel space-y-6 p-5 sm:p-6"
        aria-label={text.form}
        aria-busy={busy}
      >
        <fieldset
          disabled={busy || !!action}
          className="space-y-5 disabled:opacity-60"
        >
          {section === 'general' && (
            <>
              <h2 className="text-base font-medium">{text.identity}</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {input('siteName', text.siteName)}
                {input('siteUrl', text.siteUrl, 'url')}
              </div>
              {field(
                'siteDescription',
                text.siteDescription,
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
              {input('adminEmail', text.adminEmail, 'email')}
              {field(
                'language',
                text.language,
                <select
                  id={`${prefix}-language`}
                  className="input"
                  value={draft.language}
                  onChange={(event) =>
                    setDraft({ ...draft, language: event.target.value as SiteSettings['language'] })
                  }
                >
                  {languages.map((language) => (
                    <option key={language} value={language} lang={language}>
                      {text.languageNames[language]}
                    </option>
                  ))}
                </select>,
              )}
              <p className="text-xs text-(--muted)">{text.languageHint}</p>
              <p className="text-xs text-(--muted)">
                {text.identityHint}
              </p>
            </>
          )}
          {section === 'security' && (
            <>
              <h2 className="text-base font-medium">{text.access}</h2>
              {toggle(
                'allowRegistration',
                text.allowRegistration,
                text.allowRegistrationHint,
              )}
              {toggle(
                'maintenanceMode',
                text.maintenanceMode,
                text.maintenanceModeHint,
              )}
              {input(
                'sessionTimeout',
                text.sessionTimeout,
                'number',
              )}
              <p className="text-xs text-(--muted)">
                {text.sessionTimeoutHint}
              </p>
            </>
          )}
          {section === 'notifications' && (
            <>
              <h2 className="text-base font-medium">{text.channels}</h2>
              <p className="text-sm text-(--muted)">
                {text.channelsHint}
              </p>
              {toggle('emailNotifications', text.emailNotifications, text.emailNotificationsHint)}
              {toggle('pushNotifications', text.pushNotifications, text.pushNotificationsHint)}
              <NotificationChannelStatus />
            </>
          )}
          {section === 'appearance' && (
            <>
              <h2 className="text-base font-medium">{text.brand}</h2>
              {input('siteLogo', text.siteLogo, 'url')}
              {field(
                'siteIcon',
                text.siteIcon,
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
              <p className="text-xs text-(--muted)">
                {text.brandHint}
              </p>
              <div className="grid gap-5 sm:grid-cols-2">
                {input('primaryColor', text.primaryColor)}
              </div>
            </>
          )}
          {section === 'terminology' && (
            <>
              <h2 className="text-base font-medium">{text.terminology}</h2>
              <p className="text-sm text-(--muted)">
                {text.terminologyHint}
              </p>
              {/* Words belong to the site language being set here; a set in the other language is kept but not shown. */}
              <TerminologyPresetPicker
                name={`${prefix}-terminologyPreset`}
                value={customInLanguage ? 'custom' : draft.terminologyPreset}
                custom={draft.customTerminology}
                language={draft.language}
                onChange={(choice) => {
                  if (choice === 'custom')
                    setDraft({ ...draft, customTerminology: customInLanguage ? draft.customTerminology : customTerminologyFrom(draft.terminologyPreset, draft.language) });
                  else if (choice) setDraft({ ...draft, terminologyPreset: choice, customTerminology: null });
                }}
              />
              {draft.customTerminology && customInLanguage && (
                <CustomTerminologyEditor
                  idPrefix={`${prefix}-customTerminology`}
                  value={draft.customTerminology}
                  onChange={(customTerminology) => setDraft({ ...draft, customTerminology })}
                />
              )}
            </>
          )}
          {section === 'backup' && (
            <>
              <h2 className="text-base font-medium">{text.autoBackup}</h2>
              {field(
                'backup_interval',
                text.backupInterval,
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
                  <option value="1">{text.intervals['1']}</option>
                  <option value="5">{text.intervals['5']}</option>
                  <option value="7">{text.intervals['7']}</option>
                </select>,
              )}
              <p className="text-sm text-(--muted)">
                {text.backupIntervalHint}
              </p>
            </>
          )}
        </fieldset>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm text-red-600">
            {text.invalidFields(
              Object.keys(errors)
                .map((key) => text.fieldNames[key] ?? key)
                .join(', '),
            )}
          </p>
        )}
        {!action && mutation.errorMessage && (
          <p role="alert" className="text-sm text-red-600">
            {mutation.errorMessage}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--line) pt-5">
          <p className="text-sm text-(--muted)" role="status">
            {mutation.isPending
              ? text.working
              : dirty
                ? text.unsaved
                : text.noChanges}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || !dirty}
              onClick={() => resetDraft(adminSettings ?? baseline)}
            >
              {text.discard}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !dirty}
            >
              {mutation.isPending ? text.waiting : text.saveChanges}
            </button>
          </div>
        </div>
      </form>
      )}
      {section === 'backup' && (
        <div className="panel p-5 sm:p-6">
          <BackupPanel
            busy={busy || !!action}
            dirty={dirty}
            onAction={(next) => {
              mutation.clearError();
              setConfirmation({ password: '', missing: false });
              setAction(next);
            }}
            onCreate={() => {
              if (!current()) return;
              void mutation
                .save(
                  () => backupAPI.createBackup(),
                  text.backupCreated,
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
              ? text.restoreTitle(action.backup.id)
              : action.mode === 'all'
                ? text.resetAllTitle
                : text.resetSettingsTitle
          }
          message={message}
          type="danger"
          confirmText={
            action.kind === 'restore'
              ? text.restoreConfirm
              : text.resetConfirm
          }
          onClose={() => setAction(null)}
          onConfirm={confirm}
        >
          <AdminPasswordField
            value={confirmation.password}
            missing={confirmation.missing}
            onChange={(password) => setConfirmation({ password, missing: false })}
          />
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
  const text = useText().siteSettings;
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
        title={text.title}
        description={text.description}
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
            {text.reload}
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
        !error && <p role="status">{text.loading}</p>
      )}
    </div>
  );
}
export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <SettingsWorkspace /> : null;
}
