/**
 * 班规相关仓储：奖励兑换记录 / 班干部岗位分工
 */
import { BaseRepository } from '../BaseRepository'
import { getDB } from '../index'
import type { RewardExchange, ClassDuty } from '@/types/models'
import type { StoreName } from '../index'

class RewardExchangeRepo extends BaseRepository<RewardExchange> {
  store: StoreName = 'rewardExchanges'

  async listByClass(classId: string): Promise<RewardExchange[]> {
    if (!classId) return []
    const db = await getDB()
    const all = (await db.getAllFromIndex('rewardExchanges', 'by-class', classId)) as RewardExchange[]
    return all.filter((r) => !r.deletedAt).sort((a, b) => (a.month < b.month ? 1 : -1))
  }

  async listByStudent(studentId: string): Promise<RewardExchange[]> {
    if (!studentId) return []
    const db = await getDB()
    const all = (await db.getAllFromIndex('rewardExchanges', 'by-student', studentId)) as RewardExchange[]
    return all.filter((r) => !r.deletedAt).sort((a, b) => (a.month < b.month ? 1 : -1))
  }

  async listByMonth(classId: string, month: string): Promise<RewardExchange[]> {
    const all = await this.listByClass(classId)
    return all.filter((r) => r.month === month)
  }
}

class ClassDutyRepo extends BaseRepository<ClassDuty> {
  store: StoreName = 'classDuties'

  async listByClass(classId: string): Promise<ClassDuty[]> {
    if (!classId) return []
    const db = await getDB()
    const all = (await db.getAllFromIndex('classDuties', 'by-class', classId)) as ClassDuty[]
    return all
      .filter((d) => !d.deletedAt)
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
  }
}

export const rewardExchangeRepo = new RewardExchangeRepo()
export const classDutyRepo = new ClassDutyRepo()
