import React, { useEffect, useState } from "react";

/** Renders children only after `ms` to avoid quick flash-of-skeleton. */
export default function Delayed({
  ms = 140,
  children,
}: {
  ms?: number;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return <>{ready ? children : null}</>;
}
