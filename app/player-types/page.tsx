import { Suspense } from "react";
import TypesChart from "./TypesChart";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <Suspense>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
          }}
        >
          <h1 style={{ textAlign: "center" }}>Player Types</h1>
          <TypesChart />
        </div>
      </Suspense>
    </main>
  );
}
