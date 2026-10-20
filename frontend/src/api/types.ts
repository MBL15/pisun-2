export type RoleType = 'USER' | 'CHILD' | 'ADMIN' | 'ORGANIZATION'
export type EventStatus = 'PUBLISHED' | 'ON_REVIEW' | 'UNPUBLISHED' | 'DELETED'
export type RegistrationMode = 'FREE' | 'BY_APPLICATION'
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type AiStatus = 'AI_APPROVED' | 'FLAGGED'
export type AgeRestriction = 'CHILD_SAFE' | 'ADULT_ONLY'
export type Audience = 'ALL' | 'KIDS' | 'ADULTS'
export type OrganizerType = 'USER' | 'ORGANIZATION'
export type SkillLevel = 'ANY' | 'BEGINNER' | 'AMATEUR' | 'PRO'
export type Gender = 'MALE' | 'FEMALE'
export type EventVisibility = 'PUBLIC' | 'FRIENDS_ONLY'
export type FriendshipRelation = 'NONE' | 'FRIENDS' | 'OUTGOING' | 'INCOMING'
export type VerificationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

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
  gender: Gender | null
  familyId: number | null
  spouseName: string | null
  parentId: number | null
  parentName: string | null
  organizationId: number | null
  organizationName: string | null
  organizationStatus: ApplicationStatus | null
  demo: boolean
  demoLabel: string | null
  reputation: number
  canCreateEvents: boolean
  verified: boolean
  friendship: FriendshipRelation
  freeEventEntry: boolean
  lastActiveAt: string | null
}

export interface VerificationAttachment {
  fileName: string
  contentBase64: string
}

export interface VerificationRequest {
  id: number
  userId: number
  userDisplayName: string
  message: string
  attachments: VerificationAttachment[]
  status: VerificationRequestStatus
  rejectionReason: string | null
  reviewedBy: string | null
  createdAt: string
  reviewedAt: string | null
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
}

export interface SportSuggestItem {
  id: number
  name: string
  emoji: string | null
  score: number
}

export interface AgentSuggestion {
  type: 'INFO' | 'WARNING' | 'FLAG' | string
  field: string
  message: string
  confidence: number
  autoApplicable: boolean
}

export interface EventVerificationPreview {
  verdictId: number | null
  status: AiStatus
  ageRestriction: AgeRestriction
  summary: string
  reasons: string[]
  recommendations: string[]
  source: string
  hold: boolean
  checkedAt: string
  suggestions: AgentSuggestion[]
  descriptionVariants: string[]
}

export interface SportNormalizeResult {
  existingSportTypeId: number | null
  existingSportName: string | null
  proposedName: string | null
  category: string | null
  emoji: string | null
  tags: string[]
  defaultAgeRestriction: string
  acceptable: boolean
  explanation: string
  suggestions: AgentSuggestion[]
  source: string
}

export interface AgentStats {
  checks24h: number
  flagged24h: number
  autoUnpublish24h: number
  topFlagReasons: string[]
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
  awaitingParentApproval: boolean
}

export interface EventReviewSummary {
  averageStars: number
  count: number
}

export interface EventReview {
  id: number
  eventId: number
  authorId: number
  authorName: string
  authorAvatarColor: string | null
  stars: number
  comment: string | null
  createdAt: string
  updatedAt: string
  mine: boolean
}

export interface ViewerState {
  organizer: boolean
  registrationOpen: boolean
  registrationBlockedReason: string | null
  canSeeContacts: boolean
  myRegistrations: Registration[]
  canLeaveReview: boolean
  reviewBlockedReason: string | null
  myReviewStars: number | null
  reputationPenaltyApplied: number | null
  reputationAfter: number | null
}

export interface SportEvent {
  id: number
  title: string
  description: string
  sportTypeId: number
  sportName: string
  sportEmoji: string | null
  sportCustom: boolean
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
  visibility: EventVisibility
  organizerVerified: boolean
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
  reviews: EventReviewSummary
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
  visibility?: EventVisibility | null
  inviteFriendIds?: number[] | null
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

export interface Family {
  id: number
  maleUserId: number | null
  maleName: string | null
  femaleUserId: number | null
  femaleName: string | null
  children: User[]
  canAddSpouse: boolean
}

export interface RegisterRequest {
  displayName: string
  email?: string
  age?: number
  city?: string
  interests?: string
  bio?: string
  role: 'USER' | 'ORGANIZATION'
  gender?: Gender
  organization?: OrganizationForm
}
