import React from 'react';
import { FloorPlanData, Room } from '../../types';

interface MinimapProps {
  plan: FloorPlanData;
  playerPos?: { x: number; y: number; z: number; yaw: number };
  activeRoom: Room | null;
  onRoomClick?: (room: Room) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ plan, playerPos, activeRoom, onRoomClick }) => {
  const boundary = plan.outer_boundary || { width: 30, height: 50 };
  const padding = 2;
  const viewBoxW = boundary.width + padding * 2;
  const viewBoxH = boundary.height + padding * 2;

  return (
    <div className="bg-neutral-900/90 backdrop-blur-md p-2.5 rounded-xl border border-neutral-700/60 shadow-2xl w-48 sm:w-56 select-none pointer-events-auto">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <div className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[11px] font-semibold tracking-wider text-neutral-300 uppercase">Radar Map</span>
        </div>
        <span className="text-[10px] text-amber-400 font-mono font-medium">N ↑</span>
      </div>

      <div className="relative aspect-[3/4] w-full bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center p-1">
        <svg
          viewBox={`-${padding} -${padding} ${viewBoxW} ${viewBoxH}`}
          className="w-full h-full"
          style={{ transform: 'scaleY(-1)' }} // Invert Y so North is up
        >
          {/* Grid lines */}
          <defs>
            <pattern id="minimap-grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
            </pattern>
          </defs>
          <rect
            x={-padding}
            y={-padding}
            width={viewBoxW}
            height={viewBoxH}
            fill="url(#minimap-grid)"
          />

          {/* Outer boundary */}
          <rect
            x={0}
            y={0}
            width={boundary.width}
            height={boundary.height}
            fill="none"
            stroke="#475569"
            strokeWidth="0.6"
            strokeDasharray="1.5 1.5"
          />

          {/* Rooms */}
          {plan.rooms.map((room) => {
            const isActive = activeRoom?.id === room.id;
            return (
              <g key={room.id} onClick={() => onRoomClick?.(room)} className="cursor-pointer">
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  length={room.length}
                  height={room.length}
                  fill={isActive ? 'rgba(245, 158, 11, 0.35)' : 'rgba(51, 65, 85, 0.4)'}
                  stroke={isActive ? '#f59e0b' : '#64748b'}
                  strokeWidth={isActive ? '0.6' : '0.35'}
                  rx="0.3"
                />
              </g>
            );
          })}

          {/* Balconies */}
          {plan.balconies?.map((b, i) => (
            <rect
              key={`b_${i}`}
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.length}
              fill="rgba(180, 83, 9, 0.2)"
              stroke="#b45309"
              strokeWidth="0.3"
            />
          ))}

          {/* Doors */}
          {plan.doors?.map((door) => (
            <circle
              key={door.id}
              cx={door.x}
              cy={door.y}
              r="0.8"
              fill="#10b981"
              opacity="0.8"
            />
          ))}

          {/* Player Marker and Field of View Cone */}
          {playerPos && (
            <g transform={`translate(${playerPos.x}, ${playerPos.z})`}>
              {/* Field of view cone */}
              <path
                d="M 0 0 L -4 10 L 4 10 Z"
                fill="rgba(245, 158, 11, 0.25)"
                stroke="rgba(245, 158, 11, 0.6)"
                strokeWidth="0.2"
                transform={`rotate(${(-playerPos.yaw * 180) / Math.PI})`}
              />
              {/* Center player dot */}
              <circle r="1.1" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.3" />
            </g>
          )}
        </svg>
      </div>

      {activeRoom && (
        <div className="mt-1.5 text-center truncate">
          <span className="text-[11px] font-medium text-neutral-200">
            {activeRoom.name}
          </span>
          <span className="block text-[9px] text-neutral-400 capitalize">
            {activeRoom.type.replace('_', ' ')} • {activeRoom.width}′ × {activeRoom.length}′
          </span>
        </div>
      )}
    </div>
  );
};
