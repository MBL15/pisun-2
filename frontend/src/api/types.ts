export type RoleType = 'USER' | 'CHILD' | 'ADMIN' | 'ORGANIZATION'
export type EventStatus = 'PUBLISHED' | 'ON_REVIEW' | 'UNPUBLISHED' | 'DELETED'
export type RegistrationMode = 'FREE' | 'BY_APPLICATION'
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type AiStatus = 'AI_APPROVED' | 'FLAGGED'
export type AgeRestriction = 'CHILD_SAFE' | 'ADULT_ONLY'
export type Audience = 'ALL' | 'KIDS' | 'ADULTS'
export type OrganizerType = 'USER' | 'ORGANIZATION'
export type SkillLevel = 'ANY' | 'BEGINNER' | 'AMATEUR' | 'PRO'

export interface User {
  id: number
  displayName: string
  email: string | null
  role: RoleType
  age: number | null
  city: string | null
  bio: string | null
  interests: string | null
  avatarColor: string | null
  parentId: number | null
  parentName: string | null
  organizationId: number | null
  organizationName: string | null
  organizationStatus: ApplicationStatus | null
  demo: boolean
  demoLabel: string | null
}

export interface Organization {
  id: number
  name: string
  description: string
  sportsInterests: string
  city: string | null
  address: string | null
  contacts: string | null
  website: string | null
  logoColor: string | null
  status: ApplicationStatus
  rejectionReason: string | null
  ownerUserId: number
  ownerName: string | null
  createdAt: string
  reviewedAt: string | null
  reviewedBy: string | null
}

export interface OrganizationForm {
  name: string
  description: string
  sportsInterests: string
  city?: string
  address?: string
  contacts?: string
  website?: string
}

export interface SportType {
  id: number
  name: string
  emoji: string | null
  custom: boolean
  eventsCount: number
  category?: string | null
  icon?: string | null
  tags?: string | null
  defaultAge?: AgeRestriction | null
  description?: string | null
  equipment?: string | null
  safetyNotes?: string | null
  typicalDurationMinutes?: number | null
}

export interface AgentSuggestion {
  type: string
  field: string | null
  message: string
  confidence: number
  autoApplicable: boolean
}

export interface SportHit {
  sport: SportType
  confidence: number
  message: string
}

export interface SportProposal {
  decision: 'MATCH' | 'ADDED' | 'REJECTED'
  message: string
  sport: SportType | null
  similar: SportHit[]
  canonicalName: string | null
  category: string | null
  defaultAge: AgeRestriction | null
  icon: string | null
}

export interface GeoPlace {
  address: string
  latitude: number
  longitude: number
}

export interface RoutePlan {
  mode: string
  distanceMeters: number
  durationSeconds: number
  points: { latitude: number; longitude: number }[]
}

export interface GuardianReport {
  checks: number
  flagged: number
  autoUnpublished: number
  topReasons: string[]
  flaggedVisibleComments: number
  commentSuggestion: string
}

export interface SportMetrics {
  top: SportType[]
  orphans: SportType[]
  recent: SportType[]
}

export interface MergeProposal {
  source: SportType
  target: SportType
  confidence: number
  reason: string
}

export interface Registration {
  id: number
  eventId: number
  participantId: number
  participantName: string
  child: boolean
  participantAge: number | null
  registeredById: number | null
  registeredByName: string | null
  status: ApplicationStatus
  message: string | null
  decisionComment: string | null
  createdAt: string
  decidedAt: string | null
}

export interface ViewerState {
  organizer: boolean
  registrationOpen: boolean
  registrationBlockedReason: string | null
  canSeeContacts: boolean
  myRegistrations: Registration[]
}

export interface SportEvent {
  id: number
  title: string
  description: string
  sportTypeId: number
  sportName: string
  sportEmoji: string | null
  sportCustom: boolean
  sportEquipment?: string | null
  sportSafetyNotes?: string | null
  startAt: string
  endAt: string
  durationMinutes: number
  address: string
  locationNote: string | null
  latitude: number | null
  longitude: number | null
  conditions: string | null
  level: SkillLevel
  audience: Audience
  capacity: number | null
  registrationMode: RegistrationMode
  status: EventStatus
  organizerType: OrganizerType
  organizerUserId: number
  organizerName: string
  organizationId: number | null
  organizerContact: string | null
  aiStatus: AiStatus | null
  ageRestriction: AgeRestriction | null
  aiSummary: string | null
  aiReasons: string[]
  moderationReason: string | null
  moderatedBy: string | null
  moderatedAt: string | null
  createdAt: string
  participantsCount: number
  pendingCount: number
  spotsLeft: number | null
  commentsCount: number
  past: boolean
  viewer: ViewerState
}

export interface EventForm {
  title: string
  description: string
  sportTypeId: number | null
  customSportName: string | null
  startAt: string
  durationMinutes: number
  address: string
  locationNote: string | null
  latitude: number | null
  longitude: number | null
  conditions: string | null
  level: SkillLevel
  audience: Audience
  capacity: number | null
  registrationMode: RegistrationMode
  organizerContact: string | null
}

export interface EventFilters {
  q?: string
  sportTypeId?: number
  mode?: RegistrationMode
  from?: string
  to?: string
  childSafe?: boolean
  organizationId?: number
  organizerUserId?: number
  scope?: 'public' | 'all'
  status?: EventStatus
  includePast?: boolean
}

export interface MyRegistration {
  registration: Registration
  event: SportEvent
}

export interface Comment {
  id: number
  eventId: number
  eventTitle: string | null
  parentId: number | null
  authorId: number
  authorName: string
  authorRole: RoleType | null
  authorAvatarColor: string | null
  organizerReply: boolean
  text: string | null
  hidden: boolean
  hiddenByAi: boolean
  hiddenReason: string | null
  createdAt: string
  canDelete: boolean
}

export interface AiVerdict {
  id: number
  eventId: number | null
  eventTitle: string
  organizerName: string | null
  organizationEvent: boolean
  status: AiStatus
  ageRestriction: AgeRestriction
  summary: string
  reasons: string[]
  source: string
  hold: boolean
  createdAt: string
}

export interface VerificationResult {
  verdictId: number | null
  status: AiStatus
  ageRestriction: AgeRestriction
  summary: string
  reasons: string[]
  recommendations: string[]
  source: string
  hold: boolean
  checkedAt: string
  suggestions?: AgentSuggestion[]
  ageExplanation?: string | null
}

export interface AiSettings {
  aiEnabled: boolean
  autoHoldFlagged: boolean
  llmEnabled: boolean
  commentFilterEnabled: boolean
  customStopWords: string | null
  llmConfigured: boolean
  llmModel: string
  updatedAt: string | null
  updatedBy: string | null
}

export interface ModerationAction {
  id: number
  type:
    | 'ORGANIZATION_APPROVED'
    | 'ORGANIZATION_REJECTED'
    | 'EVENT_UNPUBLISHED'
    | 'EVENT_DELETED'
    | 'EVENT_PUBLISHED'
    | 'COMMENT_HIDDEN'
    | 'COMMENT_RESTORED'
    | 'COMMENT_DELETED'
    | 'SETTINGS_CHANGED'
    | 'SPORT_MERGED'
  targetType: string
  targetId: number | null
  targetTitle: string | null
  reason: string | null
  adminId: number
  adminName: string
  createdAt: string
}

export interface DocumentTemplate {
  id: number
  code: string
  name: string
  description: string | null
  content: string
  updatedBy: string | null
  updatedAt: string | null
}

export interface GeneratedDocument {
  templateCode: string
  templateName: string
  fileName: string
  html: string
}

export interface RegisterRequest {
  displayName: string
  email?: string
  age?: number
  city?: string
  interests?: string
  bio?: string
  role: 'USER' | 'ORGANIZATION'
  organization?: OrganizationForm
}
