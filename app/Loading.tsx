import Image from "next/image";

export function LoadingSmall() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <Image
        src="/loading-small.gif"
        alt=""
        width={24}
        height={32}
        unoptimized
      />
    </div>
  );
}

export function LoadingBig() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "50vh",
      }}
    >
      <Image
        src="/loading-big.gif"
        alt=""
        width={256}
        height={32}
        unoptimized
      />
    </div>
  );
}