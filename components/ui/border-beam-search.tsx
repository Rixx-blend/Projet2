import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Conteneur Border Beam réutilisable, accordé au thème sauge de Rixx Studio.
 * L'animation et les couleurs sont définies dans app/globals.css via les tokens du thème.
 */
export function BorderBeamSearch({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("search-beam-shell", className)}>
      {children}
    </div>
  );
}

export default BorderBeamSearch;
