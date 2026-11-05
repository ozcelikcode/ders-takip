import type { APIRequestContext } from '@playwright/test';

// Demo data for screenshots, created through the API of the isolated browser-test site.
const minute = 60_000;
const day = 24 * 60 * minute;

const api = (request: APIRequestContext, token?: string) =>
  async <T = unknown>(method: string, url: string, data?: unknown): Promise<T> => {
    const response = await request.fetch(`/api${url}`, {
      method,
      headers: { 'X-Requested-With': 'StudyTracker', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(data === undefined ? {} : { data }),
    });
    if (!response.ok()) throw new Error(`${method} ${url}: ${response.status()} ${await response.text()}`);
    return ((await response.json()) as { data: T }).data;
  };

const signIn = async (request: APIRequestContext, email: string, password: string) =>
  (await api(request)<{ tokens: { accessToken: string } }>('POST', '/auth/login', { email, password })).tokens.accessToken;

/** A believable month for one person: four courses with topics, logged study, a plan for the week and a running timer. */
export async function seedDemo(request: APIRequestContext) {
  const admin = api(request, await signIn(request, 'manager@example.test', 'fixture-password'));
  await admin('PUT', '/settings', { language: 'en', siteName: 'Study Tracker' });

  const password = 'demo-password-2026';
  await api(request)('POST', '/auth/register', {
    username: 'maya', email: 'maya@example.test', password, firstName: 'Maya', lastName: 'Chen', timezone: 'UTC',
  });
  const call = api(request, await signIn(request, 'maya@example.test', password));
  await call('PUT', '/auth/profile', {
    preferences: { onboarding: 'done', terminologyPreset: 'education', dailyStudyGoal: 2.5, studyField: 'Engineering, second year' },
  });

  const category = await call<{ category: { id: number } }>('POST', '/categories', { name: 'Semester', color: '#2563eb' });
  const courses: { id: number; name: string }[] = [];
  for (const [name, color, topics] of [
    ['Linear Algebra', '#2563eb', ['Vector spaces', 'Eigenvalues', 'Orthogonality']],
    ['Organic Chemistry', '#16a34a', ['Reaction mechanisms', 'Stereochemistry']],
    ['Spanish B1', '#ea580c', ['Subjunctive', 'Listening practice']],
    ['Thesis', '#7c3aed', ['Literature review', 'Methods chapter']],
  ] as const) {
    const { course } = await call<{ course: { id: number; name: string } }>('POST', '/courses', { name, color, categoryId: category.category.id });
    courses.push(course);
    for (const [index, topic] of topics.entries()) {
      await call('POST', '/topics', { name: topic, courseId: course.id, estimatedTime: 90, difficulty: index === 0 ? 'Orta' : 'Zor' });
    }
  }
  await call('PUT', `/course-goals/${courses[0]!.id}`, { weeklyMinutes: 300 });
  await call('PUT', `/course-goals/${courses[3]!.id}`, { weeklyMinutes: 240 });

  // Three weeks of measured study, with a few rest days; times are UTC like the browser.
  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const slots = [[8, 50], [10, 75], [14, 45], [16, 60]] as const;
  for (let back = 20; back >= 1; back--) {
    if (back % 6 === 0) continue;
    for (let slot = 0; slot < 1 + (back % 3); slot++) {
      const [hour, length] = slots[(back + slot) % slots.length]!;
      const course = courses[(back + slot) % courses.length]!;
      const start = today - back * day + hour * 60 * minute;
      await call('POST', '/study-sessions/log', {
        courseId: course.id, title: course.name, startTime: new Date(start).toISOString(), endTime: new Date(start + length * minute).toISOString(),
      });
    }
  }
  // Earlier today, when today has room for it before now.
  const morning = Math.max(today + 6 * 60 * minute, Date.now() - 5 * 60 * minute);
  if (morning + 80 * minute < Date.now() - 10 * minute) {
    await call('POST', '/study-sessions/log', {
      courseId: courses[3]!.id, title: 'Thesis', startTime: new Date(morning).toISOString(), endTime: new Date(morning + 80 * minute).toISOString(),
    });
  }
  // The coming days are planned.
  for (const [offset, hour, course] of [[1, 9, 0], [1, 14, 3], [2, 10, 1], [3, 9, 2], [3, 15, 0], [4, 11, 3]] as const) {
    const start = today + offset * day + hour * 60 * minute;
    await call('POST', '/study-sessions', {
      courseId: courses[course]!.id, title: courses[course]!.name, sessionType: 'study',
      startTime: new Date(start).toISOString(), endTime: new Date(start + 60 * minute).toISOString(),
    });
  }
  // A focus round that is running right now.
  const now = Date.now();
  const { session } = await call<{ session: { id: number; updatedAt: string } }>('POST', '/study-sessions', {
    courseId: courses[0]!.id, title: 'Eigenvalues problem set', sessionType: 'pomodoro',
    startTime: new Date(now - 5 * minute).toISOString(), endTime: new Date(now + 55 * minute).toISOString(),
  });
  await call('POST', `/study-sessions/${session.id}/pomodoro`, { command: 'resume', expectedUpdatedAt: session.updatedAt });
  return { courseId: courses[0]!.id, password };
}

