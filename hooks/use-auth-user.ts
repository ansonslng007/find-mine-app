import { getMe } from "@/lib/api/auth";
import { getAuthToken } from "@/lib/auth/token-storage";
import { loadAuthUser, saveAuthUser } from "@/lib/auth/session";
import { useQuery } from "@tanstack/react-query";

export function useAuthUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) {
        return null;
      }
      const cached = await loadAuthUser();
      if (cached) {
        return cached;
      }
      const { user } = await getMe();
      await saveAuthUser(user);
      return user;
    },
    staleTime: 0,
  });
}
