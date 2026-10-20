import type {
  User,
  Subject,
  DigitalBook,
  Announcement,
  Quiz,
  QuizAttempt,
  AttendanceEvent,
  AttendanceRecord,
  ScanResultPayload,
  PasswordResetRequest,
} from '../types/index.ts';

const TOKEN_KEY = 'tamvesta_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request gagal dengan status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ token: string; user: User; mustChangePassword: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () =>
    request<{ user: User; mustChangePassword: boolean }>('/api/auth/me'),

  changePassword: (passwords: { oldPassword: string; newPassword: string }) =>
    request<{ message: string; user: User }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    }),

  updateUsername: (newUsername: string) =>
    request<{ message: string; user: User; token: string }>('/api/auth/username', {
      method: 'PUT',
      body: JSON.stringify({ newUsername }),
    }),

  submitPasswordResetRequest: (reason: string) =>
    request<{ message: string; request: PasswordResetRequest }>('/api/auth/password-reset-request', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Admin: Password Reset Requests
  getPasswordResetRequests: () =>
    request<PasswordResetRequest[]>('/api/admin/password-reset-requests'),

  processPasswordResetRequest: (
    id: string,
    data: { status: 'approved' | 'rejected'; tempPassword?: string; adminNote?: string }
  ) =>
    request<{ message: string; request: PasswordResetRequest; tempPassword?: string }>(
      `/api/admin/password-reset-requests/${id}/process`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  // Admin: Student Management
  getStudents: () => request<User[]>('/api/admin/students'),

  createStudent: (studentData: { name: string; username: string; password: string; nisn?: string; kelas?: string }) =>
    request<{ message: string; student: User }>('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    }),

  toggleStudentActive: (studentId: string) =>
    request<{ message: string; isActive: boolean }>(`/api/admin/students/${studentId}/toggle-active`, {
      method: 'PATCH',
    }),

  resetStudentPassword: (studentId: string, newPassword: string) =>
    request<{ message: string }>(`/api/admin/students/${studentId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  // Subjects
  getSubjects: () => request<Subject[]>('/api/subjects'),

  addSubject: (data: Partial<Subject>) =>
    request<Subject>('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSubject: (id: string, data: Partial<Subject>) =>
    request<Subject>(`/api/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSubject: (id: string) =>
    request<{ message: string }>(`/api/subjects/${id}`, {
      method: 'DELETE',
    }),

  // Books
  getBooks: () => request<DigitalBook[]>('/api/books'),

  addBook: (data: Partial<DigitalBook>) =>
    request<DigitalBook>('/api/books', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBook: (id: string, data: Partial<DigitalBook>) =>
    request<DigitalBook>(`/api/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteBook: (id: string) =>
    request<{ message: string }>(`/api/books/${id}`, {
      method: 'DELETE',
    }),

  // Announcements
  getAnnouncements: () => request<Announcement[]>('/api/announcements'),

  addAnnouncement: (data: Partial<Announcement>) =>
    request<Announcement>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAnnouncement: (id: string, data: Partial<Announcement>) =>
    request<Announcement>(`/api/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteAnnouncement: (id: string) =>
    request<{ message: string }>(`/api/announcements/${id}`, {
      method: 'DELETE',
    }),

  // Quizzes
  getQuizzes: () => request<Quiz[]>('/api/quizzes'),

  getQuizById: (id: string) => request<Quiz>(`/api/quizzes/${id}`),

  verifyQuizToken: (payload: { token: string; studentName?: string; password?: string }) =>
    request<{ success: boolean; quiz: Quiz }>('/api/quizzes/verify-token', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  generateQuizToken: () =>
    request<{ token: string }>('/api/quizzes/generate-token', {
      method: 'POST',
    }),

  addQuiz: (data: Partial<Quiz>) =>
    request<Quiz>('/api/quizzes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateQuiz: (id: string, data: Partial<Quiz>) =>
    request<Quiz>(`/api/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteQuiz: (id: string) =>
    request<{ message: string }>(`/api/quizzes/${id}`, {
      method: 'DELETE',
    }),

  submitQuiz: (
    quizId: string,
    payload: { answers: { questionId: string; selectedOption: number }[]; tokenUsed?: string }
  ) =>
    request<{ message: string; attempt: QuizAttempt }>(`/api/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getQuizAttempts: (quizId?: string) =>
    request<QuizAttempt[]>(quizId ? `/api/quiz-attempts?quizId=${quizId}` : '/api/quiz-attempts'),

  // Attendance
  getAttendanceEvents: () => request<(AttendanceEvent & { totalAttendees?: number })[]>('/api/attendance/events'),

  createAttendanceEvent: (data: Partial<AttendanceEvent>) =>
    request<AttendanceEvent>('/api/attendance/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  toggleEventSession: (id: string) =>
    request<{ message: string; isOpen: boolean }>(`/api/attendance/events/${id}/toggle-session`, {
      method: 'PATCH',
    }),

  deleteAttendanceEvent: (id: string) =>
    request<{ message: string }>(`/api/attendance/events/${id}`, {
      method: 'DELETE',
    }),

  scanQr: (data: { qrData: string; eventId: string }) =>
    request<ScanResultPayload>('/api/attendance/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAttendanceRecords: (eventId?: string) =>
    request<AttendanceRecord[]>(eventId ? `/api/attendance/records?eventId=${eventId}` : '/api/attendance/records'),

  getExportUrl: (eventId: string) => `/api/attendance/export/${eventId}`,
};
