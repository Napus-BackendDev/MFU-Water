// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createExpressApp } from './express-app.js'
import { contractData, communityTargets, publicSurveyGridCells } from '../app/utils/kok-contract.ts'

describe('Express.js API and real KokData contract v5', () => {
  it('initializes Express application with /api routes', () => {
    const app = createExpressApp(process.cwd())
    expect(typeof app).toBe('function')
  })

  it('loads all 29 requirements, 4 communities (Pak Ing Tai), 129 Tha Ton rows, and 5 grid cells from contract-v5.json', () => {
    expect(contractData.requirements).toHaveLength(29)
    expect(contractData.data).toHaveLength(10)
    expect(contractData.sources).toHaveLength(27)
    expect(contractData.annexes).toHaveLength(35)
    expect(contractData.team_proposal).toHaveLength(7)
    expect(contractData.team_proposal.reduce((sum, item) => sum + item.people, 0)).toBe(12)
    expect(communityTargets.map((c) => c.name)).toEqual(['ท่าตอน', 'กะเหรี่ยงรวมมิตร', 'ปงของ', 'ปากอิงใต้'])
    expect(contractData.aggregate.record_count).toBe(129)
    expect(contractData.aggregate.unique_survey_ids).toBe(123)
    expect(publicSurveyGridCells).toHaveLength(5)
    expect(publicSurveyGridCells.reduce((sum, cell) => sum + cell.records, 0)).toBe(128)
  })
})
