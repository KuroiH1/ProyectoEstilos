// Current seller identity (name only, no password). Stored locally.
import { useCallback, useEffect, useState } from "react";

import { storage } from "@/src/utils/storage";

const USER_KEY = "eg_user_name";

export async function getStoredUserName(): Promise<string | null> {
  return storage.getItem<string | null>(USER_KEY, null);
}

export async function setStoredUserName(name: string): Promise<boolean> {
  return storage.setItem(USER_KEY, name);
}

export function useCurrentUser() {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const stored = await getStoredUserName();
    setName(stored);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { name, loading, refresh };
}
