export const AVATAR_IDS = [
  'yellow-classic', 'yellow-wink', 'yellow-star', 'yellow-happy', 'yellow-sleepy', 'yellow-cool',
  'blue-classic', 'blue-wink', 'blue-star', 'blue-happy', 'blue-sleepy', 'blue-cool'
];

export function randomAvatarId() {
  return AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)];
}
