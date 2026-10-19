import { api, buildQuery, API_URL } from './client'
import type {
  AiSettings,
  AiVerdict,
  ApplicationStatus,
  Comment,
  DocumentTemplate,
  EventFilters,
  EventForm,
  GeneratedDocument,
  ModerationAction,
  MyRegistration,
  Organization,
  OrganizationForm,
  RegisterRequest,
  Registration,
  SportEvent,
  SportType,
  SportSuggestItem,
  SportNormalizeResult,
  EventVerificationPreview,
  AgentStats,
  User,
} from './types'

export const usersApi = {
  list: (demo = false) => api.get<User[]>(`/api/users${buildQuery({ demo })}`),
  get: (id: number) => api.get<User>(`/api/users/${id}`),
  register: (body: RegisterRequest) => api.post<User>('/api/users', body),
  update: (id: number, body: { displayName: string; city: string | null; interests: string | null; bio: string | null }) =>
    api.put<User>(`/api/users/${id}`, body),
  children: (id: number) => api.get<User[]>(`/api/users/${id}/children`),
  addChild: (id: number, body: { displayName: string; age: number; interests?: string }) =>
    api.post<User>(`/api/users/${id}/children`, body),
}

export const organizationsApi = {
  list: (params: { status?: ApplicationStatus; q?: string } = {}) =>
    api.get<Organization[]>(`/api/organizations${buildQuery(params)}`),
  get: (id: number) => api.get<Organization>(`/api/organizations/${id}`),
  my: () => api.get<Organization>('/api/organizations/my'),
  submit: (body: OrganizationForm) => api.post<Organization>('/api/organizations', body),
  update: (id: number, body: OrganizationForm) => api.put<Organization>(`/api/organizations/${id}`, body),
}

export const sportsApi = {
  list: () => api.get<SportType[]>('/api/sports'),
  suggest: (q: string) => api.get<SportSuggestItem[]>(`/api/sports/suggest${buildQuery({ q })}`),
  propose: (name: string) => api.post<SportNormalizeResult>('/api/sports/propose', { name }),
}

export const eventsApi = {
  list: (filters: EventFilters = {}) => api.get<SportEvent[]>(`/api/events${buildQuery(filters)}`),
  get: (id: number) => api.get<SportEvent>(`/api/events/${id}`),
  mine: () => api.get<SportEvent[]>('/api/events/my'),
  create: (body: EventForm) => api.post<SportEvent>('/api/events', body),
  update: (id: number, body: EventForm) => api.put<SportEvent>(`/api/events/${id}`, body),
  registrations: (id: number) => api.get<Registration[]>(`/api/events/${id}/registrations`),
  register: (id: number, body: { childId?: number; message?: string }) =>
    api.post<Registration>(`/api/events/${id}/registrations`, body),
  decide: (id: number, registrationId: number, status: 'APPROVED' | 'REJECTED', comment?: string) =>
    api.post<Registration>(`/api/events/${id}/registrations/${registrationId}/decision`, { status, comment }),
  cancel: (id: number, registrationId: number) =>
    api.post<Registration>(`/api/events/${id}/registrations/${registrationId}/cancel`),
  myRegistrations: () => api.get<MyRegistration[]>('/api/events/registrations/my'),
  comments: (id: number) => api.get<Comment[]>(`/api/events/${id}/comments`),
  addComment: (id: number, text: string, parentId?: number) =>
    api.post<Comment>(`/api/events/${id}/comments`, { text, parentId }),
}

export const commentsApi = {
  all: (params: { hidden?: boolean; q?: string } = {}) => api.get<Comment[]>(`/api/comments${buildQuery(params)}`),
  remove: (id: number) => api.delete<void>(`/api/comments/${id}`),
}

export const moderationApi = {
  approveOrganization: (id: number) => api.post<Organization>(`/api/moderation/organizations/${id}/approve`),
  rejectOrganization: (id: number, reason: string) =>
    api.post<Organization>(`/api/moderation/organizations/${id}/reject`, { reason }),
  unpublishEvent: (id: number, reason: string) => api.post(`/api/moderation/events/${id}/unpublish`, { reason }),
  deleteEvent: (id: number, reason: string) => api.post(`/api/moderation/events/${id}/delete`, { reason }),
  publishEvent: (id: number) => api.post(`/api/moderation/events/${id}/publish`),
  hideComment: (id: number, reason: string) => api.post(`/api/moderation/comments/${id}/hide`, { reason }),
  restoreComment: (id: number) => api.post(`/api/moderation/comments/${id}/restore`),
  deleteComment: (id: number, reason: string) => api.post(`/api/moderation/comments/${id}/delete`, { reason }),
  journal: () => api.get<ModerationAction[]>('/api/moderation/journal'),
}

export const aiApi = {
  verdicts: () => api.get<AiVerdict[]>('/api/ai/verdicts'),
  agentStats: () => api.get<AgentStats>('/api/ai/agent-stats'),
  verifyEventDraft: (body: {
    title: string
    description?: string | null
    conditions?: string | null
    sportName?: string | null
    audience: string
    startAt: string
    organizerName?: string
    organizationEvent?: boolean
    equipment?: string | null
  }) =>
    api.post<EventVerificationPreview>('/api/ai/verify-event', {
      eventId: null,
      ...body,
      mode: 'DRAFT',
      organizationEvent: body.organizationEvent ?? false,
    }),
  settings: () => api.get<AiSettings>('/api/ai/settings'),
  updateSettings: (body: Omit<AiSettings, 'llmConfigured' | 'llmModel' | 'updatedAt' | 'updatedBy'>) =>
    api.put<AiSettings>('/api/ai/settings', body),
}

export const documentsApi = {
  templates: () => api.get<DocumentTemplate[]>('/api/documents/templates'),
  placeholders: () => api.get<Record<string, string>>('/api/documents/placeholders'),
  updateTemplate: (code: string, body: { name: string; description: string | null; content: string }) =>
    api.put<DocumentTemplate>(`/api/documents/templates/${code}`, body),
  uploadTemplate: (code: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.upload<DocumentTemplate>(`/api/documents/templates/${code}/upload`, form)
  },
  resetTemplate: (code: string) => api.post<DocumentTemplate>(`/api/documents/templates/${code}/reset`),
  preview: (eventId: number, userId: number, childId?: number) =>
    api.get<GeneratedDocument>(`/api/documents/preview/${eventId}${buildQuery({ userId, childId })}`),
  generateUrl: (eventId: number, userId: number, childId?: number, download = false) =>
    `${API_URL}/api/documents/generate/${eventId}${buildQuery({ userId, childId, download: download || undefined })}`,
}
