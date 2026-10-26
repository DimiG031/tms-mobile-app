import { useState } from "react";
import { Image } from "react-native";
import { Text, View } from "@/components/ui";
import { toAbsoluteUrlOrNull } from "@/lib/urls";

function initials(name?: string | null): string {
  const tokens = (name ?? "").trim().split(/\s+/).slice(0, 2);
  if (!tokens.length) return "?";
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Avatar vozača: slika ako postoji, inače inicijali.
 *
 * `avatarUrl` stiže iz `GET /api/mobile/profile` (`user.avatarUrl`). Kad slike
 * nema — ili se ne učita (mrtav link, istekao potpis) — padamo na inicijale,
 * jer je prazan krug gori od slova.
 */
export function Avatar({
  url,
  name,
  size = 64,
  backgroundColor,
  textColor
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  backgroundColor: string;
  textColor: string;
}) {
  const [failed, setFailed] = useState(false);
  // Backend salje relativnu putanju (/uploads/...), koju Image ne ume da
  // ucita — bez ovoga krug ostane prazan, bez slike i bez inicijala.
  const src = toAbsoluteUrlOrNull(url);
  const showImage = Boolean(src) && !failed;

  return (
    <View
      className="items-center justify-center overflow-hidden"
      style={{ height: size, width: size, borderRadius: size / 2, backgroundColor }}
    >
      {showImage ? (
        <Image
          source={{ uri: src as string }}
          style={{ height: size, width: size }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ color: textColor, fontSize: size * 0.34, fontWeight: "700" }}>{initials(name)}</Text>
      )}
    </View>
  );
}
