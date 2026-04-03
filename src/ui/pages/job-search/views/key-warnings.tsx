import { Link } from "react-router"

export function KeyWarnings({
  hasLlmKey,
  hasMapsKey,
  returnTo,
}: {
  hasLlmKey: boolean
  hasMapsKey: boolean
  returnTo: string
}) {
  if (hasLlmKey && hasMapsKey) return
  return (
    <div className="mt-2 space-y-1 text-right">
      {!hasLlmKey && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Ohne KI-Schlüssel: keine Zusammenfassungen.{" "}
          <Link
            to="/settings"
            state={{ returnTo }}
            className="underline hover:no-underline"
          >
            KI-Einstellungen
          </Link>
        </p>
      )}
      {!hasMapsKey && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Ohne Maps-Schlüssel: keine Fahrtzeiten.{" "}
          <Link
            to="/settings/maps"
            state={{ returnTo }}
            className="underline hover:no-underline"
          >
            Karten-Einstellungen
          </Link>
        </p>
      )}
    </div>
  )
}
