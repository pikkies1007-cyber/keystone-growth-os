import { useAuth } from "@/_core/hooks/useAuth";

/**
 * A stable identifier for goal_items.sessionId, tied to the signed-in user
 * instead of a random value generated fresh per browser tab. The random
 * approach meant goals created while completing a toolkit in one tab were
 * invisible on the Goal Dashboard if it was open in a different tab (or any
 * later session) -- sessionStorage doesn't share across tabs, so each one
 * got its own random "session," even for the same logged-in person.
 *
 * Falls back to the old random-per-tab behavior only if genuinely
 * unauthenticated, which shouldn't normally happen since every page that
 * uses this requires sign-in already.
 */
export function useGoalSessionId(): string {
  const { user } = useAuth();
  if (user) return `user-${user.id}`;

  let id = sessionStorage.getItem("keystoneSessionId");
  if (!id) {
    id = `anon-${Date.now()}`;
    sessionStorage.setItem("keystoneSessionId", id);
  }
  return id;
}
