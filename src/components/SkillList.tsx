interface SkillListProps {
  skills: string[]
}

export default function SkillList({ skills }: SkillListProps) {
  return (
    <div>
      <h2>Skills</h2>
      <ul>
        {skills.map(skill => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    </div>
  )
}
