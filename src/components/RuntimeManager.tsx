import { useState, useEffect } from 'react';
import { api, Runtime } from '../services/api';

interface Props {
  onBack: () => void;
  onSelectRuntime: (runtimeId: string) => void;
}

export default function RuntimeManager({ onBack, onSelectRuntime }: Props) {
  const [runtimes, setRuntimes] = useState<Runtime[]>([]);
  const [owner, setOwner] = useState('default-user');
  const [loading, setLoading] = useState(false);

  const loadRuntimes = async () => {
    setLoading(true);
    try {
      const data = await api.listRuntimes(owner);
      setRuntimes(data);
    } catch (err) {
      alert('加载 runtime 失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await api.registerRuntime({
        owner,
        type: 'openclaw',
        capabilities: ['web-browsing', 'code-execution']
      });
      await loadRuntimes();
    } catch (err) {
      alert('注册 runtime 失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuntimes();
  }, []);

  return (
    <div>
      <button onClick={onBack}>← 返回</button>
      <h2>Runtime 管理</h2>
      <div style={{ marginBottom: 20 }}>
        <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner" />
        <button onClick={handleRegister} disabled={loading}>注册新 Runtime</button>
        <button onClick={loadRuntimes} disabled={loading}>刷新</button>
      </div>
      {loading ? <p>加载中...</p> : (
        <table border={1} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Status</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {runtimes.map(r => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.owner}</td>
                <td>{r.type}</td>
                <td>{r.status}</td>
                <td><button onClick={() => onSelectRuntime(r.id)}>选择</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
