import { useTerms } from '../../hooks/useTerms';
import {
  calendarViewDate,
  sessionDurationLimits,
  createSessionSchema as createSessionRequestSchema,
  updateSessionSchema as updateSessionRequestSchema,
} from '@study-tracker/contracts';
import { format } from '../../utils/calendarDates';
import { pomodoroDefaults } from '@study-tracker/contracts';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { contractResolver } from '../../lib/contractResolver';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Coffee, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isHttpError } from '../../services/httpError';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import { useAllCourses } from '../../hooks/useAllCourses';
import { sessionFormSchema, type CreateSessionForm } from './sessionForm';
import { studySessionsAPI } from '../../services/api';
import type { StudySession } from '../../types/planner';
import ConfirmDialog from '../common/ConfirmDialog';
import PomodoroSettingsFields from './PomodoroSettingsFields';
import SessionCategoryPicker, { type SessionCategory } from './SessionCategoryPicker';
import SessionColorPicker from './SessionColorPicker';
import SessionDurationFields, { EndTimeSummary } from './SessionDurationFields';
import {
  buildSessionPayload,
  resolveSessionRange,
  resolveSessionTitle,
  wallTimeMinutes,
  type DurationMode,
} from './sessionRequest';
import { useText } from '../../store/languageStore';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | undefined;
  selectedHour?: number | undefined;
  editSession?: StudySession | null;
}

const SessionEditor: React.FC<Omit<CreateSessionModalProps, 'isOpen'>> = (
  props,
) => {
  const [{ selectedDate, selectedHour = 9, editSession }] = useState(props);
  const { onClose } = props;
  const t = useTerms();
  const { sessionEditor: text, session: sessionText, common } = useText();
  const accountKeys = useAccountQueryKeys();
  const livePreferences = useUserPreferencesStore((state) => state.preferences);
  const [preferences] = useState(livePreferences);
  const defaultPomodoro = useMemo(
    () => pomodoroDefaults(preferences),
    [
      preferences.defaultPomodoroDuration,
      preferences.defaultShortBreak,
      preferences.defaultLongBreak,
      preferences.pomodorosUntilLongBreak,
    ],
  );
  const [sessionCategory, setSessionCategory] =
    useState<SessionCategory>('course');
  const [durationMode, setDurationMode] = useState<DurationMode>('minutes');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const mutation = useAccountMutation([accountKeys.sessions()]);
  const [writeSnapshot, setWriteSnapshot] = useState(editSession);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const isEditMode = !!editSession;

  const coursesQuery = useAllCourses();

  const coursesData = coursesQuery.data?.filter(
    (course) => course.isActive || course.id === editSession?.courseId,
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isValid },
  } = useForm<CreateSessionForm>({
    resolver: contractResolver(sessionFormSchema, (message) => message),
    mode: 'onChange',
    defaultValues: {
      sessionCategory: 'course',
      startDate: selectedDate
        ? format(selectedDate, 'yyyy-MM-dd')
        : format(
            calendarViewDate(new Date(), preferences.timezone),
            'yyyy-MM-dd',
          ),
      startTime: `${selectedHour.toString().padStart(2, '0')}:00`,
      durationMode: 'minutes',
      duration: 60,
      endTime: '',
      sessionType: 'study',
      color: '#60A5FA', // Default soft blue color
      pomodoroSettings: defaultPomodoro,
    },
  });

  const sessionType = watch('sessionType');
  const showPomodoroSettings = sessionType === 'pomodoro';

  const reloadSnapshot = async () => {
    if (!editSession || !mutation.isCurrent()) return;
    try {
      const response = await studySessionsAPI.getSession(
        String(editSession.id),
      );
      if (mutation.isCurrent() && response.data.data?.session) {
        setWriteSnapshot(response.data.data.session);
        setNeedsRefresh(false);
      }
    } catch {
      /* Keep writes blocked until the current snapshot can be read. */
    }
  };
  const perform = (operation: () => Promise<unknown>, message: string) =>
    mutation.save(async () => {
      try {
        await operation();
      } catch (error) {
        if (
          isHttpError(error) &&
          error.response?.status === 409 &&
          mutation.isCurrent() &&
          editSession
        ) {
          setConflicted(true);
          setNeedsRefresh(true);
          await reloadSnapshot();
        }
        throw error;
      }
    }, message);

  const onSubmit = async (data: CreateSessionForm) => {
    if (needsRefresh || mutation.isPending || showDeleteConfirm) return;
    // Force the correct sessionCategory in case of sync issues
    const correctedData = {
      ...data,
      sessionCategory: sessionCategory,
    };

    let range: { startTime: Date; endTime: Date };
    try {
      range = resolveSessionRange(correctedData, durationMode, preferences.timezone);
    } catch {
      setError('startTime', {
        type: 'validate',
        message: text.invalidRange,
      });
      return;
    }

    const sessionData = buildSessionPayload(
      correctedData,
      resolveSessionTitle(correctedData, coursesData, editSession),
      range,
      isEditMode,
    );

    const request =
      isEditMode && writeSnapshot
        ? updateSessionRequestSchema.safeParse({
            ...sessionData,
            expectedUpdatedAt: writeSnapshot.updatedAt,
          })
        : createSessionRequestSchema.safeParse(sessionData);
    if (!request.success) {
      setError('title', {
        type: 'validate',
        message: text.checkFields(t),
      });
      return;
    }
    const saved = await perform(
      () =>
        isEditMode && writeSnapshot && 'expectedUpdatedAt' in request.data
          ? studySessionsAPI.updateSession(writeSnapshot, request.data)
          : studySessionsAPI.createSession(
              createSessionRequestSchema.parse(request.data),
            ),
      isEditMode
        ? text.updated(t)
        : text.created(t),
    );
    if (saved) onClose();
  };

  const handleClose = () => {
    if (mutation.isPending || showDeleteConfirm) return;
    onClose();
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!editSession || mutation.isPending || needsRefresh) return;
    mutation.clearError();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!writeSnapshot || needsRefresh) return false;
    const saved = await perform(
      () => studySessionsAPI.deleteSession(writeSnapshot),
      `${t.session({ capitalize: true })} silindi.`,
    );
    if (saved) {
      setShowDeleteConfirm(false);
      onClose();
    }
    return saved;
  };

  // Pre-fill form when editing OR when opening with selected date/hour
  useEffect(() => {
    if (editSession) {
      // Editing existing session
      const durationInMinutes = editSession.duration;

      // Determine session category
      let category: SessionCategory;
      if (editSession.sessionType === 'break') {
        category = 'break';
      } else if (editSession.courseId) {
        category = 'course';
      } else {
        category = 'custom';
      }

      setSessionCategory(category);

      const sessionStartTime = calendarViewDate(
        editSession.startTime,
        preferences.timezone,
      );

      reset({
        sessionCategory: category,
        courseId: editSession.courseId?.toString() || '',
        customTitle: category === 'custom' ? editSession.title : '',
        description: editSession.description || '',
        startDate: format(sessionStartTime, 'yyyy-MM-dd'),
        startTime: format(sessionStartTime, 'HH:mm'),
        durationMode: 'minutes',
        duration: durationInMinutes,
        endTime: '',
        sessionType: editSession.sessionType,
        color: editSession.color || '#3B82F6',
        pomodoroSettings: editSession.pomodoroSettings || defaultPomodoro,
      });
    } else {
      // Creating new session - use selected date/hour
      setSessionCategory('course');
      setDurationMode('minutes');

      reset({
        sessionCategory: 'course',
        startDate: selectedDate
          ? format(selectedDate, 'yyyy-MM-dd')
          : format(
              calendarViewDate(new Date(), preferences.timezone),
              'yyyy-MM-dd',
            ),
        startTime: `${(selectedHour ?? 9).toString().padStart(2, '0')}:00`,
        durationMode: 'minutes',
        duration: 60,
        endTime: '',
        sessionType: 'study',
        color: '#3B82F6',
        pomodoroSettings: defaultPomodoro,
      });
    }
  }, [
    editSession,
    selectedDate,
    selectedHour,
    reset,
    defaultPomodoro,
    preferences.timezone,
  ]);

  React.useEffect(() => {
    if (sessionCategory === 'break') {
      setValue('sessionType', 'break', { shouldValidate: true });
    } else if (sessionType === 'break') {
      setValue('sessionType', 'study', { shouldValidate: true });
    }
    setValue('sessionCategory', sessionCategory, { shouldValidate: true });
  }, [sessionCategory, sessionType, setValue]);

  React.useEffect(() => {
    setValue('durationMode', durationMode, { shouldValidate: true });
  }, [durationMode, setValue]);

  // In time-range mode, derive the duration from the end time
  const watchedEndTime = watch('endTime');
  const watchedStartDate = watch('startDate');
  const watchedStartTime = watch('startTime');
  const watchedDuration = watch('duration');

  React.useEffect(() => {
    if (
      durationMode === 'timeRange' &&
      watchedEndTime &&
      watchedStartDate &&
      watchedStartTime
    ) {
      const minutes = wallTimeMinutes(
        watchedStartDate,
        watchedStartTime,
        watchedEndTime,
        preferences.timezone,
      );
      if (minutes !== null && minutes > 0 && minutes <= sessionDurationLimits.maxMinutes)
        setValue('duration', minutes, { shouldValidate: true });
    }
  }, [
    watchedEndTime,
    watchedStartDate,
    watchedStartTime,
    durationMode,
    setValue,
    preferences.timezone,
  ]);

  return (
    <MotionConfig reducedMotion="user">
    <Dialog
      key="create-session-modal"
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      open
      onClose={handleClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <DialogPanel
          as={motion.div}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="panel mx-auto my-8 flex max-h-[90vh] w-full max-w-lg flex-col shadow-xl"
          aria-busy={mutation.isPending}
        >
          <div className="flex items-center justify-between p-5 border-b border-(--line)">
            <DialogTitle className="text-lg font-medium ">
              {isEditMode ? text.editTitle(t) : text.newTitle(t)}
            </DialogTitle>
            <button
              onClick={handleClose}
              disabled={mutation.isPending}
              aria-label={text.close}
              className="p-2 rounded-md text-(--muted) hover:text-(--text) hover:bg-(--subtle) transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form
            id="create-session-form"
            onSubmit={handleSubmit(onSubmit)}
            className="p-5 space-y-5 overflow-y-auto flex-1"
          >
            <fieldset
              disabled={mutation.isPending || showDeleteConfirm}
              className="space-y-5 disabled:opacity-60"
            >
              <p className="text-xs text-(--muted)">
                {text.timezone(preferences.timezone)}
              </p>
              {coursesQuery.isError && (
                <div role="alert">
                  <p>{text.recordsFailed(t)}</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void coursesQuery.refetch()}
                  >
                    {text.reloadRecords(t)}
                  </button>
                </div>
              )}
              {conflicted && (
                <p role="status" className="text-sm">
                  {text.conflict}
                </p>
              )}
              {needsRefresh && (
                <div role="alert">
                  <p>{text.needsRefresh(t)}</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void reloadSnapshot()}
                  >
                    {text.reloadLatest(t)}
                  </button>
                </div>
              )}
              {!showDeleteConfirm && mutation.errorMessage && (
                <p role="alert" className="text-sm text-red-600">
                  {mutation.errorMessage}
                </p>
              )}
              {errors.title && (
                <p role="alert" className="text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
              <SessionCategoryPicker
                value={sessionCategory}
                onChange={setSessionCategory}
              />

              {/* Course Selection, Break, or Custom Title */}
              {sessionCategory === 'course' && (
                <div>
                  <label
                    htmlFor="courseId"
                    className="block text-sm font-medium mb-2"
                  >
                    {text.recordChoice(t)}
                  </label>
                  <select
                    {...register('courseId')}
                    id="courseId"
                    className="input"
                  >
                    <option value="">{text.chooseRecord(t)}</option>
                    {coursesData?.map((course) => (
                      <option key={course.id} value={course.id.toString()}>
                        {course.name}{' '}
                        {course.category?.name
                          ? `(${course.category.name})`
                          : ''}
                      </option>
                    ))}
                  </select>
                  {errors.courseId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.courseId.message}
                    </p>
                  )}
                </div>
              )}

              {sessionCategory === 'break' && (
                <div className="rounded-lg border border-(--line) bg-(--subtle) p-3">
                  <p className="flex items-center gap-2 text-sm text-(--muted)">
                    <Coffee className="w-4 h-4" />
                    {text.breakHint}
                  </p>
                </div>
              )}

              {sessionCategory === 'custom' && (
                <div>
                  <label
                    htmlFor="customTitle"
                    className="block text-sm font-medium mb-2"
                  >
                    {text.customTitle}
                  </label>
                  <input
                    {...register('customTitle')}
                    type="text"
                    id="customTitle"
                    className="input"
                    placeholder={text.customTitlePlaceholder}
                  />
                  {errors.customTitle && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.customTitle.message}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium mb-2"
                >
                  {text.description}
                </label>
                <textarea
                  {...register('description')}
                  id="description"
                  rows={3}
                  className="input"
                  placeholder={text.descriptionPlaceholder(t)}
                />
              </div>

              {/* Start Date and Time */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  {text.startDateTime}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="startDate"
                      className="block text-xs text-(--muted) mb-1"
                    >
                      {text.date}
                    </label>
                    <input
                      {...register('startDate')}
                      type="date"
                      id="startDate"
                      className="input"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="startTime"
                      className="block text-xs text-(--muted) mb-1"
                    >
                      {text.time}
                    </label>
                    <input
                      {...register('startTime')}
                      type="time"
                      id="startTime"
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <SessionDurationFields
                mode={durationMode}
                onModeChange={setDurationMode}
                register={register}
                errors={errors}
                timezone={preferences.timezone}
                startDate={watchedStartDate}
                startTime={watchedStartTime}
                endTime={watchedEndTime}
              />

              {/* Session Type */}
              {sessionCategory !== 'break' && (
                <div>
                  <label
                    htmlFor="sessionType"
                    className="block text-sm font-medium mb-2"
                  >
                    {text.type(t)}
                  </label>
                  <select
                    {...register('sessionType')}
                    id="sessionType"
                    className="input"
                  >
                    <option value="study">{sessionText.types.study}</option>
                    <option value="pomodoro">{sessionText.types.pomodoro}</option>
                    <option value="review">{sessionText.types.review}</option>
                  </select>
                </div>
              )}

              {durationMode === 'minutes' && (
                <EndTimeSummary
                  timezone={preferences.timezone}
                  startDate={watchedStartDate}
                  startTime={watchedStartTime}
                  duration={watchedDuration}
                />
              )}

              <AnimatePresence>
                {showPomodoroSettings && (
                  <motion.div
                    key="pomodoro-settings"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <PomodoroSettingsFields register={register} setValue={setValue} />
                  </motion.div>
                )}
              </AnimatePresence>

              <SessionColorPicker
                selected={watch('color')}
                register={register}
                setValue={setValue}
              />
            </fieldset>
            {/* Buttons */}
          </form>

          {/* Footer with buttons */}
          <div className="flex flex-wrap justify-between items-center gap-3 p-5 border-t border-(--line) bg-(--surface)">
            {/* Delete button - left side, only in edit mode */}
            <div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(e)}
                  disabled={mutation.isPending || needsRefresh}
                  className="btn btn-secondary text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  {text.delete}
                </button>
              )}
            </div>

            {/* Cancel and Submit buttons - right side */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={mutation.isPending}
                className="btn btn-secondary"
              >
                {common.cancel}
              </button>
              <button
                type="submit"
                form="create-session-form"
                disabled={
                  mutation.isPending ||
                  needsRefresh ||
                  showDeleteConfirm ||
                  !isValid ||
                  (sessionCategory === 'course' &&
                    !coursesData?.some(
                      (course) => String(course.id) === watch('courseId'),
                    ))
                }
                className="btn btn-primary"
              >
                {mutation.isPending
                  ? isEditMode
                    ? text.updating
                    : text.creating
                  : isEditMode
                    ? text.update
                    : text.create}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={text.deleteTitle(t)}
        message={text.deleteMessage(t, editSession?.title ?? '')}
        type="danger"
      >
        {mutation.errorMessage && (
          <p role="alert" className="text-sm text-red-600">
            {mutation.errorMessage}
          </p>
        )}
        {needsRefresh && (
          <p role="alert">
            {text.deleteNeedsRefresh(t)}
          </p>
        )}
      </ConfirmDialog>
    </Dialog>
    </MotionConfig>
  );
};

export default function CreateSessionModal({
  isOpen,
  ...props
}: CreateSessionModalProps) {
  return isOpen ? (
    <SessionEditor key={props.editSession?.id ?? 'new'} {...props} />
  ) : null;
}
