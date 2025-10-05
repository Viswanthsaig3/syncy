'use client';

import React from 'react';
import { Users, Crown, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface UserListProps {
  className?: string;
}

export const UserList: React.FC<UserListProps> = ({ className }) => {
  const { roomUsers, currentUser } = useAppStore();

  if (roomUsers.length === 0) return null;

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Participants</h3>
        <span className="text-sm text-gray-500">({roomUsers.length})</span>
      </div>

      <div className="space-y-2">
        {roomUsers.map((user) => (
          <div
            key={user.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg transition-colors',
              user.id === currentUser?.id
                ? 'bg-primary-50 border border-primary-200'
                : 'bg-gray-50 hover:bg-gray-100'
            )}
          >
            <div className="flex-shrink-0">
              {user.isHost ? (
                <div className="p-1 bg-yellow-100 rounded-full">
                  <Crown className="w-4 h-4 text-yellow-600" />
                </div>
              ) : (
                <div className="p-1 bg-gray-100 rounded-full">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 truncate">
                  {user.name}
                </span>
                {user.isHost && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    Host
                  </span>
                )}
                {user.id === currentUser?.id && (
                  <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                Joined {new Date(user.joinedAt).toLocaleTimeString()}
              </div>
            </div>

            {/* Connection status indicator */}
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
            </div>
          </div>
        ))}
      </div>

      {/* Room info */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Total users:</span>
            <span>{roomUsers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Host:</span>
            <span>{roomUsers.find(u => u.isHost)?.name || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
