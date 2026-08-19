/**
 * The fixed reference size of an explorable world (hub room, dungeon arena).
 * Scenes position content in these units; the camera (camera.ts) pans a
 * viewport — sized by stage.ts's existing device-fit scale — around inside
 * these bounds. Bigger than the viewport on purpose: that's what makes
 * panning meaningful instead of everything just auto-fitting on screen.
 */
export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1080;
