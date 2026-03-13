import { ToggleButton } from "@/ui/pages/job-search/components/ToggleButton";

export interface SiteInfo {
  name: string;
  supportedModes: string[];
}

export function SiteToggle({
  allSites,
  selectedSites,
  onChange,
}: {
  allSites: SiteInfo[];
  selectedSites: string[];
  onChange: (sites: string[]) => void;
}) {
  const toggle = (site: string) => {
    onChange(
      selectedSites.includes(site)
        ? selectedSites.filter((s) => s !== site)
        : [...selectedSites, site],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {allSites.map((site) => (
        <ToggleButton
          key={site.name}
          isActive={selectedSites.includes(site.name)}
          onClick={() => toggle(site.name)}
        >
          {site.name}
        </ToggleButton>
      ))}
    </div>
  );
}
