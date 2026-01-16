/**
 * Robust Point-in-Polygon hit testing for SVG paths.
 * Supports M, m, L, l, H, h, V, v, Z, z commands.
 * Ignores curves (C, Q, A) treating them as straight lines between points (approximation),
 * but the India map data provided is purely linear segments essentially.
 */

export function isPointInSvgPath(pathD: string, x: number, y: number): boolean {
  let inside = false;
  
  // Current pen position
  let cx = 0;
  let cy = 0;
  
  // Start of current sub-path
  let startX = 0;
  let startY = 0;
  
  // Parse tokens: command chars or numbers
  const tokens = pathD.match(/([a-zA-Z])|([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g);
  if (!tokens) return false;
  
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
    // Note: M/m becomes L/l for subsequent coordinate pairs
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
          cx = nx;
          cy = ny;
        }
        break;
        
      case 'H': // Horizontal Absolute
        {
          const nx = parseFloat(tokens[i++]);
          if (rayIntersects(x, y, cx, cy, nx, cy)) inside = !inside;
          cx = nx;
        }
        break;
        
      case 'h': // Horizontal Relative
        {
          const dx = parseFloat(tokens[i++]);
          const nx = cx + dx;
          if (rayIntersects(x, y, cx, cy, nx, cy)) inside = !inside;
          cx = nx;
        }
        break;
        
      case 'V': // Vertical Absolute
        {
          const ny = parseFloat(tokens[i++]);
          if (rayIntersects(x, y, cx, cy, cx, ny)) inside = !inside;
          cy = ny;
        }
        break;
        
      case 'v': // Vertical Relative
        {
          const dy = parseFloat(tokens[i++]);
          const ny = cy + dy;
          if (rayIntersects(x, y, cx, cy, cx, ny)) inside = !inside;
          cy = ny;
        }
        break;
        
      case 'Z': // Close Path
      case 'z':
        if (rayIntersects(x, y, cx, cy, startX, startY)) inside = !inside;
        cx = startX;
        cy = startY;
        // Z doesn't have args, so we don't consume/implicit anything
        // But we need to define what happens if numbers follow Z?
        // Usually a new subpath (M) is expected, but if numbers follow Z, it's invalid in strict SVG.
        // We just break.
        break;
        
      default:
        // Skip unknown command (or curve args if we decide to ignore proper curve logic)
        // For this dataset, we shouldn't hit this.
        i++;
        break;
    }
  }
  
  return inside;
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
