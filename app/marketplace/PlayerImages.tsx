"use client";

import Image from "next/image";
import { useState } from "react";
import type { CSSProperties } from "react";
import {
  formatPrice,
  getPositionGradient,
  getTier,
  MARKET_LABELS,
} from "@/lib/utils";
import { LoadingSmall } from "../Loading";

function getMarketLabel(market: string): string {
  const key = market.replace(/\s+/g, "");
  return MARKET_LABELS[key] ?? market;
}

const chipStyle: CSSProperties = {
  position: "absolute",
  top: 30,
  zIndex: 6,
  padding: "2px 4px",
  maxWidth: 100,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  border: "1px solid #926813",
  borderRadius: 3,
  background: "#eac45e",
  color: "#201600",
  boxShadow: "0 2px 4px #0008",
  fontSize: 10,
  lineHeight: "13px",
  fontWeight: 800,
  pointerEvents: "none",
};

export default function PlayerImages({
  playerId,
  teamId,
  imageUrl,
  name,
  topText,
  bottomText,
  position,
  isAlien = false,
  price,
  market,
  showPriceChip = false,
  showMarketChip = false,
  enableHover = false,
}: {
  playerId: number;
  teamId: number | null;
  imageUrl: string;
  name: string;
  topText: number;
  bottomText: string;
  position: string;
  isAlien?: boolean;
  price?: number | null;
  market?: string | null;
  showPriceChip?: boolean;
  showMarketChip?: boolean;
  enableHover?: boolean;
}) {
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [bodyLoaded, setBodyLoaded] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  const ready = playerLoaded && bodyLoaded && frameLoaded;

  const rahmen = isAlien
    ? "/rahmen-alien.png"
    : `/rahmen-${getTier(topText)}.png`;

  const hasTeam = teamId != null;

  const bodyUrl = hasTeam
    ? `/kits-images/home/${String(teamId).padStart(4, "0")}.png`
    : "/body.png";

  const canHover =
    enableHover && !isAlien && (playerId < 792 || playerId > 1015);

  return (
    <div
      style={{
        position: "relative",
        width: 128,
        height: 160,
        minWidth: 128,
        minHeight: 160,
        maxHeight: 160,
        flexShrink: 0,
        padding: 0,
        margin: 0,
        boxSizing: "border-box",
      }}
    >
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <LoadingSmall />
        </div>
      )}

      <div
        className={canHover ? "player-card" : ""}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 128,
          height: 160,
          minHeight: 160,
          maxHeight: 160,
          margin: 0,
          padding: 0,
          boxSizing: "border-box",
          visibility: ready ? "visible" : "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 96,
            height: 85,
            top: 31,
            left: 16,
            background: getPositionGradient(position),
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 64,
            height: 80,
            top: 36,
            left: 32,
            zIndex: 1,
          }}
        >
          <Image
            src={bodyUrl}
            alt=""
            fill
            sizes="64px"
            unoptimized
            onLoad={() => setBodyLoaded(true)}
            onError={() => setBodyLoaded(true)}
            style={{
              zIndex: 0,
              imageRendering: "pixelated",
              objectFit: hasTeam ? "contain" : "fill",
              objectPosition: "bottom center",
              filter: hasTeam
                ? `
                  drop-shadow(2px 0 0 black)
                  drop-shadow(-2px 0 0 black)
                  drop-shadow(0 2px 0 black)
                  drop-shadow(0 -2px 0 black)
                `
                : undefined,
            }}
          />

          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="64px"
            onLoad={() => setPlayerLoaded(true)}
            style={{ zIndex: 1 }}
          />
        </div>

        <Image
          className={!isAlien ? "player-frame" : ""}
          src={rahmen}
          alt=""
          fill
          sizes="128px"
          onLoad={() => setFrameLoaded(true)}
          style={{
            zIndex: 3,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 5,
            width: "100%",
            textAlign: "center",
            zIndex: 4,
            fontSize: 20,
            color: "black",
            fontWeight: "bold",
          }}
        >
          {topText}
        </div>

        {showPriceChip && price != null && Number.isFinite(price) && (
          <span style={{ ...chipStyle, left: 0 }} title={`Preis: ${price}`}>
            {formatPrice(price)}
          </span>
        )}

        {showMarketChip && market && (
          <span
            style={{ ...chipStyle, right: 0 }}
            title={getMarketLabel(market)}
          >
            {getMarketLabel(market)}
          </span>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 16,
            width: "100%",
            textAlign: "center",
            zIndex: 4,
            fontSize: 17,
            color: "white",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingInline: 12,
          }}
        >
          {bottomText}
        </div>
      </div>
    </div>
  );
}
