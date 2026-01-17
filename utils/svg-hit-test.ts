/**
 * Robust Point-in-Polygon hit testing for SVG paths.
 * Supports M, m, L, l, H, h, V, v, Z, z commands.
 * Ignores curves (C, Q, A) treating them as straight lines between points (approximation),
 * but the India map data provided is purely linear segments essentially.
 */

export interface HitTestResult {
  inside: boolean;
  distance: number;
}

export function getDistanceToSvgPath(pathD: string, x: number, y: number): HitTestResult {
  let inside = false;
  let minDistance = Infinity;
  
  // Current pen position
  let cx = 0;
  let cy = 0;
  
  // Start of current sub-path
  let startX = 0;
  let startY = 0;
  
  // Parse tokens: command chars or numbers
  const tokens = pathD.match(/([a-zA-Z])|([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g);
  if (!tokens) return { inside: false, distance: Infinity };
  
  let i = 0;
  let currentCmd = 'M'; // Default to Move
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    // Check if token is a command (single letter)
    if (/^[a-zA-Z]$/.test(token)) {
      currentCmd = token;
      i++;
    }
    
    // Process command
    switch (currentCmd) {
      case 'M': // Move Absolute
        cx = parseFloat(tokens[i++]);
        cy = parseFloat(tokens[i++]);
        startX = cx;
        startY = cy;
        currentCmd = 'L'; // Implicit L for next points
        break;
        
      case 'm': // Move Relative
        cx += parseFloat(tokens[i++]);
        cy += parseFloat(tokens[i++]);
        startX = cx;
        startY = cy;
        currentCmd = 'l'; // Implicit l for next points
        break;
        
      case 'L': // Line Absolute
        {
          const nx = parseFloat(tokens[i++]);
          const ny = parseFloat(tokens[i++]);
          if (rayIntersects(x, y, cx, cy, nx, ny)) inside = !inside;
          minDistance = Math.min(minDistance, pointToSegmentDistance(x, y, cx, cy, nx, ny));
          cx = nx;
          cy = ny;
        }
        break;
        
      case 'l': // Line Relative
        {
          const dx = parseFloat(tokens[i++]);
          const dy = parseFloat(tokens[i++]);
          const nx = cx + dx;
          const ny = cy + dy;
          if (rayIntersects(x, y, cx, cy, nx, ny)) inside = !inside;
          minDistance = Math.min(minDistance, pointToSegmentDistance(x, y, cx, cy, nx, ny));
          cx = nx;
          cy = ny;
        }
        break;
        
      case 'H': // Horizontal Absolute
        {
          const nx = parseFloat(tokens[i++]);
          if (rayIntersects(x, y, cx, cy, nx, cy)) inside = !inside;
          minDistance = Math.min(minDistance, pointToSegmentDistance(x, y, cx, cy, nx, cy));
          cx = nx;
        }
        break;
        
      case 'h': // Horizontal Relative
        {
          const dx = parseFloat(tokens[i++]);
          const nx = cx + dx;
          if (rayIntersects(x, y, cx, cy, nx, cy)) inside = !inside;
          minDistance = Math.min(minDistance, pointToSegmentDistance(x, y, cx, cy, nx, cy));
          cx = nx;
        }
        break;
        
      case 'V': // Vertical Absolute
        {
          const ny = parseFloat(tokens[i++]);
          if (rayIntersects(x, y, cx, cy, cx, ny)) inside = !inside;
          minDistance = Math.min(minDistance, pointToSegmentDistance(x, y, cx, cy, cx, ny));
          cy = ny;
        }
        break;
        
      case 'v': // Vertical Relative
        {
          const dy = parseFloat(tokens[i++]);
          const ny = cy + dy;
          if (rayIntersects(x, y, cx, cy, cx, ny)) inside = !inside;
          minDistance = Math.min(minDistance, pointToSegmentDistance(x, y, cx, cy, cx, ny));
          cy = ny;
        }
        break;
        
      case 'Z': // Close Path
      case 'z':
        if (rayIntersects(x, y, cx, cy, startX, startY)) inside = !inside;
        minDistance = Math.min(minDistance, pointToSegmentDistance(x, y, cx, cy, startX, startY));
        cx = startX;
        cy = startY;
        break;
        
      default:
        // Skip unknown command
        i++;
        break;
    }
  }
  
  return { inside, distance: inside ? 0 : minDistance };
}

// Keep the original function for backward compatibility if needed, but adapt it
export function isPointInSvgPath(pathD: string, x: number, y: number): boolean {
  return getDistanceToSvgPath(pathD, x, y).inside;
}

// Ray-Casting algorithm
function rayIntersects(pointX: number, pointY: number, startX: number, startY: number, endX: number, endY: number): boolean {
  // Check if point is within the y-range of the edge
  if ((startY > pointY) !== (endY > pointY)) {
    // Calculate x-intersection of the edge with the ray (horizontal line at pointY)
    const intersectX = (endX - startX) * (pointY - startY) / (endY - startY) + startX;
    // Check if intersection is to the right of the point
    if (pointX < intersectX) {
      return true;
    }
  }
  return false;
}

// Point to Line Segment Distance
function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  
  if (l2 === 0) return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  
  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

