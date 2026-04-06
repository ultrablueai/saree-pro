import { cookies } from "next/headers";
import {
  getDictionary,
  getDirection,
  localeCookieName,
  parseLocale,
  type Locale,
} from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return parseLocale(cookieStore.get(localeCookieName)?.value);
}

export async function getRequestI18n() {
  const locale = await getRequestLocale();

  return {
    locale,
    direction: getDirection(locale),
    dictionary: getDictionary(locale),
  };
}
