"use client";

import { useMemo } from "react";
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type { Post } from "@/lib/post-schema";
import { computeLayout, type DrawCmd } from "@/lib/render";

interface Props {
  post: Post;
  /** CSS pixel width of the rendered preview. Internal canvas is always at native resolution. */
  displayWidth: number;
}

export function CanvasPreview({ post, displayWidth }: Props) {
  const layout = useMemo(() => computeLayout(post, false), [post]);
  const scale = displayWidth / layout.width;
  const displayHeight = layout.height * scale;

  return (
    <div
      className="overflow-hidden rounded-md border border-[var(--color-map-border)] bg-[var(--color-bg-base)]"
      style={{ width: displayWidth, height: displayHeight }}
    >
      <Stage width={displayWidth} height={displayHeight} scaleX={scale} scaleY={scale} listening={false}>
        <Layer>
          {layout.commands.map((cmd, i) => (
            <Cmd key={i} cmd={cmd} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function Cmd({ cmd }: { cmd: DrawCmd }) {
  if (cmd.kind === "rect" || cmd.kind === "highlight-bar") {
    return (
      <Rect
        x={cmd.x}
        y={cmd.y}
        width={cmd.w}
        height={cmd.h}
        fill={cmd.fill}
        opacity={"opacity" in cmd && cmd.opacity !== undefined ? cmd.opacity : 1}
      />
    );
  }
  if (cmd.kind === "image") {
    return <ImageCmd cmd={cmd} />;
  }
  // text
  const text = cmd.uppercase ? cmd.text.toUpperCase() : cmd.text;
  return (
    <KonvaText
      x={cmd.x}
      y={cmd.y}
      width={cmd.w}
      text={text}
      fontFamily={cmd.fontFamily}
      fontSize={cmd.fontSize}
      fontStyle={cmd.fontWeight >= 700 ? "bold" : "normal"}
      fill={cmd.fill}
      lineHeight={cmd.lineHeight}
      align={cmd.align}
      letterSpacing={cmd.letterSpacing}
    />
  );
}

function ImageCmd({ cmd }: { cmd: Extract<DrawCmd, { kind: "image" }> }) {
  const [img] = useImage(cmd.src, "anonymous");
  if (!img) return null;
  return (
    <KonvaImage
      image={img}
      x={cmd.x}
      y={cmd.y}
      width={cmd.w}
      height={cmd.h}
      opacity={cmd.opacity ?? 1}
    />
  );
}
