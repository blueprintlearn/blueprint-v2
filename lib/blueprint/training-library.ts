/**
 * Stage 4.1 training library. Courses teach; they do not prove competency.
 * Company copies are independent of Blueprint master content. Enrollment,
 * grading, certification, AI generation, and marketplace sharing stay off.
 */

export const TRAINING_LIBRARY_TITLE = "Training library"
export const TRAINING_LIBRARY_OPENING =
  "Build the courses your DJs will take. Start from a Blueprint starter course or write your own. Publishing freezes a version, so later edits do not rewrite what someone already completed."
export const TRAINING_ENROLLMENT_CLOSED =
  "Trainee enrollment is not enabled yet. Building a course or path does not assign anyone, send invitations, grade work, or issue certifications."
export const TRAINING_STARTER_HELP =
  "These courses are approved for Blueprint companies. Adding one creates your own copy. Changes you make stay in your company and never change Blueprint’s master library."
export const TRAINING_UPDATE_AVAILABLE =
  "Blueprint published an update to the original course. Your copy is unchanged until you choose to review and adopt it."
export const TRAINING_PUBLISH_HELP =
  "Publishing freezes this version. You can keep editing a new draft afterward. Assigned copies of this version, when enrollment exists later, will keep this snapshot."
export const TRAINING_PUBLISH_CONFIRM_LABEL = "I have reviewed this course and want to publish this version"
export const TRAINING_PATH_PUBLISH_CONFIRM_LABEL = "I have reviewed this path and want to publish this version"
export const TRAINING_PUBLISH_CONFIRM_MESSAGE = "Confirm that you have reviewed this before publishing it."
export const TRAINING_ARCHIVE_HELP = "Archived courses stay in your company but are hidden from the main library. They are not deleted."
export const TRAINING_MASTER_TITLE = "Blueprint course library"
export const TRAINING_MASTER_OPENING =
  "Private courses stay with Blueprint until a platform administrator publishes them to the Starter Library. Imported legacy content starts private. Company owners never see private master courses."
export const TRAINING_PATH_OPENING =
  "A training path is an ordered set of your courses for a role. You can make a beginner path, an experienced-DJ path, or a custom mix. Advancement ladders come later."
export const TRAINING_CREATE_COURSE = "Create a course"
export const TRAINING_CREATE_PATH = "Create a path"
export const TRAINING_ADOPT_STARTER = "Add to my library"
export const TRAINING_ADOPT_UPDATE = "Review and adopt update"
export const TRAINING_NO_STARTER = "There are no approved starter courses yet."
export const TRAINING_NO_COURSES = "You do not have any courses yet. Add a starter course or create one from scratch."
export const TRAINING_NO_PATHS = "You do not have any training paths yet."
export const TRAINING_SAVED = "Training library saved."
export const TRAINING_PUBLISHED = "Course version published."
export const TRAINING_PATH_PUBLISHED = "Path version published."
export const TRAINING_TITLE_REQUIRED = "Enter a title."
export const TRAINING_LESSON_REQUIRED = "Enter a lesson title."
export const TRAINING_BLOCK_INVALID = "Check the lesson content. Each block needs the fields for its type."
export const TRAINING_QUIZ_INVALID = "Each quiz needs a title, questions, and at least two answer choices for scored questions."
export const TRAINING_ASSIGNMENT_INVALID = "Each assignment needs a title and instructions."
export const TRAINING_PATH_COURSES_INVALID = "Choose courses from your library. A path cannot include another company’s courses."
export const TRAINING_STARTER_UNAVAILABLE = "That starter course is not available."
export const TRAINING_COURSE_MISSING = "That course is not in your library."
export const TRAINING_PATH_MISSING = "That path is not in your library."
export const TRAINING_MASTER_MISSING = "That master course is not available."
export const TRAINING_NOT_ADMIN = "Only a Blueprint platform administrator can change the master library."
export const TRAINING_VISIBILITY_STARTER_NEEDS_PUBLISH =
  "Publish a version before adding this course to the Starter Library."

export const TRAINING_VERSION_STATUSES = ["draft", "published", "superseded"] as const
export type TrainingVersionStatus = (typeof TRAINING_VERSION_STATUSES)[number]

export const TRAINING_LIBRARY_STATUSES = ["active", "archived"] as const
export type TrainingLibraryStatus = (typeof TRAINING_LIBRARY_STATUSES)[number]

export const MASTER_VISIBILITIES = ["private", "starter", "archived"] as const
export type MasterVisibility = (typeof MASTER_VISIBILITIES)[number]

export const MASTER_VISIBILITY_LABELS: Record<MasterVisibility, string> = {
  private: "Private",
  starter: "Starter Library",
  archived: "Archived",
}

export const COURSE_ORIGINS = ["original", "adopted"] as const
export type CourseOrigin = (typeof COURSE_ORIGINS)[number]

export const COURSE_CATEGORIES = [
  "general",
  "onboarding",
  "mixing",
  "mc",
  "audio",
  "equipment",
  "company_standards",
] as const
export type CourseCategory = (typeof COURSE_CATEGORIES)[number]

export const COURSE_CATEGORY_LABELS: Record<CourseCategory, string> = {
  general: "General",
  onboarding: "Onboarding",
  mixing: "Mixing",
  mc: "MC and announcements",
  audio: "Audio",
  equipment: "Equipment",
  company_standards: "Company standards",
}

export const COURSE_EXPERIENCE_LEVELS = ["beginner", "experienced", "custom"] as const
export type CourseExperienceLevel = (typeof COURSE_EXPERIENCE_LEVELS)[number]

export const COURSE_EXPERIENCE_LABELS: Record<CourseExperienceLevel, string> = {
  beginner: "Beginner",
  experienced: "Experienced",
  custom: "Custom",
}

export const LESSON_ACCESS_MODES = ["sequential", "open"] as const
export type LessonAccessMode = (typeof LESSON_ACCESS_MODES)[number]

export const LESSON_ACCESS_LABELS: Record<LessonAccessMode, string> = {
  sequential: "One lesson at a time, in order",
  open: "Trainees can open any lesson",
}

export const QUIZ_GRADING_MODES = ["objective"] as const
export type QuizGradingMode = (typeof QUIZ_GRADING_MODES)[number]

export const WRITTEN_FEEDBACK_MODES = ["none", "ai_assisted"] as const
export type WrittenFeedbackMode = (typeof WRITTEN_FEEDBACK_MODES)[number]

export const ASSIGNMENT_APPROVAL_MODES = ["none", "human"] as const
export type AssignmentApprovalMode = (typeof ASSIGNMENT_APPROVAL_MODES)[number]

export const SUBMISSION_MODES = ["online", "in_person", "either"] as const
export type SubmissionMode = (typeof SUBMISSION_MODES)[number]

export const CERTIFICATION_REQUIREMENTS = ["none", "automatic", "human_approved"] as const
export type CertificationRequirement = (typeof CERTIFICATION_REQUIREMENTS)[number]

export const CERTIFICATION_LABELS: Record<CertificationRequirement, string> = {
  none: "No certification in this course",
  automatic: "Automatic when requirements are met (later)",
  human_approved: "Human approval required (later)",
}

export const PATH_FOCUS_VALUES = ["beginner", "experienced", "custom"] as const
export type PathFocus = (typeof PATH_FOCUS_VALUES)[number]

export const PATH_FOCUS_LABELS: Record<PathFocus, string> = {
  beginner: "Beginner",
  experienced: "Experienced",
  custom: "Custom",
}

export const CONTENT_BLOCK_TYPES = ["text", "video", "image", "resource", "quiz", "assignment"] as const
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number]

export const CONTENT_BLOCK_LABELS: Record<ContentBlockType, string> = {
  text: "Text",
  video: "Video",
  image: "Image",
  resource: "Downloadable resource",
  quiz: "Quiz",
  assignment: "Assignment",
}

export const QUIZ_QUESTION_KINDS = ["single_choice", "multiple_choice", "true_false", "written"] as const
export type QuizQuestionKind = (typeof QUIZ_QUESTION_KINDS)[number]

export const QUIZ_QUESTION_LABELS: Record<QuizQuestionKind, string> = {
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  true_false: "True or false",
  written: "Written",
}

export const TRAINING_ACTOR_ROLES = ["company_owner", "training_manager", "designated_trainer", "trainee"] as const
export type TrainingActorRole = (typeof TRAINING_ACTOR_ROLES)[number]

export const TITLE_MAX = 80
export const DESCRIPTION_MAX = 400
export const ROLE_MAX = 80
export const BODY_MAX = 8000
export const URL_MAX = 500
export const LESSON_MAX = 40
export const BLOCK_MAX = 12
export const QUESTION_MAX = 8
export const OPTION_MAX = 6
export const PATH_COURSE_MAX = 20
export const DURATION_MIN = 1
export const DURATION_MAX = 600
export const RETRY_MAX = 20
export const WAIT_HOURS_MAX = 720
export const SCORE_MAX = 100

export const DEFAULT_RETRY_LIMIT = 3
export const DEFAULT_RETRY_WAIT_HOURS = 0
export const DEFAULT_PASSING_SCORE = 80

export type LegacyRef = {
  sourceId: string | null
  contentVersion: string | null
}

export type QuizOption = {
  id: string
  label: string
  correct: boolean
}

export type QuizQuestion = {
  id: string
  prompt: string
  kind: QuizQuestionKind
  options: QuizOption[]
  writtenFeedback: WrittenFeedbackMode
}

export type QuizConfig = {
  grading: QuizGradingMode
  retryLimit: number | null
  retryWaitHours: number | null
  passingScorePercent: number | null
}

export type TextBlock = { id: string; type: "text"; body: string }
export type VideoBlock = { id: string; type: "video"; url: string; caption: string }
export type ImageBlock = { id: string; type: "image"; url: string; alt: string }
export type ResourceBlock = { id: string; type: "resource"; url: string; label: string }
export type QuizBlock = {
  id: string
  type: "quiz"
  title: string
  questions: QuizQuestion[]
  config: QuizConfig
}
export type AssignmentBlock = {
  id: string
  type: "assignment"
  title: string
  instructions: string
  verification: "online" | "in_person"
  requiresHumanApproval: boolean
  retryLimit: number | null
}

export type ContentBlock = TextBlock | VideoBlock | ImageBlock | ResourceBlock | QuizBlock | AssignmentBlock

export type LessonCompletion = {
  requireAllBlocks: boolean
  requiredBlockIds: string[]
}

export type LessonProgression = {
  lockedUntilPreviousComplete: boolean
}

export type LessonContent = {
  id: string
  title: string
  description: string
  completion: LessonCompletion
  progression: LessonProgression
  blocks: ContentBlock[]
  legacy: LegacyRef
}

export type CourseProgression = {
  lessonAccess: LessonAccessMode
  requireCompletionBeforeAdvance: boolean
}

export type CourseAssessment = {
  quizGrading: QuizGradingMode
  writtenFeedback: WrittenFeedbackMode
  assignmentApproval: AssignmentApprovalMode
  submissionMode: SubmissionMode
  retryLimit: number | null
  retryWaitHours: number | null
  certificationRequirement: CertificationRequirement
}

export type CourseExtensions = {
  ai: { courseCreation: boolean; legacyMigration: boolean; modernization: boolean }
  marketplace: { sharing: "none"; creatorOwnership: null; license: null }
}

export type CourseContent = {
  title: string
  description: string
  category: CourseCategory
  intendedRole: string
  experienceLevel: CourseExperienceLevel
  estimatedDurationMinutes: number
  progression: CourseProgression
  assessment: CourseAssessment
  lessons: LessonContent[]
  extensions: CourseExtensions
  legacy: LegacyRef
}

export type PathCourseRef = {
  courseId: string
  prerequisiteCourseIds: string[]
}

export type PathContent = {
  title: string
  description: string
  intendedRole: string
  focus: PathFocus
  courses: PathCourseRef[]
  extensions: CourseExtensions
}

export type StoredCourseVersion = {
  id: string
  version: number
  status: TrainingVersionStatus
  content: CourseContent
  publishedBy: string | null
  publishedAt: string | null
}

export type StoredMasterCourse = {
  id: string
  title: string
  visibility: MasterVisibility
  legacy: LegacyRef
  versions: StoredCourseVersion[]
}

export type StoredCompanyCourse = {
  id: string
  companyId: string
  title: string
  origin: CourseOrigin
  sourceMasterCourseId: string | null
  sourceMasterVersion: number | null
  libraryStatus: TrainingLibraryStatus
  legacy: LegacyRef
  versions: StoredCourseVersion[]
}

export type StoredPathVersion = {
  id: string
  version: number
  status: TrainingVersionStatus
  content: PathContent
  publishedBy: string | null
  publishedAt: string | null
}

export type StoredTrainingPath = {
  id: string
  companyId: string
  title: string
  libraryStatus: TrainingLibraryStatus
  versions: StoredPathVersion[]
}

export type SaveTrainingLibraryState = { error: string | null; savedAt: number | null }

export const emptyLegacyRef: LegacyRef = { sourceId: null, contentVersion: null }

export const defaultExtensions = (): CourseExtensions => ({
  ai: { courseCreation: false, legacyMigration: false, modernization: false },
  marketplace: { sharing: "none", creatorOwnership: null, license: null },
})

export function newId(): string {
  return crypto.randomUUID()
}

function asTrimmed(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (text.length < min || text.length > max) return null
  return text
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null
}

function asInt(value: unknown, min: number, max: number): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed >= min && parsed <= max) return parsed
  }
  return null
}

function asOptionalInt(value: unknown, min: number, max: number): number | null | undefined {
  if (value == null || value === "") return null
  const parsed = asInt(value, min, max)
  return parsed === null ? undefined : parsed
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (value === "1" || value === "true") return true
  if (value === "0" || value === "false" || value === "" || value == null) return false
  return null
}

function asLegacy(value: unknown): LegacyRef | null {
  if (value == null) return emptyLegacyRef
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const sourceId = record.sourceId == null ? null : asTrimmed(record.sourceId, 1, 120)
  const contentVersion = record.contentVersion == null ? null : asTrimmed(record.contentVersion, 1, 120)
  if (record.sourceId != null && sourceId == null) return null
  if (record.contentVersion != null && contentVersion == null) return null
  return { sourceId, contentVersion }
}

function asExtensions(value: unknown): CourseExtensions | null {
  if (value == null) return defaultExtensions()
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const ai = record.ai && typeof record.ai === "object" ? (record.ai as Record<string, unknown>) : null
  const marketplace =
    record.marketplace && typeof record.marketplace === "object" ? (record.marketplace as Record<string, unknown>) : null
  if (!ai || !marketplace) return null
  if (ai.courseCreation !== false || ai.legacyMigration !== false || ai.modernization !== false) return null
  if (marketplace.sharing !== "none" || marketplace.creatorOwnership != null || marketplace.license != null) return null
  return defaultExtensions()
}

function asQuizOption(value: unknown): QuizOption | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const id = asTrimmed(record.id, 1, 80)
  const label = asTrimmed(record.label, 1, TITLE_MAX)
  const correct = asBoolean(record.correct)
  if (!id || !label || correct == null) return null
  return { id, label, correct }
}

function asQuizQuestion(value: unknown): QuizQuestion | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const id = asTrimmed(record.id, 1, 80)
  const prompt = asTrimmed(record.prompt, 1, DESCRIPTION_MAX)
  const kind = asEnum(record.kind, QUIZ_QUESTION_KINDS)
  const writtenFeedback = asEnum(record.writtenFeedback, WRITTEN_FEEDBACK_MODES) ?? "none"
  if (!id || !prompt || !kind) return null
  if (kind === "written") {
    if (record.options != null && (!Array.isArray(record.options) || record.options.length > 0)) return null
    return { id, prompt, kind, options: [], writtenFeedback }
  }
  if (!Array.isArray(record.options) || record.options.length < 2 || record.options.length > OPTION_MAX) return null
  const options = record.options.map(asQuizOption)
  if (options.some((option) => option == null)) return null
  const parsed = options as QuizOption[]
  const correctCount = parsed.filter((option) => option.correct).length
  if (kind === "single_choice" || kind === "true_false") {
    if (correctCount !== 1) return null
  }
  if (kind === "true_false" && parsed.length !== 2) return null
  if (kind === "multiple_choice" && correctCount < 1) return null
  return { id, prompt, kind, options: parsed, writtenFeedback }
}

function asQuizConfig(value: unknown): QuizConfig | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const grading = asEnum(record.grading, QUIZ_GRADING_MODES)
  if (!grading) return null
  const retryLimit = asOptionalInt(record.retryLimit, 0, RETRY_MAX)
  const retryWaitHours = asOptionalInt(record.retryWaitHours, 0, WAIT_HOURS_MAX)
  const passingScorePercent = asOptionalInt(record.passingScorePercent, 0, SCORE_MAX)
  if (retryLimit === undefined || retryWaitHours === undefined || passingScorePercent === undefined) return null
  return { grading, retryLimit, retryWaitHours, passingScorePercent }
}

function asBlock(value: unknown): ContentBlock | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const id = asTrimmed(record.id, 1, 80)
  const type = asEnum(record.type, CONTENT_BLOCK_TYPES)
  if (!id || !type) return null
  if (type === "text") {
    const body = asTrimmed(record.body, 1, BODY_MAX)
    return body ? { id, type, body } : null
  }
  if (type === "video") {
    const url = asTrimmed(record.url, 1, URL_MAX)
    const caption = record.caption == null || record.caption === "" ? "" : asTrimmed(record.caption, 1, DESCRIPTION_MAX)
    if (!url || caption == null) return null
    return { id, type, url, caption }
  }
  if (type === "image") {
    const url = asTrimmed(record.url, 1, URL_MAX)
    const alt = asTrimmed(record.alt, 1, TITLE_MAX)
    if (!url || !alt) return null
    return { id, type, url, alt }
  }
  if (type === "resource") {
    const url = asTrimmed(record.url, 1, URL_MAX)
    const label = asTrimmed(record.label, 1, TITLE_MAX)
    if (!url || !label) return null
    return { id, type, url, label }
  }
  if (type === "quiz") {
    const title = asTrimmed(record.title, 1, TITLE_MAX)
    if (!title || !Array.isArray(record.questions) || record.questions.length < 1 || record.questions.length > QUESTION_MAX) {
      return null
    }
    const questions = record.questions.map(asQuizQuestion)
    const config = asQuizConfig(record.config)
    if (!config || questions.some((question) => question == null)) return null
    return { id, type, title, questions: questions as QuizQuestion[], config }
  }
  const title = asTrimmed(record.title, 1, TITLE_MAX)
  const instructions = asTrimmed(record.instructions, 1, BODY_MAX)
  const verification = record.verification === "online" || record.verification === "in_person" ? record.verification : null
  const requiresHumanApproval = asBoolean(record.requiresHumanApproval)
  const retryLimit = asOptionalInt(record.retryLimit, 0, RETRY_MAX)
  if (!title || !instructions || !verification || requiresHumanApproval == null || retryLimit === undefined) return null
  return { id, type, title, instructions, verification, requiresHumanApproval, retryLimit }
}

function asLesson(value: unknown): LessonContent | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const id = asTrimmed(record.id, 1, 80)
  const title = asTrimmed(record.title, 1, TITLE_MAX)
  const description = record.description == null || record.description === "" ? "" : asTrimmed(record.description, 1, DESCRIPTION_MAX)
  if (!id || !title || description == null) return null
  if (!Array.isArray(record.blocks) || record.blocks.length > BLOCK_MAX) return null
  const blocks = record.blocks.map(asBlock)
  if (blocks.some((block) => block == null)) return null
  const parsedBlocks = blocks as ContentBlock[]
  const completionRecord = record.completion && typeof record.completion === "object" ? (record.completion as Record<string, unknown>) : null
  const progressionRecord =
    record.progression && typeof record.progression === "object" ? (record.progression as Record<string, unknown>) : null
  const requireAllBlocks = asBoolean(completionRecord?.requireAllBlocks)
  const lockedUntilPreviousComplete = asBoolean(progressionRecord?.lockedUntilPreviousComplete)
  if (requireAllBlocks == null || lockedUntilPreviousComplete == null) return null
  const required = Array.isArray(completionRecord?.requiredBlockIds) ? completionRecord.requiredBlockIds : []
  if (required.length > BLOCK_MAX) return null
  const ids = new Set(parsedBlocks.map((block) => block.id))
  const requiredBlockIds: string[] = []
  for (const item of required) {
    if (typeof item !== "string" || !ids.has(item)) return null
    requiredBlockIds.push(item)
  }
  const legacy = asLegacy(record.legacy)
  if (!legacy) return null
  return {
    id,
    title,
    description,
    completion: { requireAllBlocks, requiredBlockIds },
    progression: { lockedUntilPreviousComplete },
    blocks: parsedBlocks,
    legacy,
  }
}

export function parseCourseContent(value: unknown): CourseContent | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const title = asTrimmed(record.title, 1, TITLE_MAX)
  const description = record.description == null || record.description === "" ? "" : asTrimmed(record.description, 1, DESCRIPTION_MAX)
  const category = asEnum(record.category, COURSE_CATEGORIES)
  const intendedRole = asTrimmed(record.intendedRole, 1, ROLE_MAX)
  const experienceLevel = asEnum(record.experienceLevel, COURSE_EXPERIENCE_LEVELS)
  const estimatedDurationMinutes = asInt(record.estimatedDurationMinutes, DURATION_MIN, DURATION_MAX)
  if (!title || description == null || !category || !intendedRole || !experienceLevel || estimatedDurationMinutes == null) {
    return null
  }
  const progressionRecord = record.progression && typeof record.progression === "object" ? (record.progression as Record<string, unknown>) : null
  const assessmentRecord = record.assessment && typeof record.assessment === "object" ? (record.assessment as Record<string, unknown>) : null
  const lessonAccess = asEnum(progressionRecord?.lessonAccess, LESSON_ACCESS_MODES)
  const requireCompletionBeforeAdvance = asBoolean(progressionRecord?.requireCompletionBeforeAdvance)
  const quizGrading = asEnum(assessmentRecord?.quizGrading, QUIZ_GRADING_MODES)
  const writtenFeedback = asEnum(assessmentRecord?.writtenFeedback, WRITTEN_FEEDBACK_MODES)
  const assignmentApproval = asEnum(assessmentRecord?.assignmentApproval, ASSIGNMENT_APPROVAL_MODES)
  const submissionMode = asEnum(assessmentRecord?.submissionMode, SUBMISSION_MODES)
  const certificationRequirement = asEnum(assessmentRecord?.certificationRequirement, CERTIFICATION_REQUIREMENTS)
  const retryLimit = asOptionalInt(assessmentRecord?.retryLimit, 0, RETRY_MAX)
  const retryWaitHours = asOptionalInt(assessmentRecord?.retryWaitHours, 0, WAIT_HOURS_MAX)
  if (
    !lessonAccess ||
    requireCompletionBeforeAdvance == null ||
    !quizGrading ||
    !writtenFeedback ||
    !assignmentApproval ||
    !submissionMode ||
    !certificationRequirement ||
    retryLimit === undefined ||
    retryWaitHours === undefined
  ) {
    return null
  }
  if (!Array.isArray(record.lessons) || record.lessons.length > LESSON_MAX) return null
  const lessons = record.lessons.map(asLesson)
  if (lessons.some((lesson) => lesson == null)) return null
  const extensions = asExtensions(record.extensions)
  const legacy = asLegacy(record.legacy)
  if (!extensions || !legacy) return null
  return {
    title,
    description,
    category,
    intendedRole,
    experienceLevel,
    estimatedDurationMinutes,
    progression: { lessonAccess, requireCompletionBeforeAdvance },
    assessment: {
      quizGrading,
      writtenFeedback,
      assignmentApproval,
      submissionMode,
      retryLimit,
      retryWaitHours,
      certificationRequirement,
    },
    lessons: lessons as LessonContent[],
    extensions,
    legacy,
  }
}

export function parsePathContent(value: unknown, allowedCourseIds?: ReadonlySet<string>): PathContent | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const title = asTrimmed(record.title, 1, TITLE_MAX)
  const description = record.description == null || record.description === "" ? "" : asTrimmed(record.description, 1, DESCRIPTION_MAX)
  const intendedRole = asTrimmed(record.intendedRole, 1, ROLE_MAX)
  const focus = asEnum(record.focus, PATH_FOCUS_VALUES)
  if (!title || description == null || !intendedRole || !focus) return null
  if (!Array.isArray(record.courses) || record.courses.length > PATH_COURSE_MAX) return null
  const seen = new Set<string>()
  const courses: PathCourseRef[] = []
  for (const item of record.courses) {
    if (!item || typeof item !== "object") return null
    const row = item as Record<string, unknown>
    const courseId = asTrimmed(row.courseId, 1, 80)
    if (!courseId || seen.has(courseId)) return null
    if (allowedCourseIds && !allowedCourseIds.has(courseId)) return null
    seen.add(courseId)
    const prerequisites = Array.isArray(row.prerequisiteCourseIds) ? row.prerequisiteCourseIds : []
    if (prerequisites.length > PATH_COURSE_MAX) return null
    const prerequisiteCourseIds: string[] = []
    for (const prerequisite of prerequisites) {
      if (typeof prerequisite !== "string" || !seen.has(prerequisite) || prerequisite === courseId) return null
      prerequisiteCourseIds.push(prerequisite)
    }
    courses.push({ courseId, prerequisiteCourseIds })
  }
  const extensions = asExtensions(record.extensions)
  if (!extensions) return null
  return { title, description, intendedRole, focus, courses, extensions }
}

export function emptyCourseContent(title = "Untitled course"): CourseContent {
  return {
    title,
    description: "",
    category: "general",
    intendedRole: "DJ",
    experienceLevel: "beginner",
    estimatedDurationMinutes: 30,
    progression: { lessonAccess: "sequential", requireCompletionBeforeAdvance: true },
    assessment: {
      quizGrading: "objective",
      writtenFeedback: "none",
      assignmentApproval: "human",
      submissionMode: "online",
      retryLimit: DEFAULT_RETRY_LIMIT,
      retryWaitHours: DEFAULT_RETRY_WAIT_HOURS,
      certificationRequirement: "none",
    },
    lessons: [],
    extensions: defaultExtensions(),
    legacy: { ...emptyLegacyRef },
  }
}

export function emptyPathContent(title = "Untitled path"): PathContent {
  return {
    title,
    description: "",
    intendedRole: "DJ",
    focus: "beginner",
    courses: [],
    extensions: defaultExtensions(),
  }
}

export function emptyLesson(title = "New lesson"): LessonContent {
  return {
    id: newId(),
    title,
    description: "",
    completion: { requireAllBlocks: true, requiredBlockIds: [] },
    progression: { lockedUntilPreviousComplete: true },
    blocks: [],
    legacy: { ...emptyLegacyRef },
  }
}

export function emptyBlock(type: ContentBlockType): ContentBlock {
  const id = newId()
  if (type === "text") return { id, type, body: "Write the lesson here." }
  if (type === "video") return { id, type, url: "https://vimeo.com/0", caption: "" }
  if (type === "image") return { id, type, url: "https://example.com/image.jpg", alt: "Lesson image" }
  if (type === "resource") return { id, type, url: "https://example.com/resource.pdf", label: "Download" }
  if (type === "quiz") {
    return {
      id,
      type,
      title: "Quiz",
      questions: [
        {
          id: newId(),
          prompt: "Which statement is correct?",
          kind: "single_choice",
          options: [
            { id: newId(), label: "First choice", correct: true },
            { id: newId(), label: "Second choice", correct: false },
          ],
          writtenFeedback: "none",
        },
      ],
      config: {
        grading: "objective",
        retryLimit: DEFAULT_RETRY_LIMIT,
        retryWaitHours: DEFAULT_RETRY_WAIT_HOURS,
        passingScorePercent: DEFAULT_PASSING_SCORE,
      },
    }
  }
  return {
    id,
    type: "assignment",
    title: "Assignment",
    instructions: "Describe what the trainee should do.",
    verification: "online",
    requiresHumanApproval: true,
    retryLimit: null,
  }
}

export function cloneCourseContent(content: CourseContent): CourseContent {
  return structuredClone(content)
}

export function clonePathContent(content: PathContent): PathContent {
  return structuredClone(content)
}

export function currentDraft<T extends { status: TrainingVersionStatus }>(rows: T[]): T | null {
  return rows.find((row) => row.status === "draft") ?? null
}

export function currentPublished<T extends { status: TrainingVersionStatus }>(rows: T[]): T | null {
  return rows.find((row) => row.status === "published") ?? null
}

export function editorVersion<T extends { status: TrainingVersionStatus }>(rows: T[]): T | null {
  return currentDraft(rows) ?? currentPublished(rows)
}

export function nextVersionNumber(rows: { version: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.version), 0) + 1
}

export function starterCatalogVisible(visibility: MasterVisibility, versionStatus: TrainingVersionStatus | null): boolean {
  return visibility === "starter" && versionStatus === "published"
}

export function companyCanSeeMaster(visibility: MasterVisibility): boolean {
  return visibility === "starter"
}

export function updateAvailable(course: Pick<StoredCompanyCourse, "origin" | "sourceMasterVersion">, latestMasterVersion: number | null): boolean {
  if (course.origin !== "adopted" || course.sourceMasterVersion == null || latestMasterVersion == null) return false
  return latestMasterVersion > course.sourceMasterVersion
}

export function replaceLesson(content: CourseContent, lesson: LessonContent): CourseContent | null {
  const index = content.lessons.findIndex((item) => item.id === lesson.id)
  if (index < 0) return null
  const next = cloneCourseContent(content)
  next.lessons[index] = lesson
  return next
}

export function addLessonToContent(content: CourseContent, lesson = emptyLesson()): CourseContent | null {
  if (content.lessons.length >= LESSON_MAX) return null
  const next = cloneCourseContent(content)
  next.lessons.push(lesson)
  return next
}

export function moveLessonInContent(content: CourseContent, lessonId: string, direction: "up" | "down"): CourseContent | null {
  const index = content.lessons.findIndex((item) => item.id === lessonId)
  if (index < 0) return null
  const swapWith = direction === "up" ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= content.lessons.length) return content
  const next = cloneCourseContent(content)
  const [lesson] = next.lessons.splice(index, 1)
  next.lessons.splice(swapWith, 0, lesson)
  return next
}

export function removeLessonFromContent(content: CourseContent, lessonId: string): CourseContent | null {
  if (!content.lessons.some((item) => item.id === lessonId)) return null
  const next = cloneCourseContent(content)
  next.lessons = next.lessons.filter((item) => item.id !== lessonId)
  return next
}

export function addBlockToLesson(lesson: LessonContent, type: ContentBlockType): LessonContent | null {
  if (lesson.blocks.length >= BLOCK_MAX) return null
  const next = structuredClone(lesson)
  next.blocks.push(emptyBlock(type))
  return next
}

export function moveBlockInLesson(lesson: LessonContent, blockId: string, direction: "up" | "down"): LessonContent | null {
  const index = lesson.blocks.findIndex((item) => item.id === blockId)
  if (index < 0) return null
  const swapWith = direction === "up" ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= lesson.blocks.length) return lesson
  const next = structuredClone(lesson)
  const [block] = next.blocks.splice(index, 1)
  next.blocks.splice(swapWith, 0, block)
  return next
}

export function removeBlockFromLesson(lesson: LessonContent, blockId: string): LessonContent | null {
  if (!lesson.blocks.some((item) => item.id === blockId)) return null
  const next = structuredClone(lesson)
  next.blocks = next.blocks.filter((item) => item.id !== blockId)
  next.completion.requiredBlockIds = next.completion.requiredBlockIds.filter((id) => id !== blockId)
  return next
}

export function listingFromContent(content: CourseContent) {
  return {
    title: content.title,
    category: content.category,
    intendedRole: content.intendedRole,
    experienceLevel: content.experienceLevel,
    estimatedDurationMinutes: content.estimatedDurationMinutes,
  }
}

function formValue(data: FormData, name: string): string {
  return String(data.get(name) ?? "")
}

export function parseCourseEditorForm(data: FormData): CourseContent | string {
  const base = emptyCourseContent()
  const title = asTrimmed(formValue(data, "title"), 1, TITLE_MAX)
  if (!title) return TRAINING_TITLE_REQUIRED
  const descriptionRaw = formValue(data, "description")
  const description = descriptionRaw.trim() === "" ? "" : asTrimmed(descriptionRaw, 1, DESCRIPTION_MAX)
  if (description == null) return TRAINING_TITLE_REQUIRED
  const category = asEnum(formValue(data, "category"), COURSE_CATEGORIES)
  const intendedRole = asTrimmed(formValue(data, "intendedRole"), 1, ROLE_MAX)
  const experienceLevel = asEnum(formValue(data, "experienceLevel"), COURSE_EXPERIENCE_LEVELS)
  const estimatedDurationMinutes = asInt(formValue(data, "estimatedDurationMinutes"), DURATION_MIN, DURATION_MAX)
  const lessonAccess = asEnum(formValue(data, "lessonAccess"), LESSON_ACCESS_MODES)
  const requireCompletionBeforeAdvance = data.get("requireCompletionBeforeAdvance") === "1"
  const quizGrading = asEnum(formValue(data, "quizGrading"), QUIZ_GRADING_MODES)
  const writtenFeedback = asEnum(formValue(data, "writtenFeedback"), WRITTEN_FEEDBACK_MODES)
  const assignmentApproval = asEnum(formValue(data, "assignmentApproval"), ASSIGNMENT_APPROVAL_MODES)
  const submissionMode = asEnum(formValue(data, "submissionMode"), SUBMISSION_MODES)
  const certificationRequirement = asEnum(formValue(data, "certificationRequirement"), CERTIFICATION_REQUIREMENTS)
  const retryLimit = asOptionalInt(formValue(data, "retryLimit"), 0, RETRY_MAX)
  const retryWaitHours = asOptionalInt(formValue(data, "retryWaitHours"), 0, WAIT_HOURS_MAX)
  if (
    !category ||
    !intendedRole ||
    !experienceLevel ||
    estimatedDurationMinutes == null ||
    !lessonAccess ||
    !quizGrading ||
    !writtenFeedback ||
    !assignmentApproval ||
    !submissionMode ||
    !certificationRequirement ||
    retryLimit === undefined ||
    retryWaitHours === undefined
  ) {
    return SAVE_FAILED_FALLBACK
  }
  return {
    ...base,
    title,
    description,
    category,
    intendedRole,
    experienceLevel,
    estimatedDurationMinutes,
    progression: { lessonAccess, requireCompletionBeforeAdvance },
    assessment: {
      quizGrading,
      writtenFeedback,
      assignmentApproval,
      submissionMode,
      retryLimit,
      retryWaitHours,
      certificationRequirement,
    },
  }
}

const SAVE_FAILED_FALLBACK = "That didn’t save. Please try again."

function parseOptions(data: FormData, prefix: string): QuizOption[] | null {
  const count = asInt(formValue(data, `${prefix}-optionCount`), 2, OPTION_MAX)
  if (count == null) return null
  const options: QuizOption[] = []
  for (let index = 0; index < count; index += 1) {
    const id = asTrimmed(formValue(data, `${prefix}-opt-${index}-id`), 1, 80) ?? newId()
    const label = asTrimmed(formValue(data, `${prefix}-opt-${index}-label`), 1, TITLE_MAX)
    const correct = data.get(`${prefix}-opt-${index}-correct`) === "1"
    if (!label) return null
    options.push({ id, label, correct })
  }
  return options
}

function parseQuestions(data: FormData, prefix: string): QuizQuestion[] | null {
  const count = asInt(formValue(data, `${prefix}-questionCount`), 1, QUESTION_MAX)
  if (count == null) return null
  const questions: QuizQuestion[] = []
  for (let index = 0; index < count; index += 1) {
    const qPrefix = `${prefix}-q-${index}`
    const id = asTrimmed(formValue(data, `${qPrefix}-id`), 1, 80) ?? newId()
    const prompt = asTrimmed(formValue(data, `${qPrefix}-prompt`), 1, DESCRIPTION_MAX)
    const kind = asEnum(formValue(data, `${qPrefix}-kind`), QUIZ_QUESTION_KINDS)
    const writtenFeedback = asEnum(formValue(data, `${qPrefix}-writtenFeedback`), WRITTEN_FEEDBACK_MODES) ?? "none"
    if (!prompt || !kind) return null
    if (kind === "written") {
      questions.push({ id, prompt, kind, options: [], writtenFeedback })
      continue
    }
    const options = parseOptions(data, qPrefix)
    if (!options) return null
    questions.push({ id, prompt, kind, options, writtenFeedback })
  }
  return questions
}

function parseBlockFromForm(data: FormData, index: number): ContentBlock | string {
  const prefix = `block-${index}`
  const id = asTrimmed(formValue(data, `${prefix}-id`), 1, 80) ?? newId()
  const type = asEnum(formValue(data, `${prefix}-type`), CONTENT_BLOCK_TYPES)
  if (!type) return TRAINING_BLOCK_INVALID
  if (type === "text") {
    const body = asTrimmed(formValue(data, `${prefix}-body`), 1, BODY_MAX)
    return body ? { id, type, body } : TRAINING_BLOCK_INVALID
  }
  if (type === "video") {
    const url = asTrimmed(formValue(data, `${prefix}-url`), 1, URL_MAX)
    const captionRaw = formValue(data, `${prefix}-caption`)
    const caption = captionRaw.trim() === "" ? "" : asTrimmed(captionRaw, 1, DESCRIPTION_MAX)
    if (!url || caption == null) return TRAINING_BLOCK_INVALID
    return { id, type, url, caption }
  }
  if (type === "image") {
    const url = asTrimmed(formValue(data, `${prefix}-url`), 1, URL_MAX)
    const alt = asTrimmed(formValue(data, `${prefix}-alt`), 1, TITLE_MAX)
    if (!url || !alt) return TRAINING_BLOCK_INVALID
    return { id, type, url, alt }
  }
  if (type === "resource") {
    const url = asTrimmed(formValue(data, `${prefix}-url`), 1, URL_MAX)
    const label = asTrimmed(formValue(data, `${prefix}-label`), 1, TITLE_MAX)
    if (!url || !label) return TRAINING_BLOCK_INVALID
    return { id, type, url, label }
  }
  if (type === "quiz") {
    const title = asTrimmed(formValue(data, `${prefix}-title`), 1, TITLE_MAX)
    const questions = parseQuestions(data, prefix)
    const retryLimit = asOptionalInt(formValue(data, `${prefix}-retryLimit`), 0, RETRY_MAX)
    const retryWaitHours = asOptionalInt(formValue(data, `${prefix}-retryWaitHours`), 0, WAIT_HOURS_MAX)
    const passingScorePercent = asOptionalInt(formValue(data, `${prefix}-passingScorePercent`), 0, SCORE_MAX)
    if (!title || !questions || retryLimit === undefined || retryWaitHours === undefined || passingScorePercent === undefined) {
      return TRAINING_QUIZ_INVALID
    }
    const parsed = asBlock({
      id,
      type,
      title,
      questions,
      config: { grading: "objective", retryLimit, retryWaitHours, passingScorePercent },
    })
    return parsed ?? TRAINING_QUIZ_INVALID
  }
  const title = asTrimmed(formValue(data, `${prefix}-title`), 1, TITLE_MAX)
  const instructions = asTrimmed(formValue(data, `${prefix}-instructions`), 1, BODY_MAX)
  const verification = formValue(data, `${prefix}-verification`) === "in_person" ? "in_person" : "online"
  const requiresHumanApproval = data.get(`${prefix}-requiresHumanApproval`) === "1"
  const retryLimit = asOptionalInt(formValue(data, `${prefix}-retryLimit`), 0, RETRY_MAX)
  if (!title || !instructions || retryLimit === undefined) return TRAINING_ASSIGNMENT_INVALID
  return { id, type: "assignment", title, instructions, verification, requiresHumanApproval, retryLimit }
}

export function parseLessonEditorForm(data: FormData): LessonContent | string {
  const id = asTrimmed(formValue(data, "lessonId"), 1, 80)
  const title = asTrimmed(formValue(data, "title"), 1, TITLE_MAX)
  if (!id) return SAVE_FAILED_FALLBACK
  if (!title) return TRAINING_LESSON_REQUIRED
  const descriptionRaw = formValue(data, "description")
  const description = descriptionRaw.trim() === "" ? "" : asTrimmed(descriptionRaw, 1, DESCRIPTION_MAX)
  if (description == null) return TRAINING_LESSON_REQUIRED
  const blockCount = asInt(formValue(data, "blockCount"), 0, BLOCK_MAX)
  if (blockCount == null) return TRAINING_BLOCK_INVALID
  const blocks: ContentBlock[] = []
  for (let index = 0; index < blockCount; index += 1) {
    const block = parseBlockFromForm(data, index)
    if (typeof block === "string") return block
    blocks.push(block)
  }
  const requireAllBlocks = data.get("requireAllBlocks") === "1"
  const lockedUntilPreviousComplete = data.get("lockedUntilPreviousComplete") === "1"
  const requiredBlockIds = formValue(data, "requiredBlockIds")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  const lesson = asLesson({
    id,
    title,
    description,
    completion: { requireAllBlocks, requiredBlockIds },
    progression: { lockedUntilPreviousComplete },
    blocks,
    legacy: emptyLegacyRef,
  })
  return lesson ?? TRAINING_BLOCK_INVALID
}

export function parsePathEditorForm(data: FormData, allowedCourseIds: ReadonlySet<string>): PathContent | string {
  const title = asTrimmed(formValue(data, "title"), 1, TITLE_MAX)
  if (!title) return TRAINING_TITLE_REQUIRED
  const descriptionRaw = formValue(data, "description")
  const description = descriptionRaw.trim() === "" ? "" : asTrimmed(descriptionRaw, 1, DESCRIPTION_MAX)
  const intendedRole = asTrimmed(formValue(data, "intendedRole"), 1, ROLE_MAX)
  const focus = asEnum(formValue(data, "focus"), PATH_FOCUS_VALUES)
  if (description == null || !intendedRole || !focus) return SAVE_FAILED_FALLBACK
  const count = asInt(formValue(data, "courseCount"), 0, PATH_COURSE_MAX)
  if (count == null) return TRAINING_PATH_COURSES_INVALID
  const courses: PathCourseRef[] = []
  for (let index = 0; index < count; index += 1) {
    const courseId = asTrimmed(formValue(data, `course-${index}-id`), 1, 80)
    if (!courseId || !allowedCourseIds.has(courseId)) return TRAINING_PATH_COURSES_INVALID
    const prerequisites = formValue(data, `course-${index}-prerequisites`)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    courses.push({ courseId, prerequisiteCourseIds: prerequisites })
  }
  const parsed = parsePathContent(
    { title, description, intendedRole, focus, courses, extensions: defaultExtensions() },
    allowedCourseIds,
  )
  return parsed ?? TRAINING_PATH_COURSES_INVALID
}

export function parseMasterVisibility(value: unknown): MasterVisibility | null {
  return asEnum(value, MASTER_VISIBILITIES)
}

export function mergeCourseMetadata(existing: CourseContent, metadata: CourseContent): CourseContent {
  const next = cloneCourseContent(existing)
  next.title = metadata.title
  next.description = metadata.description
  next.category = metadata.category
  next.intendedRole = metadata.intendedRole
  next.experienceLevel = metadata.experienceLevel
  next.estimatedDurationMinutes = metadata.estimatedDurationMinutes
  next.progression = metadata.progression
  next.assessment = metadata.assessment
  return next
}

export function versionStatusLabel(status: TrainingVersionStatus, libraryStatus: TrainingLibraryStatus): string {
  if (libraryStatus === "archived") return "Archived"
  if (status === "published") return "Published"
  if (status === "draft") return "Draft"
  return "Previous version"
}
