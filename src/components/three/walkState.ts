/** Where the first-person visitor is, shared between the walker, the doors and the minimap (metres). */
export const walkState = { x: 0, z: 0, yaw: 0, active: false, room: -2 };
type Goto = (x: number, z: number, face?: number) => void;
let gotoFn: Goto | null = null;
export const setGoto = (f: Goto | null) => {
  gotoFn = f;
};
/** Ask the walker to walk (not teleport) to a point, routing through doorways. */
export const walkTo = (x: number, z: number, face?: number) => gotoFn?.(x, z, face);
