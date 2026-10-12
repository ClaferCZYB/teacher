/**
 * 班规中心 — 依据《潼南中学高2026级（13）班 班级规章制度（2026—2027学年试行）》
 *
 * 六个板块：
 * 1. 积分总览   — 初始 70 分基准 + 加减分明细 + 奖励档位
 * 2. 评分规则   — 班规扣分细则库（可一键应用 / 自定义分值 / 快捷记分）
 * 3. 八维成长   — 善良/勇敢/坚韧/上进/创新/思辨/友爱/包容，含月度上限
 * 4. 奖励兑换   — 80/90/100 分档位结算与登记
 * 5. 惩戒登记   — 四级教育性后果
 * 6. 班干部     — 岗位分工表 + 一日常规 / 一周常规清单
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Empty } from '@/components/Empty'
import { Tag } from '@/components/Tag'
import { ScoreInline } from '@/components/ScoreBadge'
import {
  classRepo, studentRepo, recordRepo, behaviorRuleRepo,
  rewardExchangeRepo, classDutyRepo,
} from '@/db/repositories'
import type {
  ClassEntity, Student, StudentRecord, BehaviorRule, RewardExchange, ClassDuty, GrowthDimension,
} from '@/types/models'
import { GROWTH_DIMENSIONS, REWARD_TIERS, CONSEQUENCE_LEVELS } from '@/types/models'
import { useUIStore } from '@/store/useUIStore'
import { toast } from '@/store/toast'
import { formatDate, cn } from '@/utils/helpers'
import {
  INITIAL_SCORE, RULE_GROUPS, ALL_RULE_PRESETS, applyClassRulePresets,
  totalScore, monthlyUsed, currentMonth, normalizeRule,
  type ClassRulePreset,
} from '@/utils/scoring'
import {
  Scale, BookOpen, Sprout, Gift, Gavel, Users, Plus, RefreshCw, Check, Pencil, Trash2,
} from 'lucide-react'

type TabKey = 'overview' | 'rules' | 'growth' | 'reward' | 'consequence' | 'duty'

const TABS: { key: TabKey; label: string; icon: typeof Scale }[] = [
  { key: 'overview', label: '积分总览', icon: Scale },
  { key: 'rules', label: '评分规则', icon: BookOpen },
  { key: 'growth', label: '八维成长', icon: Sprout },
  { key: 'reward', label: '奖励兑换', icon: Gift },
  { key: 'consequence', label: '惩戒登记', icon: Gavel },
  { key: 'duty', label: '班干部', icon: Users },
]

export function RulesPage() {
  const navigate = useNavigate()
  const currentClassId = useUIStore((s) => s.currentClassId)
  const [classes, setClasses] = useState<ClassEntity[]>([])
  const [cid, setCid] = useState<string>(currentClassId ?? '')
  const [tab, setTab] = useState<TabKey>('overview')

  const [students, setStudents] = useState<Student[]>([])
  const [records, setRecords] = useState<StudentRecord[]>([])
  const [rules, setRules] = useState<BehaviorRule[]>([])
  const [exchanges, setExchanges] = useState<RewardExchange[]>([])
  const [duties, setDuties] = useState<ClassDuty[]>([])

  useEffect(() => {
    void (async () => {
      const cls = await classRepo.listAll()
      const actives = cls.filter((c) => c.status === 'active')
      setClasses(actives)
      if (!cid && actives.length) setCid(actives[0].id)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reload = async () => {
    if (!cid) return
    const [s, r, ru, ex, du] = await Promise.all([
      studentRepo.listByClass(cid),
      recordRepo.listByClass(cid),
      behaviorRuleRepo.listAll(),
      rewardExchangeRepo.listByClass(cid),
      classDutyRepo.listByClass(cid),
    ])
    setStudents(s)
    setRecords(r)
    setRules(ru.filter((x) => !x.deletedAt))
    setExchanges(ex)
    setDuties(du)
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid])

  async function handleApplyPresets() {
    try {
      const n = await applyClassRulePresets()
      await reload()
      if (n > 0) toast.success(`已应用班规预设 ${n} 条`, '已存在规则保留你的自定义分值')
      else toast.info('班规预设已全部存在', '如需重置请先删除对应规则')
    } catch (e) {
      toast.error('应用失败', String((e as Error)?.message ?? e))
    }
  }

  return (
    <div>
      <PageHeader
        title="班规中心"
        description={`积分基准 ${INITIAL_SCORE} 分 · 八维成长 · 奖励兑换 · 四级惩戒 · 班干部分工`}
        actions={
          <>
            <select className="input py-1.5 w-auto pr-8" value={cid} onChange={(e) => setCid(e.target.value)}>
              <option value="">选择班级</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button variant="outline" onClick={handleApplyPresets}><RefreshCw size={14} /> 应用班规预设</Button>
          </>
        }
      />

      {/* Tab */}
      <div className="card p-1 mb-3 flex gap-1 overflow-x-auto hide-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors',
              tab === t.key ? 'bg-ink-700 text-paper-50' : 'text-soft hover:bg-ink-50',
            )}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {!cid ? <Empty title="请选择班级" /> : (
        <>
          {tab === 'overview' && (
            <OverviewTab students={students} records={records} exchanges={exchanges} onNavigate={(id) => navigate(`/students/${id}`)} />
          )}
          {tab === 'rules' && (
            <RulesTab
              rules={rules}
              students={students}
              cid={cid}
              onChanged={reload}
            />
          )}
          {tab === 'growth' && (
            <GrowthTab students={students} records={records} cid={cid} onChanged={reload} />
          )}
          {tab === 'reward' && (
            <RewardTab students={students} records={records} exchanges={exchanges} cid={cid} onChanged={reload} />
          )}
          {tab === 'consequence' && (
            <ConsequenceTab students={students} records={records} cid={cid} onChanged={reload} />
          )}
          {tab === 'duty' && (
            <DutyTab duties={duties} students={students} cid={cid} onChanged={reload} />
          )}
        </>
      )}
    </div>
  )
}

/* ============ 1. 积分总览 ============ */
function OverviewTab({ students, records, exchanges, onNavigate }: {
  students: Student[]; records: StudentRecord[]; exchanges: RewardExchange[]
  onNavigate: (id: string) => void
}) {
  const ranked = useMemo(() => {
    return students
      .map((s) => ({ s, score: totalScore(records, s.id) }))
      .sort((a, b) => b.score - a.score)
  }, [students, records])

  const exchangedIds = new Set(exchanges.map((e) => e.studentId))

  function tierOf(score: number) {
    if (score >= 100) return REWARD_TIERS[2]
    if (score >= 90) return REWARD_TIERS[1]
    if (score >= 80) return REWARD_TIERS[0]
    return null
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">学生综合积分</div>
          <div className="text-xs text-soft">初始 {INITIAL_SCORE} 分 + 全部加减分记录 · 班规总则第四条</div>
        </div>
        <div className="text-xs text-soft">共 {students.length} 人</div>
      </div>
      <div className="overflow-x-auto">
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>姓名</th>
              <th className="hidden sm:table-cell">学号</th>
              <th>综合积分</th>
              <th>奖励档位</th>
              <th className="hidden sm:table-cell">本月已兑换</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r, i) => {
              const tier = tierOf(r.score)
              return (
                <tr key={r.s.id}>
                  <td className="text-soft font-mono">{i + 1}</td>
                  <td className="whitespace-nowrap">{r.s.name}</td>
                  <td className="hidden sm:table-cell font-mono text-soft">{r.s.studentNo}</td>
                  <td><ScoreInline score={r.score} strong={r.score > INITIAL_SCORE} /></td>
                  <td>
                    {tier
                      ? <Tag tone="good">{tier.label}</Tag>
                      : <span className="text-xs text-soft">未达 80 分</span>}
                  </td>
                  <td className="hidden sm:table-cell text-xs text-soft">
                    {exchangedIds.has(r.s.id) ? '已登记' : '—'}
                  </td>
                  <td className="text-right">
                    <Button size="sm" variant="outline" onClick={() => onNavigate(r.s.id)}>详情</Button>
                  </td>
                </tr>
              )
            })}
            {ranked.length === 0 && (
              <tr><td colSpan={7} className="text-center py-6 text-soft text-sm">还没有学生</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ============ 2. 评分规则 ============ */
function RulesTab({ rules, students, cid, onChanged }: {
  rules: BehaviorRule[]; students: Student[]; cid: string; onChanged: () => void | Promise<void>
}) {
  const [editing, setEditing] = useState<BehaviorRule | null>(null)
  const [scoreTo, setScoreTo] = useState<ClassRulePreset | null>(null)

  const byGroup = useMemo(() => {
    const m = new Map<string, BehaviorRule[]>()
    for (const g of RULE_GROUPS) m.set(g, [])
    for (const r of rules) {
      const p = normalizeRule(r)
      const g = m.has(p.group) ? p.group : '其它'
      if (!m.has(g)) m.set(g, [])
      m.get(g)!.push(r)
    }
    // 未归类的放最后一组
    return Array.from(m.entries()).filter(([, v]) => v.length > 0)
  }, [rules])

  async function toggleActive(r: BehaviorRule) {
    await behaviorRuleRepo.update(r.id, { isActive: !r.isActive })
    await onChanged()
  }

  async function removeRule(r: BehaviorRule) {
    if (!confirm(`删除规则「${r.name}」？`)) return
    await behaviorRuleRepo.softDelete(r.id)
    await onChanged()
    toast.success('已删除')
  }

  return (
    <div className="space-y-3">
      {byGroup.length === 0 ? (
        <Empty
          icon={<BookOpen size={18} />}
          title="还没有评分规则"
          description="点击右上角「应用班规预设」，一键载入规章制度中的扣分细则与八维加分项。"
        />
      ) : byGroup.map(([group, list]) => (
        <div key={group} className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-ink-100 bg-paper-100/50">
            <div className="text-sm font-semibold">{group}</div>
          </div>
          <ul className="divide-y divide-ink-100">
            {list.map((r) => {
              const p = normalizeRule(r)
              const dim = p.dimension ? GROWTH_DIMENSIONS.find((d) => d.id === p.dimension) : null
              return (
                <li key={r.id} className="px-4 py-2.5 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={() => toggleActive(r)}
                    className="mt-1 accent-ink-700"
                    aria-label="启用"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-sm font-medium', !r.isActive && 'text-soft line-through')}>{p.name}</span>
                      {dim && <Tag tone="info">{dim.label}</Tag>}
                      {p.monthlyCap != null && <span className="text-2xs text-soft">月上限 {p.monthlyCap}</span>}
                    </div>
                    {p.description && <div className="text-2xs text-soft mt-0.5 leading-relaxed">{p.description}</div>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ScoreInline score={p.score} strong={p.score > 0} />
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)} title="编辑">
                      <Pencil size={12} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setScoreTo(p)}>记一笔</Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {editing && (
        <RuleEditModal
          rule={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChanged() }}
        />
      )}
      {scoreTo && (
        <ScoreEntryModal
          preset={scoreTo}
          students={students}
          cid={cid}
          onClose={() => setScoreTo(null)}
          onSaved={async () => { setScoreTo(null); await onChanged() }}
        />
      )}
    </div>
  )
}

function RuleEditModal({ rule, onClose, onSaved }: {
  rule: BehaviorRule; onClose: () => void; onSaved: () => void | Promise<void>
}) {
  const [name, setName] = useState(rule.name)
  const [score, setScore] = useState(String(rule.score))
  const [desc, setDesc] = useState(rule.description ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await behaviorRuleRepo.update(rule.id, {
        name: name.trim() || rule.name,
        score: Number(score) || 0,
        description: desc,
      })
      toast.success('规则已更新')
      await onSaved()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="编辑规则" size="sm">
      <div className="space-y-3">
        <div>
          <div className="text-xs text-soft mb-1">规则名称</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-soft mb-1">分值（正加负减）</div>
          <input className="input" type="number" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-soft mb-1">依据 / 说明</div>
          <textarea rows={3} className="input resize-none" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={save} loading={saving}>保存</Button>
        </div>
      </div>
    </Modal>
  )
}

/** 按规则给学生记一笔（扣分 / 加分），可同时登记惩戒等级 */
function ScoreEntryModal({ preset, students, cid, onClose, onSaved }: {
  preset: ClassRulePreset; students: Student[]; cid: string
  onClose: () => void; onSaved: () => void | Promise<void>
}) {
  const [studentId, setStudentId] = useState('')
  const [score, setScore] = useState(String(preset.score))
  const [content, setContent] = useState(preset.name)
  const [level, setLevel] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const isNeg = preset.score < 0

  async function save() {
    if (!studentId) { toast.warn('请选择学生'); return }
    const n = Number(score)
    if (Number.isNaN(n)) { toast.warn('分值应为数字'); return }
    setSaving(true)
    try {
      await recordRepo.create({
        studentId,
        classId: cid,
        type: isNeg ? 'demerit' : 'award',
        title: preset.name,
        content: content.trim() || preset.name,
        score: n,
        occurredAt: new Date(`${date}T08:00:00`).toISOString(),
        tags: [preset.group],
        ruleId: preset.key,
        dimension: preset.dimension ?? null,
        consequenceLevel: level ? Number(level) : null,
      })
      toast.success('已记录')
      await onSaved()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={`记一笔 · ${preset.name}`} size="md">
      <div className="space-y-3">
        <div>
          <div className="text-xs text-soft mb-1">学生</div>
          <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">选择学生</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}（{s.studentNo}）</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-soft mb-1">分值</div>
            <input className="input" type="number" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} />
            {preset.minScore != null && preset.maxScore != null && (
              <div className="text-2xs text-soft mt-1">班规区间 {preset.minScore} ~ {preset.maxScore}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-soft mb-1">日期</div>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {isNeg && (
          <div>
            <div className="text-xs text-soft mb-1">教育性惩戒等级（可选）</div>
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">不登记</option>
              {CONSEQUENCE_LEVELS.map((c) => <option key={c.level} value={c.level}>{c.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <div className="text-xs text-soft mb-1">事实说明（班规要求：事实清楚）</div>
          <textarea rows={3} className="input resize-none" value={content} onChange={(e) => setContent(e.target.value)} placeholder="时间 + 地点 + 具体行为 + 核实情况" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={save} loading={saving}>保存</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ============ 3. 八维成长 ============ */
function GrowthTab({ students, records, cid, onChanged }: {
  students: Student[]; records: StudentRecord[]; cid: string; onChanged: () => void | Promise<void>
}) {
  const [studentId, setStudentId] = useState('')
  const [dim, setDim] = useState<GrowthDimension>('kindness')
  const [score, setScore] = useState('1')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const month = currentMonth()

  const meta = GROWTH_DIMENSIONS.find((d) => d.id === dim)!

  useEffect(() => {
    setScore(String(meta.min))
  }, [dim, meta.min])

  const used = studentId ? monthlyUsed(records, studentId, dim, month) : 0
  const overCap = meta.monthlyCap != null && used + Number(score) > meta.monthlyCap

  async function save() {
    if (!studentId) { toast.warn('请选择学生'); return }
    const n = Number(score)
    if (Number.isNaN(n) || n <= 0) { toast.warn('八维成长应为正分'); return }
    if (n < meta.min || n > meta.max) { toast.warn(`分值应在 ${meta.min}—${meta.max} 之间`); return }
    setSaving(true)
    try {
      await recordRepo.create({
        studentId, classId: cid,
        type: 'growth',
        title: `${meta.label} · 成长积分`,
        content: content.trim() || meta.hint,
        score: n,
        occurredAt: new Date().toISOString(),
        tags: ['八维成长'],
        dimension: dim,
      })
      toast.success('已记录成长积分')
      setContent('')
      await onChanged()
    } finally { setSaving(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="card p-4 lg:col-span-1">
        <div className="text-sm font-semibold mb-1">录入成长积分</div>
        <div className="text-xs text-soft mb-3">班规第三章 · 八维成长积分（{month}）</div>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-soft mb-1">学生</div>
            <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">选择学生</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}（{s.studentNo}）</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-soft mb-1">维度</div>
            <div className="flex flex-wrap gap-1.5">
              {GROWTH_DIMENSIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDim(d.id)}
                  className={cn('px-2.5 py-1 rounded-full text-xs border',
                    dim === d.id ? 'bg-ink-700 text-paper-50 border-ink-700' : 'bg-white text-soft border-ink-200 hover:bg-ink-50')}
                >
                  {d.label}（{d.range}）
                </button>
              ))}
            </div>
            <div className="text-2xs text-soft mt-1.5 leading-relaxed">{meta.hint}</div>
          </div>
          <div>
            <div className="text-xs text-soft mb-1">分值（{meta.min}—{meta.max}）</div>
            <input className="input" type="number" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} />
            {studentId && (
              <div className="text-2xs mt-1">
                本月「{meta.label}」已获 <b>{used}</b> 分
                {meta.monthlyCap != null && <> / 上限 {meta.monthlyCap}</>}
                {overCap && <span className="text-amber-700"> · 超出建议上限，请确认</span>}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-soft mb-1">事实说明</div>
            <textarea rows={3} className="input resize-none" value={content} onChange={(e) => setContent(e.target.value)} placeholder="具体做了什么，为什么值得加分" />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} loading={saving}><Plus size={14} /> 记录</Button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden lg:col-span-2">
        <div className="px-4 py-3 border-b border-ink-100">
          <div className="text-sm font-semibold">八维成长记录（近 30 条）</div>
          <div className="text-xs text-soft">同一行为原则上只认定一次；加分必须基于可确认的事实</div>
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>日期</th><th>姓名</th><th>维度</th><th>分值</th><th>说明</th>
              </tr>
            </thead>
            <tbody>
              {records.filter((r) => r.dimension).slice(0, 30).map((r) => {
                const stu = students.find((s) => s.id === r.studentId)
                const d = GROWTH_DIMENSIONS.find((x) => x.id === r.dimension)
                return (
                  <tr key={r.id}>
                    <td className="text-soft text-xs whitespace-nowrap">{formatDate(r.occurredAt)}</td>
                    <td className="whitespace-nowrap">{stu?.name ?? '—'}</td>
                    <td><Tag tone="info">{d?.label ?? r.dimension}</Tag></td>
                    <td><ScoreInline score={r.score} strong /></td>
                    <td className="text-xs text-soft max-w-[280px] truncate">{r.content}</td>
                  </tr>
                )
              })}
              {records.filter((r) => r.dimension).length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-soft text-sm">还没有八维成长记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ============ 4. 奖励兑换 ============ */
function RewardTab({ students, records, exchanges, cid, onChanged }: {
  students: Student[]; records: StudentRecord[]; exchanges: RewardExchange[]
  cid: string; onChanged: () => void | Promise<void>
}) {
  const [month, setMonth] = useState(currentMonth())
  const [target, setTarget] = useState<{ student: Student; score: number; tier: typeof REWARD_TIERS[number] } | null>(null)

  const monthKey = month
  const eligible = useMemo(() => {
    return students
      .map((s) => {
        // 当月积分 = 初始分 + 截至当月底的累计加减分（简化：使用累计综合积分）
        const score = totalScore(records, s.id)
        return { student: s, score }
      })
      .filter((x) => x.score >= 80)
      .sort((a, b) => b.score - a.score)
  }, [students, records])

  const exchangedMap = useMemo(() => {
    const m = new Map<string, RewardExchange>()
    for (const e of exchanges) if (e.month === monthKey) m.set(e.studentId, e)
    return m
  }, [exchanges, monthKey])

  function tierOf(score: number) {
    if (score >= 100) return REWARD_TIERS[2]
    if (score >= 90) return REWARD_TIERS[1]
    return REWARD_TIERS[0]
  }

  return (
    <div className="space-y-3">
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-soft">结算月份</span>
        <input type="month" className="input py-1.5 w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
        <span className="text-xs text-soft">奖励原则上当月结算，不跨月无限累积</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {REWARD_TIERS.slice(0, 3).map((t) => (
          <div key={t.level} className="card p-3">
            <div className="text-sm font-semibold">{t.label}</div>
            <div className="text-xs text-soft mb-2">{t.threshold}</div>
            <ul className="text-xs text-soft space-y-0.5 list-disc list-inside">
              {t.options.map((o) => <li key={o}>{o}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100">
          <div className="text-sm font-semibold">达标学生（{month}）</div>
          <div className="text-xs text-soft">积分达 80 分及以上可兑换对应层级奖励，N 选一</div>
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr><th>姓名</th><th>综合积分</th><th>档位</th><th>兑换状态</th><th className="text-right">操作</th></tr>
            </thead>
            <tbody>
              {eligible.map((x) => {
                const ex = exchangedMap.get(x.student.id)
                const tier = tierOf(x.score)
                return (
                  <tr key={x.student.id}>
                    <td className="whitespace-nowrap">{x.student.name}</td>
                    <td><ScoreInline score={x.score} strong /></td>
                    <td><Tag tone="good">{tier.label}</Tag></td>
                    <td className="text-xs">
                      {ex ? <span className="text-soft">{ex.option}</span> : <span className="text-soft">未兑换</span>}
                    </td>
                    <td className="text-right">
                      {ex
                        ? <Button size="sm" variant="ghost" onClick={async () => { await rewardExchangeRepo.softDelete(ex.id); await onChanged() }}>撤销</Button>
                        : <Button size="sm" variant="outline" onClick={() => setTarget({ student: x.student, score: x.score, tier })}>登记兑换</Button>}
                    </td>
                  </tr>
                )
              })}
              {eligible.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-soft text-sm">本月暂无学生达到 80 分</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {target && (
        <ExchangeModal
          target={target}
          month={month}
          cid={cid}
          onClose={() => setTarget(null)}
          onSaved={async () => { setTarget(null); await onChanged() }}
        />
      )}
    </div>
  )
}

function ExchangeModal({ target, month, cid, onClose, onSaved }: {
  target: { student: Student; score: number; tier: typeof REWARD_TIERS[number] }
  month: string; cid: string; onClose: () => void; onSaved: () => void | Promise<void>
}) {
  const [option, setOption] = useState(target.tier.options[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await rewardExchangeRepo.create({
        classId: cid,
        studentId: target.student.id,
        month,
        level: target.tier.level,
        score: target.score,
        option,
        note: note.trim(),
        exchangedAt: new Date().toISOString(),
      })
      toast.success('已登记兑换')
      await onSaved()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={`登记兑换 · ${target.student.name}`} size="sm">
      <div className="space-y-3">
        <div className="text-sm">
          综合积分 <b>{target.score}</b> 分 → <Tag tone="good">{target.tier.label}</Tag>
        </div>
        <div>
          <div className="text-xs text-soft mb-1">奖励选项（N 选一）</div>
          <select className="input" value={option} onChange={(e) => setOption(e.target.value)}>
            {target.tier.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <div className="text-xs text-soft mb-1">备注</div>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：礼品已发放" />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={save} loading={saving}>确认兑换</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ============ 5. 惩戒登记 ============ */
function ConsequenceTab({ students, records, cid, onChanged }: {
  students: Student[]; records: StudentRecord[]; cid: string; onChanged: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [level, setLevel] = useState<number>(1)
  const [content, setContent] = useState('')
  const [score, setScore] = useState('0')
  const [saving, setSaving] = useState(false)

  const list = records.filter((r) => r.consequenceLevel).sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))

  async function save() {
    if (!studentId) { toast.warn('请选择学生'); return }
    setSaving(true)
    try {
      await recordRepo.create({
        studentId, classId: cid,
        type: 'demerit',
        title: `教育性惩戒 · ${CONSEQUENCE_LEVELS.find((c) => c.level === level)?.label ?? ''}`,
        content: content.trim() || '（未填写事实说明）',
        score: Number(score) || 0,
        occurredAt: new Date().toISOString(),
        tags: ['教育性惩戒'],
        consequenceLevel: level,
      })
      toast.success('已登记')
      setContent(''); setScore('0')
      setOpen(false)
      await onChanged()
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="text-sm font-semibold">教育性惩戒四级后果</div>
            <div className="text-xs text-soft mt-0.5">惩戒目的是让学生为行为承担实际成本，同时获得改正所需要的能力</div>
          </div>
          <Button onClick={() => setOpen(true)}><Plus size={14} /> 登记惩戒</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {CONSEQUENCE_LEVELS.map((c) => (
            <div key={c.level} className="rounded-md border border-ink-100 p-2.5">
              <div className="text-xs font-medium">{c.label}</div>
              <div className="text-2xs text-soft mt-0.5 leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100">
          <div className="text-sm font-semibold">惩戒记录</div>
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead><tr><th>日期</th><th>姓名</th><th>等级</th><th>说明</th></tr></thead>
            <tbody>
              {list.map((r) => {
                const stu = students.find((s) => s.id === r.studentId)
                const c = CONSEQUENCE_LEVELS.find((x) => x.level === r.consequenceLevel)
                return (
                  <tr key={r.id}>
                    <td className="text-xs text-soft whitespace-nowrap">{formatDate(r.occurredAt)}</td>
                    <td className="whitespace-nowrap">{stu?.name ?? '—'}</td>
                    <td><Tag tone={r.consequenceLevel && r.consequenceLevel >= 3 ? 'bad' : 'warn'}>{c?.label ?? r.consequenceLevel}</Tag></td>
                    <td className="text-xs text-soft max-w-[360px] truncate">{r.content}</td>
                  </tr>
                )
              })}
              {list.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-soft text-sm">还没有惩戒记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="登记教育性惩戒" size="md">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-soft mb-1">学生</div>
            <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">选择学生</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}（{s.studentNo}）</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-soft mb-1">后果等级</div>
            <select className="input" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {CONSEQUENCE_LEVELS.map((c) => <option key={c.level} value={c.level}>{c.label}</option>)}
            </select>
            <div className="text-2xs text-soft mt-1">{CONSEQUENCE_LEVELS.find((c) => c.level === level)?.desc}</div>
          </div>
          <div>
            <div className="text-xs text-soft mb-1">同步扣分（可留空表示本次不扣分）</div>
            <input className="input" type="number" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-soft mb-1">事实说明 / 处理结果</div>
            <textarea rows={3} className="input resize-none" value={content} onChange={(e) => setContent(e.target.value)} placeholder="事实 — 责任 — 处理 — 改进" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={save} loading={saving}>保存</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ============ 6. 班干部 ============ */
const DUTY_PRESETS: Omit<ClassDuty, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'classId'>[] = [
  { role: '班长', studentName: '肖梦颖', headcount: '1', reportTo: '班主任；全体班委', duty: '统筹班级日常事务、组织班委会、每日四晚汇报、重大事项上报', sortOrder: 1 },
  { role: '副班长', studentName: '王梦瑶', headcount: '1', reportTo: '学习/劳动/宣传/信息委员', duty: '协调四岗、督促任务、汇总岗位异常', sortOrder: 2 },
  { role: '副班长', studentName: '杨轩', headcount: '1', reportTo: '纪律/生活/文艺/心理委员', duty: '协调四岗，关注秩序、生活与心理状态', sortOrder: 3 },
  { role: '团支书', studentName: '罗乐', headcount: '1', reportTo: '团员、团委', duty: '团组织建设、主题团日活动', sortOrder: 4 },
  { role: '学习委员', studentName: '周锦萱', headcount: '1', reportTo: '各科科代表、教师', duty: '统筹学习事务、汇总作业与考试、对接任课教师', sortOrder: 5 },
  { role: '纪律委员', studentName: '奚梦', headcount: '2', reportTo: '副班长；班主任', duty: '自习、课间、集会秩序维护与到班核查、迟到记录', sortOrder: 6 },
  { role: '劳动委员', studentName: '陈柏熹 汤治洋', headcount: '2', reportTo: '副班长；值日生', duty: '值日安排与检查、大扫除、学校劳动任务', sortOrder: 7 },
  { role: '生活委员', studentName: '冯渝芹', headcount: '2', reportTo: '副班长；寝室长', duty: '公共物资、住宿与生活需求；敏感信息私下处理', sortOrder: 8 },
  { role: '体育委员', studentName: '刘名祺', headcount: '1', reportTo: '副班长；体育教师', duty: '两操、体育课整队、体育活动组织', sortOrder: 9 },
  { role: '文艺委员', studentName: '黄丹力', headcount: '1', reportTo: '副班长；宣传委员', duty: '节目内容、文艺活动策划与排练（不占用学习时间）', sortOrder: 10 },
  { role: '宣传委员', studentName: '余袁艺艾', headcount: '1', reportTo: '副班长；文艺/信息委员', duty: '班级文化、黑板报、视觉呈现与活动记录', sortOrder: 11 },
  { role: '心理委员', studentName: '陈祈诺', headcount: '2', reportTo: '副班长；班主任/心理教师', duty: '关注班级氛围与同学情绪；风险信号立即上报，不诊断不审问', sortOrder: 12 },
  { role: '信息委员', studentName: '程铄淇', headcount: '1', reportTo: '副班长；教师', duty: '电脑、投影、音响等多媒体设备检查与维护', sortOrder: 13 },
  { role: '资助委员', studentName: '杨轩', headcount: '1', reportTo: '班长；班主任', duty: '资助政策传达、材料提交；家庭经济信息只向班主任单独报告', sortOrder: 14 },
  { role: '各科科代表', studentName: '详见附表', headcount: '2~3名', reportTo: '学习委员；任课教师', duty: '第一节课后收作业、清点、未交名单整理并提醒', sortOrder: 15 },
  { role: '小组组长', studentName: '详见附表', headcount: '每组1名', reportTo: '学习委员/劳动委员', duty: '学习合作、任务落实、组内协调', sortOrder: 16 },
  { role: '寝室长', studentName: '详见附表', headcount: '每寝1名', reportTo: '生活委员；班主任/宿管', duty: '通知传达、卫生内务、作息提醒；不代替宿管处罚', sortOrder: 17 },
]

const DAILY_ROUTINE: { time: string; items: string[] }[] = [
  { time: '7:00—7:20 早自习前', items: ['班长 7:15 前到班，查看教室与班级状态、传达通知', '劳动委员检查卫生与值日到岗', '纪律委员 7:20 前完成到班核查并 7:20 后报班主任'] },
  { time: '7:20—8:00 早自习', items: ['纪律委员 7:20/7:30/7:45 三次秩序观察，先提醒后记录', '学习委员提醒按要求早读', '语文/英语课代表传达早读任务并督促'] },
  { time: '8:00—12:00 上午课堂课间', items: ['各科科代表第一节课后收作业、清点、整理未交名单', '纪律委员观察课间追逐推撞等安全风险行为', '劳动委员关注黑板讲台地面', '信息委员检查多媒体设备'] },
  { time: '12:00—14:20 午休前后', items: ['生活委员关注饮水、物资、空调电器', '纪律委员检查影响他人休息的行为', '副班长汇总各岗位异常，避免重复上报'] },
  { time: '14:20—18:20 下午课堂课间', items: ['体育委员确认两操与体育课集合', '文艺/宣传/心理委员处理各自事务', '宣传委员检查黑板报与通知栏'] },
  { time: '18:30—22:00 晚自习', items: ['纪律委员 18:30 到班核查，每节至少一次秩序观察', '学习委员关注作业完成与次日任务', '班长四晚最后十分钟向全班汇报当日情况'] },
  { time: '22:00 离班前', items: ['劳动委员检查教室卫生并明确次日值日', '信息委员关闭电脑投影空调照明', '寝室长回寝点名、提醒作息'] },
]

const WEEKLY_ROUTINE: { when: string; items: string[] }[] = [
  { when: '周日返校 / 周一', items: ['班长确认本周通知、活动、考试并建立本周任务表（一事一主责）', '副班长汇总对接岗位工作，形成本周重点任务清单', '学习委员汇总各科考试作业与订正任务', '劳动委员确认本周值日表与空缺补位'] },
  { when: '周二至周四', items: ['各岗位每周至少一次专项检查', '纪律委员检查迟到/自习/课间是否集中发生', '学习委员统计作业共性问题并联系任课教师', '心理委员关注班级氛围与持续情绪问题'] },
  { when: '周五', items: ['各岗位完成本周结算（班长/副班长/学习/劳动/纪律/生活委员分别汇总）', '班委短会 15—20 分钟：上周遗留 → 本周异常 → 下周任务 → 班干部自身问题'] },
]

function DutyTab({ duties, students, cid, onChanged }: {
  duties: ClassDuty[]; students: Student[]; cid: string; onChanged: () => void | Promise<void>
}) {
  const [editing, setEditing] = useState<ClassDuty | null>(null)
  const [adding, setAdding] = useState(false)
  const [showRoutine, setShowRoutine] = useState(false)

  async function importPresets() {
    if (duties.length && !confirm('已存在岗位数据，继续导入会追加预设岗位。是否继续？')) return
    let n = 0
    for (const p of DUTY_PRESETS) {
      await classDutyRepo.create({ ...p, classId: cid, studentId: null })
      n++
    }
    await onChanged()
    toast.success(`已导入 ${n} 个岗位`)
  }

  return (
    <div className="space-y-3">
      <div className="card p-3 flex items-center gap-2 flex-wrap">
        <div className="text-sm font-semibold flex-1">班干部岗位分工</div>
        <Button variant="outline" onClick={importPresets}><RefreshCw size={14} /> 导入班规岗位预设</Button>
        <Button onClick={() => setAdding(true)}><Plus size={14} /> 新增岗位</Button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr><th>岗位</th><th>姓名</th><th>人数</th><th className="hidden sm:table-cell">直接对接</th><th>核心职责</th><th className="text-right">操作</th></tr>
            </thead>
            <tbody>
              {duties.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap font-medium">{d.role}</td>
                  <td className="whitespace-nowrap">{d.studentName || '—'}</td>
                  <td className="text-soft">{d.headcount || '—'}</td>
                  <td className="hidden sm:table-cell text-xs text-soft">{d.reportTo || '—'}</td>
                  <td className="text-xs text-soft max-w-[320px]">{d.duty}</td>
                  <td className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(d)}><Pencil size={12} /></Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (!confirm(`删除岗位「${d.role}」？`)) return
                      await classDutyRepo.softDelete(d.id)
                      await onChanged()
                    }}><Trash2 size={12} /></Button>
                  </td>
                </tr>
              ))}
              {duties.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-soft text-sm">还没有岗位数据，可一键导入班规预设</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <button
          onClick={() => setShowRoutine((v) => !v)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-sm font-semibold hover:bg-ink-50"
        >
          <span>一日常规 / 一周常规清单</span>
          <span className="text-xs text-soft">{showRoutine ? '收起' : '展开'}</span>
        </button>
        {showRoutine && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <div className="text-xs font-medium text-soft mb-2">一日常规</div>
              <div className="space-y-2">
                {DAILY_ROUTINE.map((d) => (
                  <div key={d.time} className="rounded-md border border-ink-100 p-2.5">
                    <div className="text-xs font-medium mb-1">{d.time}</div>
                    <ul className="text-2xs text-soft space-y-0.5 list-disc list-inside">
                      {d.items.map((i) => <li key={i}>{i}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-soft mb-2">一周常规</div>
              <div className="space-y-2">
                {WEEKLY_ROUTINE.map((w) => (
                  <div key={w.when} className="rounded-md border border-ink-100 p-2.5">
                    <div className="text-xs font-medium mb-1">{w.when}</div>
                    <ul className="text-2xs text-soft space-y-0.5 list-disc list-inside">
                      {w.items.map((i) => <li key={i}>{i}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-2xs text-soft leading-relaxed border-t border-ink-100 pt-2">
              执行规则：一事一主责 · 记录优先（扣分/物资/班费/重大事务必留可核查记录） · 超权限即上报（安全风险、欺凌、严重冲突、心理危机、财物损失、疑似违法立即报告班主任）。
              班干部履职情况纳入月度评价。
            </div>
          </div>
        )}
      </div>

      {(editing || adding) && (
        <DutyEditModal
          duty={editing}
          students={students}
          cid={cid}
          onClose={() => { setEditing(null); setAdding(false) }}
          onSaved={async () => { setEditing(null); setAdding(false); await onChanged() }}
        />
      )}
    </div>
  )
}

function DutyEditModal({ duty, students, cid, onClose, onSaved }: {
  duty: ClassDuty | null; students: Student[]; cid: string
  onClose: () => void; onSaved: () => void | Promise<void>
}) {
  const [role, setRole] = useState(duty?.role ?? '')
  const [studentId, setStudentId] = useState(duty?.studentId ?? '')
  const [studentName, setStudentName] = useState(duty?.studentName ?? '')
  const [headcount, setHeadcount] = useState(duty?.headcount ?? '1')
  const [reportTo, setReportTo] = useState(duty?.reportTo ?? '')
  const [dutyText, setDutyText] = useState(duty?.duty ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!role.trim()) { toast.warn('请填写岗位名称'); return }
    setSaving(true)
    try {
      const payload = {
        classId: cid,
        role: role.trim(),
        studentId: studentId || null,
        studentName: studentName.trim(),
        headcount: headcount.trim(),
        reportTo: reportTo.trim(),
        duty: dutyText.trim() || '—',
        sortOrder: duty?.sortOrder ?? 999,
      }
      if (duty) await classDutyRepo.update(duty.id, payload)
      else await classDutyRepo.create(payload as any)
      toast.success('已保存')
      await onSaved()
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={duty ? '编辑岗位' : '新增岗位'} size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-soft mb-1">岗位 *</div>
            <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="如 纪律委员" />
          </div>
          <div>
            <div className="text-xs text-soft mb-1">人数</div>
            <input className="input" value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="如 2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-soft mb-1">任职学生（可选）</div>
            <select className="input" value={studentId} onChange={(e) => {
              setStudentId(e.target.value)
              const s = students.find((x) => x.id === e.target.value)
              if (s) setStudentName(s.name)
            }}>
              <option value="">不绑定</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}（{s.studentNo}）</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs text-soft mb-1">姓名（可手写）</div>
            <input className="input" value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="如 详见附表" />
          </div>
        </div>
        <div>
          <div className="text-xs text-soft mb-1">直接对接</div>
          <input className="input" value={reportTo} onChange={(e) => setReportTo(e.target.value)} placeholder="如 副班长；班主任" />
        </div>
        <div>
          <div className="text-xs text-soft mb-1">核心职责</div>
          <textarea rows={3} className="input resize-none" value={dutyText} onChange={(e) => setDutyText(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={save} loading={saving}>保存</Button>
        </div>
      </div>
    </Modal>
  )
}
