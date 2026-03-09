import { Experiment, SkillDraft } from './types'

const STORAGE_KEY = 'agentlab_experiments'
const SKILLS_KEY = 'agentlab_skills'

export function saveExperiments(experiments: Experiment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments))
}

export function loadExperiments(): Experiment[] {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

export function saveSkills(skills: SkillDraft[]) {
  localStorage.setItem(SKILLS_KEY, JSON.stringify(skills))
}

export function loadSkills(): SkillDraft[] {
  const data = localStorage.getItem(SKILLS_KEY)
  return data ? JSON.parse(data) : []
}

export function generateSkillDraft(experiment: Experiment): SkillDraft {
  const steps = experiment.events
    .filter(e => e.type === 'action')
    .map(e => e.message)

  return {
    id: Date.now().toString(),
    experimentId: experiment.id,
    title: `技能: ${experiment.name}`,
    scenario: experiment.description,
    input: '输入参数待补充',
    output: '输出结果待补充',
    steps: steps.length > 0 ? steps : ['步骤待补充'],
    notes: [
      `基于实验 ${experiment.name} 生成`,
      `成功标准: ${experiment.successCriteria}`,
      `使用模型: ${experiment.model}`
    ],
    createdAt: new Date().toLocaleString('zh-CN')
  }
}
