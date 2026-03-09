import { useState } from 'react'

interface Props {
  onSubmit: (name: string) => void
  onCancel: () => void
}

export default function ExperimentForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState('')

  return (
    <div>
      <h2>创建实验</h2>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="实验名称"
        style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
      />
      <button onClick={() => onSubmit(name)} disabled={!name}>创建</button>
      <button onClick={onCancel} style={{ marginLeft: '10px' }}>取消</button>
    </div>
  )
}
