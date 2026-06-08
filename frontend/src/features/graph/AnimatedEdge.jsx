import React from 'react';
import { getBezierPath, BaseEdge, EdgeLabelRenderer } from '@xyflow/react';

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isDotted = data?.edgeStyle === 'dotted';
  const edgeColor = style.stroke || '#5eaac7';

  return (
    <>
      {/* Glow under-layer */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: 4,
          strokeOpacity: 0.08,
          filter: `blur(4px)`,
        }}
      />
      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth: isDotted ? 2 : 1.5,
          strokeDasharray: isDotted ? '4 6' : 'none',
          strokeLinecap: 'round',
          animation: isDotted ? 'edgeDash 2s linear infinite' : 'none',
          filter: `drop-shadow(0 0 3px ${edgeColor}44)`,
        }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: 'rgba(10, 18, 30, 0.85)',
              backdropFilter: 'blur(8px)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: 10,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 500,
              color: '#7ec8e3',
              letterSpacing: '0.03em',
              pointerEvents: 'none',
              border: '1px solid rgba(94, 170, 199, 0.15)',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
      <style>
        {`
          @keyframes edgeDash {
            to {
              stroke-dashoffset: -20;
            }
          }
        `}
      </style>
    </>
  );
}
