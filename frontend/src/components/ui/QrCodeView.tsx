import React from 'react';

interface QrCodeViewProps {
  value: string;
  size?: number;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({ value, size = 180 }) => {
  // Generate deterministic binary matrix from value string
  const modules = React.useMemo(() => {
    const matrixSize = 25;
    const grid: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

    // Draw standard finder pattern box
    const drawFinderPattern = (startX: number, startY: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 || // Outer ring
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)     // Inner solid 3x3
          ) {
            grid[startY + r][startX + c] = true;
          }
        }
      }
    };

    // Draw 3 standard corner position detection patterns
    drawFinderPattern(0, 0);
    drawFinderPattern(matrixSize - 7, 0);
    drawFinderPattern(0, matrixSize - 7);

    // Draw timing patterns
    for (let i = 8; i < matrixSize - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Hash value to populate deterministic data modules
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    // Fill data modules outside finder patterns
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= matrixSize - 8;
        const inBottomLeft = r >= matrixSize - 8 && c < 8;
        const onTiming = (r === 6 && c >= 8 && c < matrixSize - 8) || (c === 6 && r >= 8 && r < matrixSize - 8);

        if (!inTopLeft && !inTopRight && !inBottomLeft && !onTiming) {
          const bit = Math.abs(Math.sin((r * matrixSize + c + hash) * 12.9898) * 43758.5453) % 1;
          grid[r][c] = bit > 0.48;
        }
      }
    }

    return grid;
  }, [value]);

  const matrixSize = modules.length;
  const cellSize = size / matrixSize;

  return (
    <div
      style={{
        display: 'inline-block',
        padding: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        {modules.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.2}
                height={cellSize + 0.2}
                fill="#0a0d14"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
