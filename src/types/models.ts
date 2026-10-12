/**
 * TeacherOps 数据模型 — 所有实体类型集中声明
 * 软删除：所有实体携带 deletedAt，null 表示未删除
 */

/** 基础字段（所有业务实体继承） */
export interface BaseEntity {
  id: string
  createdAt: string  // ISO
  updatedAt: string  // ISO
  deletedAt: string | null
}

/* ----------- 教师 ----------- */
export interface Teacher extends BaseEntity {
  name: string
  subject: string        // 默认任教学科
  phone?: string
  email?: string
  note?: string
  preferences: {
    theme: 'light' | 'dark'
    density: 'comfortable' | 'compact'
    defaultClassId?: string | null
    defaultTerm?: string | null
  }
}

/* ----------- 班级 ----------- */
export interface ClassEntity extends BaseEntity {
  name: string                  // 班级名称
  grade: string                 // 高一 / 高二 / 高三
  academicYear: string          // 2024-2025
  term: string                  // 上学期 / 下学期
  isHomeroom: boolean           // 是否班主任班
  subject?: string              // 任教学科
  status: 'active' | 'archived'
  note?: string
  seatRows?: number             // 座位表行数
  seatCols?: number             // 座位表列数
}

/* ----------- 学生 ----------- */
export interface Guardian {
  name: string
  relation?: string        // 与学生关系（父亲 / 母亲 / 爷爷 / 法定监护人…）
  phone?: string
  isPrimary?: boolean      // 主联系人（用于默认显示）
  note?: string
}

export interface Student extends BaseEntity {
  classId: string
  studentNo: string             // 学号
  name: string
  gender: 'male' | 'female' | 'other'
  birthDate?: string | null
  height?: number | null        // 身高 cm（座位表自动排座需要）
  seatRow?: number | null       // 座位表行号 1-based
  seatCol?: number | null       // 座位表列号 1-based
  groupId?: string | null       // 所属小组
  /** 多家长支持（v2+）。老数据迁移时从 guardianName/Phone 单条字段生成第一条 */
  guardians: Guardian[]
  address?: string
  interest?: string             // 兴趣特长
  tags: string[]                // 学生标签
  note?: string                 // 教师备注（教师内部观察）
  status: 'active' | 'transferred' | 'graduated' | 'other'
  /** 兼容旧版：保留单家长字段用于迁移期识别，迁移完成后清空 */
  _legacy?: {
    guardianName?: string
    guardianRelation?: string
    guardianPhone?: string
  }
}

/* ----------- 小组 ----------- */
export interface Group extends BaseEntity {
  classId: string
  name: string
  leaderId?: string | null      // 学生 id
  note?: string
}

/* ----------- 学生成长记录（核心：所有可被时间轴收编的内容） ----------- */
export type RecordType =
  | 'observation'   // 课堂观察
  | 'study'         // 学习情况
  | 'behavior'      // 日常表现
  | 'talk'          // 谈话记录
  | 'home'          // 家校沟通
  | 'attendance'    // 考勤
  | 'reward'        // 奖励
  | 'demerit'       // 处分
  | 'growth'        // 成长事件
  | 'award'         // 荣誉奖项
  | 'punish'        // 扣分
  | 'other'

export const RECORD_TYPE_LABEL: Record<RecordType, string> = {
  observation: '课堂观察',
  study: '学习情况',
  behavior: '日常表现',
  talk: '谈话记录',
  home: '家校沟通',
  attendance: '考勤',
  reward: '奖励',
  demerit: '处分',
  growth: '成长事件',
  award: '荣誉奖项',
  punish: '扣分',
  other: '其他',
}

/* ----------- 八维成长积分（班规第三章） ----------- */
export type GrowthDimension =
  | 'kindness'    // 善良
  | 'bravery'     // 勇敢
  | 'resilience'  // 坚韧
  | 'diligence'   // 上进
  | 'innovation'  // 创新
  | 'critical'    // 思辨
  | 'friendship'  // 友爱
  | 'tolerance'   // 包容

export interface GrowthDimensionMeta {
  id: GrowthDimension
  label: string
  /** 单次建议分值区间说明 */
  range: string
  min: number
  max: number
  /** 每月上限（不设则不限） */
  monthlyCap?: number
  hint: string
}

export const GROWTH_DIMENSIONS: GrowthDimensionMeta[] = [
  { id: 'kindness',   label: '善良', range: '1—3', min: 1, max: 3, monthlyCap: 10, hint: '主动帮助他人、维护他人权益、拾金不昧等' },
  { id: 'bravery',    label: '勇敢', range: '1—3', min: 1, max: 3, monthlyCap: 8,  hint: '主动承认错误、承担困难任务、合理表达不同意见、主动报告风险等' },
  { id: 'resilience', label: '坚韧', range: '2—6', min: 2, max: 6,                 hint: '连续坚持习惯改进、完成长期任务、失败后重新尝试，重点奖励持续过程' },
  { id: 'diligence',  label: '上进', range: '1—4', min: 1, max: 4,                 hint: '成绩相较本人明显进步、学习习惯改善、主动完成高质量学习任务' },
  { id: 'innovation', label: '创新', range: '1—5', min: 1, max: 5,                 hint: '提出并实施新的学习或班级管理方法、完成原创作品或项目' },
  { id: 'critical',   label: '思辨', range: '1—2', min: 1, max: 2,                 hint: '有依据地质疑、提供反例、区分事实和观点、修正自身判断' },
  { id: 'friendship', label: '友爱', range: '1—3', min: 1, max: 3,                 hint: '主动帮助新同学融入、持续支持同伴、缓和矛盾、维护集体关系' },
  { id: 'tolerance',  label: '包容', range: '1—2', min: 1, max: 2,                 hint: '尊重差异、允许一般性错误改正、认真倾听不同意见、协商解决分歧' },
]

export const GROWTH_DIMENSION_LABEL: Record<GrowthDimension, string> = {
  kindness: '善良', bravery: '勇敢', resilience: '坚韧', diligence: '上进',
  innovation: '创新', critical: '思辨', friendship: '友爱', tolerance: '包容',
}

/** 奖励兑换层级（班规第三章二） */
export interface RewardTier {
  level: 1 | 2 | 3 | 4
  label: string
  threshold: string
  min: number
  max: number
  options: string[]
}

export const REWARD_TIERS: RewardTier[] = [
  { level: 1, label: '一级奖励', threshold: '80—90 分', min: 80, max: 90, options: ['选取 5—15 元礼品（班主任购买）', '其他由班主任确定的等值奖励'] },
  { level: 2, label: '二级奖励', threshold: '90—100 分', min: 90, max: 100, options: ['选取 15—30 元礼品（班主任购买）', '其他由班主任确定的等值奖励'] },
  { level: 3, label: '三级奖励', threshold: '100 分及以上', min: 100, max: Infinity, options: ['选取 30—50 元礼品（班主任购买）', '其他由班主任确定的等值奖励'] },
  { level: 4, label: '季度特别奖励', threshold: '连续三个月 90 分以上且无严重违纪', min: 90, max: Infinity, options: ['班主任请吃饭并赠送小礼品'] },
]

/** 教育性惩戒等级（班规第四章） */
export const CONSEQUENCE_LEVELS: { level: number; label: string; desc: string }[] = [
  { level: 1, label: '一级 · 立即纠正', desc: '轻微且可立即纠正：现场提醒、立即改正、补做未完成任务，不追加其他惩戒' },
  { level: 2, label: '二级 · 补偿性任务', desc: '学习/卫生/时间管理/文明交往四类补偿任务，犯错第二天内完成并报班长' },
  { level: 3, label: '三级 · 持续性教育', desc: '同类行为一月内重复两次及以上，或拒绝完成二级任务：教育任务包' },
  { level: 4, label: '四级 · 重大问题处理', desc: '欺凌、暴力、作弊、偷盗等：直接进入学校制度处理程序，班级不自行替代' },
]

export interface StudentRecord extends BaseEntity {
  studentId: string
  classId: string
  type: RecordType
  occurredAt: string            // 事件发生时间（用于时间轴排序）
  title?: string
  content: string
  score?: number                // 加减分（用于积分体系）
  tags: string[]
  followUpAt?: string | null    // 跟进日期
  followUpDone?: boolean
  followUpNote?: string
  /** 八维成长维度（加分记录所属维度，用于月度上限核算） */
  dimension?: GrowthDimension | null
  /** 引用的评分规则 id（便于溯源与复核） */
  ruleId?: string | null
  /** 教育性惩戒等级 1—4（班规第四章） */
  consequenceLevel?: number | null
  /** 引用其它实体的 id（可选） */
  relatedId?: string | null
  relatedType?: 'communication' | 'attendance' | 'grade' | 'assignment' | null
}

/* ----------- 家校沟通 ----------- */
export interface Communication extends BaseEntity {
  studentId: string
  classId: string
  parentName: string
  relation?: string
  contact?: string
  occurredAt: string
  channel: 'phone' | 'wechat' | 'inperson' | 'email' | 'note' | 'other'
  subject: string
  content: string
  parentFeedback?: string
  followUpAt?: string | null
  followUpDone?: boolean
}

/* ----------- 考勤 ----------- */
export type AttendanceStatus = 'present' | 'late' | 'early' | 'leave' | 'absent' | 'other'

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: '出勤',
  late: '迟到',
  early: '早退',
  leave: '请假',
  absent: '缺勤',
  other: '其他',
}

export interface Attendance extends BaseEntity {
  studentId: string
  classId: string
  date: string                  // YYYY-MM-DD
  status: AttendanceStatus
  remark?: string
}

/* ----------- 成绩 ----------- */
export interface Exam extends BaseEntity {
  classId: string
  name: string                  // 考试名称
  /** 主科目（兼容旧版）；新版考试可绑定多个科目，参见 grade.subject 与 EXAM_SUBJECTS 列表 */
  subject?: string
  /** 本考试包含的科目列表（多科录入的核心） */
  subjects?: string[]
  /** 每科满分（缺省回退到 fullScore） */
  fullScores?: Record<string, number>
  type: 'monthly' | 'midterm' | 'final' | 'mock' | 'quiz' | 'custom'
  examDate: string              // YYYY-MM-DD
  /** 默认满分（可与每科单独 fullScore 配合使用，新版允许每科满分不同） */
  fullScore?: number
  note?: string
}

/** 成绩录入常用科目（含"其他"自定义） */
export const EXAM_SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '政治', '历史', '其他'] as const
export type ExamSubject = typeof EXAM_SUBJECTS[number]

export interface Grade extends BaseEntity {
  examId: string
  classId: string
  studentId: string
  subject: string               // 自由填写：使用 EXAM_SUBJECTS 或自定义
  score: number
  /** 排名（班级内，按科目），1-based */
  rank?: number | null
  /** 校排名（从 Excel 导入，若提供） */
  schoolRank?: number | null
  /** 学科知识点（物理 / 生物等按学科用），逗号分隔 */
  knowledgePoints?: string
  note?: string
  /** 该科满分（缺省使用 Exam.fullScore） */
  fullScore?: number
}

/* ----------- 作业 ----------- */
export interface Assignment extends BaseEntity {
  classId: string
  subject: string
  title: string
  description?: string
  publishedAt: string
  dueAt: string                 // ISO
  /** 该作业对应的所有学生完成情况（按 studentId 索引） */
  completions: AssignmentCompletion[]
}

export interface AssignmentCompletion {
  studentId: string
  status: 'pending' | 'submitted' | 'late' | 'missing' | 'exempt'
  submittedAt?: string | null
  score?: number | null
  remark?: string
}

/* ----------- 教师待办 ----------- */
/** 子任务（清单内的检查项） */
export interface SubTask {
  id: string
  title: string
  done: boolean
}

export interface Task extends BaseEntity {
  title: string
  content?: string
  priority: 'low' | 'medium' | 'high'
  dueDate?: string | null
  classId?: string | null
  studentId?: string | null
  tags: string[]
  done: boolean
  doneAt?: string | null
  /** 子任务清单（TickTick / 微软 To-Do 风格） */
  subtasks?: SubTask[]
  /** 标星（重要） */
  starred?: boolean
  /** 是否已加入「我的一天」 */
  myDay?: boolean
  /** 手动排序权重（越小越靠前；未设置则排在末尾） */
  order?: number
}

/* ----------- 课程安排 ----------- */
export interface Schedule extends BaseEntity {
  classId: string
  subject: string
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6   // 周一~周日  (1=Mon)
  startTime: string                      // HH:mm
  endTime: string                        // HH:mm
  classroom?: string
  content?: string
  weeks?: number | null                  // 第几周（可选）
}

/* ----------- 课堂记录 ----------- */
export interface ClassNote extends BaseEntity {
  classId: string
  date: string                           // YYYY-MM-DD
  subject: string
  title?: string                         // 标题（如"摩擦力 第一节"）
  content: string                        // 教学内容
  status?: string                        // 课堂状态
  studentBehavior?: string               // 学生表现
  problems?: string                      // 教学问题
  reflection?: string                    // 教学反思
  knowledgePoints: string[]              // 知识点标签
}

/* ----------- 教学反思 ----------- */
export interface Reflection extends BaseEntity {
  date: string                           // YYYY-MM-DD
  classId?: string | null
  subject: string
  chapter?: string
  title: string
  content: string
  tags: string[]
}

/* ----------- 班级事务（仅班主任班使用） ----------- */
export type ClassAffairType =
  | 'meeting'        // 班会
  | 'activity'       // 活动
  | 'notice'         // 通知
  | 'duty'           // 值日
  | 'committee'      // 班委
  | 'task'           // 班级任务
  | 'honor'          // 荣誉
  | 'material'       // 资料
  | 'other'

export interface ClassAffair extends BaseEntity {
  classId: string
  type: ClassAffairType
  title: string
  content?: string
  date?: string | null
  status?: 'open' | 'done' | 'archived'
  studentIds?: string[]
}

/* ----------- 物理知识点（用户自定义，取代硬编码教材目录） ----------- */
export interface KnowledgePoint extends BaseEntity {
  subject: string
  name: string
  parentId?: string | null
  module?: string                       // 模块：力学 / 电学 / ...
  note?: string
}

/* ----------- 行为评价规则（自定义） ----------- */
export interface BehaviorRule extends BaseEntity {
  classId: string                       // '' => 全局默认；非空 => 针对某班级
  key?: string                          // 行为键，如 attendance:absent / assignment:missing
  name: string                          // 规则名称
  score: number                         // 正加负减分值
  category: 'award' | 'demerit' | 'custom'
  description?: string
  isActive: boolean
  /** 八维成长维度（加分规则所属维度） */
  dimension?: GrowthDimension | null
  /** 分值区间下限（班规给出区间时使用） */
  minScore?: number | null
  /** 分值区间上限 */
  maxScore?: number | null
  /** 每月上限（八维加分） */
  monthlyCap?: number | null
  /** 规则分组，便于界面归类：考勤 / 课堂 / 卫生 / 文明 / 严重违纪 / 八维加分 */
  group?: string
  /** 是否内置（班规预设，可改不可删） */
  builtin?: boolean
}

/* ----------- 奖励兑换记录（班规第三章二 / 第六章） ----------- */
export interface RewardExchange extends BaseEntity {
  classId: string
  studentId: string
  /** 结算月份 YYYY-MM */
  month: string
  /** 奖励层级 1—4 */
  level: 1 | 2 | 3 | 4
  /** 兑换时该生当月积分 */
  score: number
  /** 选择的具体奖励项 */
  option: string
  note?: string
  exchangedAt: string
}

/* ----------- 班干部岗位分工（班规第五章） ----------- */
export interface ClassDuty extends BaseEntity {
  classId: string
  /** 岗位名称 */
  role: string
  /** 任职学生姓名（班规附表可能写"详见附表"） */
  studentName?: string
  studentId?: string | null
  /** 人数，如 1 / 2 / 每组1名 */
  headcount?: string
  /** 直接对接 */
  reportTo?: string
  /** 核心职责 */
  duty: string
  /** 排序 */
  sortOrder?: number
}

/* ----------- 系统元数据 ----------- */
export interface Meta {
  key: string
  value: any
  updatedAt: string
}

/* ----------- 全局数据快照（用于备份） ----------- */
export interface BackupSnapshot {
  version: number                       // 数据结构版本
  exportedAt: string
  teachers: Teacher[]
  classes: ClassEntity[]
  students: Student[]
  groups: Group[]
  records: StudentRecord[]
  communications: Communication[]
  attendance: Attendance[]
  exams: Exam[]
  grades: Grade[]
  assignments: Assignment[]
  tasks: Task[]
  schedules: Schedule[]
  classNotes: ClassNote[]
  reflections: Reflection[]
  classAffairs: ClassAffair[]
  knowledgePoints: KnowledgePoint[]
  behaviorRules: BehaviorRule[]
  rewardExchanges: RewardExchange[]
  classDuties: ClassDuty[]
  meta: Meta[]
}
