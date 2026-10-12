/**
 * 加减分语义、班规规则库与八维成长积分
 *
 * 依据《潼南中学高2026级（13）班 班级规章制度（2026—2027学年试行）》落地：
 * - 总则第四条：每位学生初始综合积分 70 分
 * - 第二章：日常行为规范与扣分细则
 * - 第三章：八维成长积分与奖励兑换
 * - 第四章：教育性惩戒四级后果
 */
import { behaviorRuleRepo } from '@/db/repositories'
import type { BehaviorRule, GrowthDimension, RecordType, StudentRecord } from '@/types/models'
import { GROWTH_DIMENSIONS } from '@/types/models'

/** 初始综合积分（班规总则第四条） */
export const INITIAL_SCORE = 70

/** 正向加分类别：奖励、荣誉、日常表现、成长事件 */
export const POSITIVE_TYPES: RecordType[] = ['behavior', 'growth', 'reward', 'award']

/** 负向扣分类别：处分、扣分 */
export const NEGATIVE_TYPES: RecordType[] = ['demerit', 'punish']

export function isPositiveType(t: RecordType): boolean {
  return POSITIVE_TYPES.includes(t)
}

export function isNegativeType(t: RecordType): boolean {
  return NEGATIVE_TYPES.includes(t)
}

/** 默认分值（仅用于表单初始值，不会被持久化为规则） */
export function defaultScoreForType(t: RecordType): number {
  return isPositiveType(t) ? 1 : -1
}

/** 校验分值是否符合类型语义，返回 null 表示合法，否则返回错误文案 */
export function validateScoreForType(t: RecordType, value: number): string | null {
  if (Number.isNaN(value)) return '分值必须为数字'
  if (isPositiveType(t) && value < 0) return '该类型只能记加分（不能为负）'
  if (isNegativeType(t) && value > 0) return '该类型只能记扣分（不能为正）'
  return null
}

/* -------------- 行为评分规则（考勤 / 作业自动同步） -------------- */

/** 内置行为键 → 中文名（用于设置页展示与默认分） */
export const BEHAVIOR_KEY_LABELS: Record<string, string> = {
  'attendance:absent': '考勤 · 缺勤',
  'attendance:late': '考勤 · 迟到',
  'attendance:early': '考勤 · 早退',
  'attendance:leave': '考勤 · 请假',
  'assignment:missing': '作业 · 未交',
  'assignment:late': '作业 · 迟交',
}

/** 默认分值（无自定义规则时使用）。负向行为才有预设，正向由教师手动录入。 */
export const DEFAULT_BEHAVIOR_SCORES: Record<string, number> = {
  'attendance:absent': -2,
  'attendance:late': -1,
  'attendance:early': -1,
  'attendance:leave': 0,
  'assignment:missing': -1,
  'assignment:late': -0.5,
}

/**
 * 取得某行为的分值（支持自定义覆盖）。
 * 优先取「全局默认规则」(classId='') 中启用的覆盖，否则回退内置默认值。
 */
export async function getScoreFor(key: string): Promise<number> {
  try {
    const all = await behaviorRuleRepo.listAll()
    const rule = all.find((r) => !r.deletedAt && r.isActive && r.classId === '' && r.key === key)
    if (rule) return rule.score
  } catch {
    /* 忽略读取异常，回退默认 */
  }
  return DEFAULT_BEHAVIOR_SCORES[key] ?? 0
}

/* -------------- 班规规则库 -------------- */

/** 规则分组（对应班规第二章各节 + 第三章八维） */
export const RULE_GROUPS = [
  '考勤与校园秩序',
  '课堂、自习与学习纪律',
  '卫生劳动与公共责任',
  '仪容、文明交往与师生关系',
  '手机、考试及严重违纪',
  '八维成长加分',
] as const

export interface ClassRulePreset {
  /** 规则键；attendance:* / assignment:* 会被考勤、作业面板自动套用 */
  key: string
  name: string
  score: number
  minScore?: number
  maxScore?: number
  category: 'award' | 'demerit' | 'custom'
  group: string
  dimension?: GrowthDimension
  monthlyCap?: number
  description?: string
  builtin?: boolean
}

/**
 * 班规扣分/加分预设。
 * 分值区间与依据全部来自规章制度原文；区间型取较保守值作默认分。
 */
export const CLASS_RULE_PRESETS: ClassRulePreset[] = [
  /* 一、考勤与校园秩序 */
  { key: 'attendance:late', name: '迟到一次', score: -1, category: 'demerit', group: '考勤与校园秩序', description: '迟到一次扣1分；学校/教师安排、经批准请假、突发身体不适经核实不计', builtin: true },
  { key: 'attendance:absent', name: '缺勤（未到班）', score: -2, category: 'demerit', group: '考勤与校园秩序', description: '未到班且无正当理由；经核实请假或学校安排不计', builtin: true },
  { key: 'attendance:early', name: '早退', score: -1, category: 'demerit', group: '考勤与校园秩序', description: '未经批准提前离开', builtin: true },
  { key: 'attendance:leave', name: '请假（经核实）', score: 0, category: 'demerit', group: '考勤与校园秩序', description: '经批准请假、突发身体不适等经核实后不计扣分', builtin: true },
  { key: 'rule:leaveCampus', name: '擅自离开课堂/校园', score: -2, category: 'demerit', group: '考勤与校园秩序', description: '未经批准擅自离开，按学校规定执行并同步记录' },
  { key: 'rule:chase', name: '教学楼内追逐推撞喧哗', score: -1, minScore: -2, maxScore: -1, category: 'demerit', group: '考勤与校园秩序', description: '严重影响公共秩序，扣1—2分' },

  /* 二、课堂、自习与学习纪律 */
  { key: 'rule:selfStudyTalk', name: '自习课讲话', score: -1, category: 'demerit', group: '课堂、自习与学习纪律', description: '无论是聊天或讨论学习，均一视同仁，扣1分' },
  { key: 'rule:eatSleep', name: '上课/自习吃东西、睡觉', score: -1, category: 'demerit', group: '课堂、自习与学习纪律', description: '每次扣1分' },
  { key: 'rule:gameCard', name: '打游戏/打牌/下棋/长时间喧哗/擅自离开课堂', score: -2, minScore: -3, maxScore: -2, category: 'demerit', group: '课堂、自习与学习纪律', description: '每次扣2—3分' },
  { key: 'assignment:missing', name: '作业/订正反复不完成', score: -1, minScore: -3, maxScore: -1, category: 'demerit', group: '课堂、自习与学习纪律', description: '无正当理由反复不完成，除补齐外按重复次数和影响程度扣1—3分', builtin: true },
  { key: 'assignment:late', name: '作业迟交', score: -0.5, category: 'demerit', group: '课堂、自习与学习纪律', description: '迟交按情节从轻处理', builtin: true },

  /* 三、卫生劳动与公共责任 */
  { key: 'rule:dutyRefuse', name: '拒绝完成个人值日', score: -2, category: 'demerit', group: '卫生劳动与公共责任', description: '无正当理由不完成值日，先补做；规定时间内仍拒绝完成扣2分，并承担补偿性劳动' },
  { key: 'rule:dutyVolunteer', name: '主动维护公共卫生/承担无人负责的劳动', score: 1, category: 'award', group: '卫生劳动与公共责任', description: '主动承担可获得加分（对应八维之善良/友爱）' },
  { key: 'rule:litter', name: '乱扔垃圾/故意污染公共区域', score: -1, category: 'demerit', group: '卫生劳动与公共责任', description: '扣1分；故意损坏公共设施按学校规定处理并承担修复赔偿责任' },
  { key: 'rule:laborOfficer', name: '劳动委员检查督促不到位', score: -1, category: 'demerit', group: '卫生劳动与公共责任', description: '经班主任发现清洁不到位扣1分；导致班级日常清洁被扣分的扣2分' },

  /* 四、仪容、文明交往与师生关系 */
  { key: 'rule:dressCode', name: '校服/发型/饰品/仪容仪表违规', score: -1, category: 'demerit', group: '仪容、文明交往与师生关系', description: '学校已有扣分标准的，直接执行学校标准' },
  { key: 'rule:swear', name: '说污秽、攻击性脏话', score: -3, category: 'demerit', group: '仪容、文明交往与师生关系', description: '每次扣3分' },
  { key: 'rule:insult', name: '辱骂/威胁/故意羞辱同学或教师', score: -3, minScore: -10, maxScore: -3, category: 'demerit', group: '仪容、文明交往与师生关系', description: '按情节扣3—10分，并实施相应教育性后果' },

  /* 五、手机、考试及严重违纪 */
  { key: 'rule:phone', name: '手机/智能终端违规使用', score: -5, category: 'demerit', group: '手机、考试及严重违纪', description: '严格执行学校手机和智能终端管理制度，同步班级记录' },
  { key: 'rule:cheat', name: '考试作弊', score: -10, category: 'demerit', group: '手机、考试及严重违纪', description: '严重违纪，直接进入学校制度处理程序' },
  { key: 'rule:fight', name: '打架斗殴/欺凌/偷盗/敲诈', score: -10, category: 'demerit', group: '手机、考试及严重违纪', description: '四级后果：直接进入学校制度处理程序，班级不自行替代学校处理' },
  { key: 'rule:smoke', name: '吸烟/赌博/饮酒/翻越围墙', score: -10, category: 'demerit', group: '手机、考试及严重违纪', description: '严重违纪，按学校规定处理' },
]

/** 八维成长加分预设（由 GROWTH_DIMENSIONS 派生） */
export const GROWTH_RULE_PRESETS: ClassRulePreset[] = GROWTH_DIMENSIONS.map((d) => ({
  key: `growth:${d.id}`,
  name: `${d.label}（${d.range} 分）`,
  score: d.min,
  minScore: d.min,
  maxScore: d.max,
  category: 'award' as const,
  group: '八维成长加分',
  dimension: d.id,
  monthlyCap: d.monthlyCap,
  description: d.hint,
  builtin: true,
}))

export const ALL_RULE_PRESETS: ClassRulePreset[] = [...CLASS_RULE_PRESETS, ...GROWTH_RULE_PRESETS]

/**
 * 一键应用班规预设：把预设写入全局规则库（classId=''）。
 * 已存在的规则保留用户自定义分值，不覆盖。返回新建条数。
 */
export async function applyClassRulePresets(): Promise<number> {
  const all = await behaviorRuleRepo.listAll()
  let created = 0
  for (const p of ALL_RULE_PRESETS) {
    const exists = all.find((r) => !r.deletedAt && r.classId === '' && r.key === p.key)
    if (exists) continue
    await behaviorRuleRepo.create({
      classId: '',
      key: p.key,
      name: p.name,
      score: p.score,
      category: p.category,
      description: p.description ?? '',
      isActive: true,
      dimension: p.dimension ?? null,
      minScore: p.minScore ?? null,
      maxScore: p.maxScore ?? null,
      monthlyCap: p.monthlyCap ?? null,
      group: p.group,
      builtin: p.builtin ?? false,
    } as any)
    created++
  }
  return created
}

/** 把规则记录规整为界面可用的结构 */
export function normalizeRule(r: BehaviorRule): ClassRulePreset {
  return {
    key: r.key ?? r.id,
    name: r.name,
    score: r.score,
    minScore: r.minScore ?? undefined,
    maxScore: r.maxScore ?? undefined,
    category: r.category,
    group: r.group ?? (r.category === 'demerit' ? '其它扣分' : '其它加分'),
    dimension: r.dimension ?? undefined,
    monthlyCap: r.monthlyCap ?? undefined,
    description: r.description,
    builtin: r.builtin,
  }
}

/* -------------- 积分计算 -------------- */

/** 学生综合积分 = 初始分 + 全部已记录加减分 */
export function totalScore(records: StudentRecord[], studentId: string): number {
  let sum = INITIAL_SCORE
  for (const r of records) {
    if (r.studentId === studentId && typeof r.score === 'number') sum += r.score
  }
  return Math.round(sum * 100) / 100
}

/** 某生某维度某月已获加分（用于月度上限核算） */
export function monthlyUsed(
  records: StudentRecord[],
  studentId: string,
  dimension: GrowthDimension,
  month: string, // YYYY-MM
): number {
  let sum = 0
  for (const r of records) {
    if (r.studentId !== studentId || r.dimension !== dimension) continue
    if (typeof r.score !== 'number') continue
    const m = (r.occurredAt || '').slice(0, 7)
    if (m === month) sum += r.score
  }
  return Math.round(sum * 100) / 100
}

/** 当前月份 YYYY-MM */
export function currentMonth(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
