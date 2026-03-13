import type { ReactNode } from "react";

export function PageHeader({
  title,
  actions,
}: {
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="pb-2 flex items-center justify-between">
      <h1 className="text-2xl font-bold">{title}</h1>
      {actions}
    </div>
  );
}
