import { createTerms, needsOnboarding, weekStartDays } from '@study-tracker/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { Brand } from '../../components/common/Brand';
import WeekdayPicker from '../../components/settings/WeekdayPicker';
import { useTerms } from '../../hooks/useTerms';
import { appLocale, browserTimezone, listTimezones, orderedWeekdays, weekdayLabel, weekStartLabels } from '../../lib/locale';
import { useAuthStore } from '../../store/authStore';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import {
  choosePurpose,
  filledCourseNames,
  initialDraft,
  purposeIds,
  purposes,
  rhythmIds,
  rhythms,
  stepError,
  steps,
  toOnboardingInput,
  type OnboardingDraft,
} from './onboardingModel';

const lastStep = steps.length - 1;

function ChoiceCard({ name, checked, onChange, title, children }: { name: string; checked: boolean; onChange: () => void; title: string; children: ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${checked ? 'border-[var(--solid)] bg-[var(--subtle)]' : 'border-[var(--line)] hover:bg-[var(--subtle)]'}`}>
      <input type="radio" name={name} className="mt-1" checked={checked} onChange={onChange} />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-sm text-[var(--muted)]">{children}</span>
      </span>
    </label>
  );
}

const hours = (value: number) => `${value.toLocaleString(appLocale)} sa`;
const numberValue = (value: number) => (Number.isNaN(value) ? '' : value);

export default function WelcomePage() {
  const preferences = useUserPreferencesStore((state) => state.preferences);
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences);
  const firstName = useAuthStore((state) => state.user?.firstName);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const queryClient = useQueryClient();
  const siteTerms = useTerms();
  const prefix = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<OnboardingDraft>(() => initialDraft(preferences));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'finish' | 'skip' | null>(null);
  const terms = draft.purpose ? createTerms(purposes[draft.purpose].preset) : siteTerms;
  const zones = useMemo(() => listTimezones(draft.timezone, browserTimezone()), [draft.timezone]);
  const mounted = useRef(false);

  // Move focus to each new step's heading so keyboard and screen reader users land on it.
  useEffect(() => {
    if (mounted.current) headingRef.current?.focus();
    mounted.current = true;
  }, [step]);

  if (!needsOnboarding(preferences)) return <Navigate to="/dashboard" replace />;

  const update = (patch: Partial<OnboardingDraft>) => { setDraft({ ...draft, ...patch }); setError(null); };
  const goTo = (next: number) => { setError(null); setStep(next); };

  const finish = async () => {
    const input = toOnboardingInput(draft);
    if (!input) { setError('Cevaplardan biri geçersiz. Önceki adımları kontrol edin.'); return; }
    setBusy('finish');
    try {
      await completeOnboarding(input);
      await queryClient.invalidateQueries();
      toast.success('Her şey hazır.');
    } catch (failure) {
      setError((isAxiosError(failure) ? failure.response?.data?.error?.message : undefined) || 'Kurulum kaydedilemedi. Lütfen tekrar deneyin.');
      setBusy(null);
    }
  };

  const skip = async () => {
    setBusy('skip');
    try {
      await updatePreferences({ onboarding: 'done' });
      toast("Kurulumu istediğin zaman Ayarlar › Çalışma Tercihleri'nden yeniden başlatabilirsin.");
    } catch {
      setError('Şu anda atlanamadı. Lütfen tekrar deneyin.');
      setBusy(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step === lastStep) { void finish(); return; }
    const problem = stepError(draft, step);
    if (problem) setError(problem);
    else goTo(step + 1);
  };

  const courseWord = terms.course({ capitalize: true });
  const content: { title: string; description: string; body: ReactNode }[] = [
    {
      title: firstName ? `Hoş geldin, ${firstName}` : 'Hoş geldin',
      description: "Birkaç soruyla sayfanı sana göre hazırlayalım. Hepsini sonra Ayarlar'dan değiştirebilirsin.",
      body: (
        <div className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="mb-3 text-sm font-medium">Bu hesabı ne için kullanacaksın?</legend>
            {purposeIds.map((id) => {
              const purpose = purposes[id];
              const words = createTerms(purpose.preset);
              return (
                <ChoiceCard key={id} name={`${prefix}-purpose`} checked={draft.purpose === id} onChange={() => { setDraft(choosePurpose(draft, id)); setError(null); }} title={purpose.label}>
                  {purpose.description}
                  <span className="mt-1 block text-xs">Kelimeler: {words.course({ capitalize: true })} → {words.topic({ capitalize: true })}</span>
                </ChoiceCard>
              );
            })}
          </fieldset>
          <div>
            <label htmlFor={`${prefix}-studyField`} className="mb-2 block text-sm font-medium">Odak alanı <span className="font-normal text-[var(--muted)]">(isteğe bağlı)</span></label>
            <input id={`${prefix}-studyField`} className="input" maxLength={60} value={draft.studyField} onChange={(event) => update({ studyField: event.target.value })} placeholder="Örn. üniversite hazırlığı, ürün yönetimi, İspanyolca" />
          </div>
        </div>
      ),
    },
    {
      title: 'Zamanını planlayalım',
      description: 'Hedefler panoda ve istatistiklerde ölçülen süreyle karşılaştırılır. 0 hedef yok demektir.',
      body: (
        <div className="space-y-6">
          <div>
            <label htmlFor={`${prefix}-timezone`} className="mb-2 block text-sm font-medium">Saat dilimi</label>
            <select id={`${prefix}-timezone`} className="input" value={draft.timezone} onChange={(event) => update({ timezone: event.target.value })}>
              {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Hafta başlangıcı</p>
            <div role="group" aria-label="Hafta başlangıcı" className="segmented-control">
              {weekStartDays.map((day) => (
                <button key={day} type="button" aria-pressed={draft.weekStartsOn === day} onClick={() => update({ weekStartsOn: day })} className={`segment ${draft.weekStartsOn === day ? 'segment-active' : ''}`}>
                  {weekStartLabels[day]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Aktif günler</p>
            <WeekdayPicker label="Aktif günler" value={draft.activeStudyDays} weekStart={draft.weekStartsOn} onChange={(activeStudyDays) => update({ activeStudyDays })} />
            <p className="mt-2 text-xs text-[var(--muted)]">Günlük hedef yalnız bu günlerde uygulanır.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${prefix}-daily`} className="mb-2 block text-sm font-medium">Günlük hedef (saat)</label>
              <input id={`${prefix}-daily`} type="number" min={0} max={24} step={0.5} className="input" value={numberValue(draft.dailyStudyGoal)} onChange={(event) => update({ dailyStudyGoal: event.target.valueAsNumber })} />
            </div>
            <div>
              <label htmlFor={`${prefix}-weekly`} className="mb-2 block text-sm font-medium">Haftalık hedef (saat)</label>
              <input id={`${prefix}-weekly`} type="number" min={0} max={168} step={0.5} className="input" value={numberValue(draft.weeklyStudyGoal)} onChange={(event) => update({ weeklyStudyGoal: event.target.valueAsNumber })} />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Çalışma ritmin',
      description: 'Odak zamanlayıcısı bu sürelerle başlar; istediğin an değiştirebilirsin.',
      body: (
        <fieldset className="space-y-3">
          <legend className="sr-only">Çalışma ritmi</legend>
          {rhythmIds.map((id) => (
            <ChoiceCard key={id} name={`${prefix}-rhythm`} checked={draft.rhythm === id} onChange={() => update({ rhythm: id })} title={rhythms[id].label}>
              {rhythms[id].description}
            </ChoiceCard>
          ))}
        </fieldset>
      ),
    },
    {
      title: `İlk ${terms.course({ plural: true })}`,
      description: `İstersen şimdi en fazla üç ${terms.course()} ekle. Boş bırakırsan bu adım atlanır.`,
      body: (
        <div className="space-y-5">
          <div>
            <label htmlFor={`${prefix}-category`} className="mb-2 block text-sm font-medium">Kategori</label>
            <input id={`${prefix}-category`} className="input" maxLength={100} value={draft.categoryName} onChange={(event) => update({ categoryName: event.target.value })} />
            <p className="mt-2 text-xs text-[var(--muted)]">Yalnız sana görünen kişisel bir kategori olarak oluşturulur; aynı adlı ortak bir kategori varsa o kullanılır.</p>
          </div>
          {draft.courseNames.map((name, index) => (
            <div key={index}>
              <label htmlFor={`${prefix}-course-${index}`} className="mb-2 block text-sm font-medium">{courseWord} {index + 1}</label>
              <input
                id={`${prefix}-course-${index}`}
                className="input"
                maxLength={100}
                value={name}
                placeholder={draft.purpose ? purposes[draft.purpose].examples[index] : undefined}
                onChange={(event) => update({ courseNames: draft.courseNames.map((current, position) => (position === index ? event.target.value : current)) })}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Özet',
      description: 'Onaylarsan sayfan bu cevaplara göre hazırlanır.',
      body: (
        <dl className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] text-sm">
          {[
            ['Kullanım', draft.purpose ? purposes[draft.purpose].label : '—'],
            ['Kelimeler', `${terms.course({ capitalize: true })} → ${terms.topic({ capitalize: true })} · ${terms.session({ capitalize: true })}`],
            ['Odak alanı', draft.studyField.trim() || 'Belirtilmedi'],
            ['Saat dilimi', draft.timezone],
            ['Hafta başlangıcı', weekStartLabels[draft.weekStartsOn]],
            ['Aktif günler', orderedWeekdays(draft.weekStartsOn).filter((day) => draft.activeStudyDays.includes(day)).map(weekdayLabel).join(', ') || 'Seçilmedi'],
            ['Hedefler', `Günde ${hours(draft.dailyStudyGoal)} · Haftada ${hours(draft.weeklyStudyGoal)}`],
            ['Ritim', `${rhythms[draft.rhythm].label}: ${rhythms[draft.rhythm].description}`],
            ['İlk kayıtlar', filledCourseNames(draft).length ? `${draft.categoryName.trim()}: ${filledCourseNames(draft).join(', ')}` : 'Eklenmeyecek'],
          ].map(([term, detail]) => (
            <div key={term} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr]">
              <dt className="text-[var(--muted)]">{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>
      ),
    },
  ];
  const current = content[step]!;

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-4 py-8 text-[var(--text)] sm:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Brand />
          <button type="button" className="text-sm text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline disabled:opacity-50" onClick={() => void skip()} disabled={busy !== null}>
            Şimdilik atla
          </button>
        </div>
        <div className="space-y-2">
          <ol aria-label="Kurulum adımları" className="grid grid-cols-5 gap-2">
            {steps.map((label, index) => (
              <li key={label} aria-current={index === step ? 'step' : undefined} className="space-y-1.5">
                <span aria-hidden="true" className={`block h-1 rounded-full ${index <= step ? 'bg-[var(--solid)]' : 'bg-[var(--line)]'}`} />
                <span className={`hidden text-xs sm:block ${index === step ? 'font-medium text-[var(--text)]' : 'text-[var(--muted)]'}`}>{label}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-[var(--muted)]">Adım {step + 1} / {steps.length}</p>
        </div>
        <form className="panel" onSubmit={submit} noValidate>
          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">{current.title}</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{current.description}</p>
            </div>
            {current.body}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-6 py-4 sm:px-8">
            <button type="button" className="btn btn-secondary" onClick={() => goTo(step - 1)} disabled={step === 0 || busy !== null}>
              Geri
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy !== null}>
              {step < lastStep ? 'İleri' : busy === 'finish' ? 'Hazırlanıyor…' : 'Kurulumu bitir'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
