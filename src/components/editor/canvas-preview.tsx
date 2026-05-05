"use client";

import { useMemo } from "react";
import { Stage, Layer, Rect, Text as KonvaText, Image as KonvaImage, Group } from "react-konva";
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
  if (cmd.kind === "text-block") {
    return <TextBlockCmd cmd={cmd} />;
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

function TextBlockCmd({ cmd }: { cmd: Extract<DrawCmd, { kind: "text-block" }> }) {
  // Use a hidden 2D canvas to measure each segment so red and white words
  // sit flush together with the same kerning the server uses.
  const ctx = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    return c.getContext("2d");
  }, []);

  return (
    <Group>
      {cmd.lines.map((line, i) => {
        const family = mapKonvaFamily(line.fontFamily);
        const lineY = cmd.y + i * line.fontSize * cmd.lineHeight;
        const fontSpec = `${line.fontWeight >= 700 ? "bold" : "normal"} ${line.fontSize}px ${family}`;
        const measure = (text: string) => {
          if (!ctx) return text.length * line.fontSize * 0.55;
          ctx.font = fontSpec;
          const t = line.uppercase ? text.toUpperCase() : text;
          const chars = Array.from(t);
          const w = chars.reduce((acc, ch) => acc + ctx.measureText(ch).width, 0);
          return w + line.letterSpacing * Math.max(0, chars.length - 1);
        };
        const widths = line.segments.map((s) => measure(s.text));
        const total =
          widths.reduce((a, b) => a + b, 0) +
          line.letterSpacing * Math.max(0, line.segments.length - 1);
        let startX = cmd.x;
        if (line.align === "center") startX = cmd.x + (cmd.w - total) / 2;
        else if (line.align === "right") startX = cmd.x + cmd.w - total;

        let cursor = startX;
        const nodes: React.ReactNode[] = [];
        line.segments.forEach((seg, si) => {
          const text = line.uppercase ? seg.text.toUpperCase() : seg.text;
          nodes.push(
            <KonvaText
              key={si}
              x={cursor}
              y={lineY}
              text={text}
              fontFamily={line.fontFamily}
              fontSize={line.fontSize}
              fontStyle={line.fontWeight >= 700 ? "bold" : "normal"}
              fill={seg.fill}
              letterSpacing={line.letterSpacing}
              align="left"
            />,
          );
          cursor += widths[si] + line.letterSpacing;
        });
        return <Group key={i}>{nodes}</Group>;
      })}
    </Group>
  );
}

function mapKonvaFamily(name: string): string {
  if (name === "JetBrains Mono") return "JetBrains Mono, Cascadia Mono, Consolas, monospace";
  if (name === "Inter Tight") return "Inter Tight, Inter, Segoe UI, system-ui, sans-serif";
  return "Inter, Segoe UI, system-ui, sans-serif";
}
