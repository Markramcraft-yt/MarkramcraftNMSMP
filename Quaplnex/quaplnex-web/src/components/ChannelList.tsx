import { Hash, Volume2, ChevronDown } from 'lucide-react';
import { useChatStore } from '../store/chatStore';

interface Channel {
  id: string;
  name: string;
  type: 'Text' | 'Voice';
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  channels: Channel[];
  categories?: any[];
}

export default function ChannelList({ channels, categories }: Props) {
  const { currentChannelId, setCurrentChannel } = useChatStore();

  // Group channels by category
  const groupedChannels = channels.reduce((acc, channel) => {
    const catId = channel.categoryId || 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(channel);
    return acc;
  }, {} as Record<string, Channel[]>);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Uncategorized channels */}
      {groupedChannels['uncategorized'] && (
        <div className="mb-4">
          {groupedChannels['uncategorized'].map((channel) => (
            <button
              key={channel.id}
              onClick={() => setCurrentChannel(channel.id)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-left transition ${
                currentChannelId === channel.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {channel.type === 'Text' ? (
                <Hash className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate text-sm">{channel.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Categorized channels */}
      {categories?.map((category) => (
        <div key={category.id} className="mb-4">
          <div className="flex items-center gap-1 px-4 py-2 text-xs font-semibold text-slate-400 uppercase hover:text-slate-200 cursor-pointer">
            <ChevronDown className="w-4 h-4" />
            {category.name}
          </div>
          {groupedChannels[category.id]?.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setCurrentChannel(channel.id)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-left transition ${
                currentChannelId === channel.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {channel.type === 'Text' ? (
                <Hash className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate text-sm">{channel.name}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
