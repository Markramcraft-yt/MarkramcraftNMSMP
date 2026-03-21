import { Plus } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

interface Server {
  id: string;
  name: string;
  iconUrl?: string;
}

interface Props {
  servers: Server[];
}

export default function ServerSidebar({ servers }: Props) {
  const { currentServerId, setCurrentServer } = useChatStore();

  return (
    <div className="w-20 bg-slate-900 border-r border-slate-700 flex flex-col items-center gap-2 p-3 overflow-y-auto">
      {servers.map((server) => (
        <button
          key={server.id}
          onClick={() => setCurrentServer(server.id)}
          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition ${
            currentServerId === server.id
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title={server.name}
        >
          {server.iconUrl ? (
            <img src={server.iconUrl} alt={server.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            server.name.charAt(0).toUpperCase()
          )}
        </button>
      ))}

      <button className="w-12 h-12 rounded-full bg-slate-700 hover:bg-green-600 text-slate-300 hover:text-white flex items-center justify-center transition mt-auto">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
