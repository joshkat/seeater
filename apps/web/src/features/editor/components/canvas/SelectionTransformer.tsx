import type Konva from "konva";
import type { Box } from "konva/lib/shapes/Transformer";
import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";

/** Smallest transform box, matching TableNode's MIN_SIZE. */
const MIN_BOX = 40;

interface SelectionTransformerProps {
  selectedIds: string[];
  nodeRefs: React.MutableRefObject<Map<string, Konva.Group>>;
}

/**
 * Konva Transformer that attaches to the currently-selected table nodes,
 * providing rotate + resize handles. Reads node instances from the shared ref
 * map that TableNode populates.
 */
export function SelectionTransformer({
  selectedIds,
  nodeRefs,
}: SelectionTransformerProps): JSX.Element {
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const nodes = selectedIds
      .map((id) => nodeRefs.current.get(id))
      .filter((node): node is Konva.Group => Boolean(node));

    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, nodeRefs]);

  const limitBox = (oldBox: Box, newBox: Box): Box =>
    newBox.width < MIN_BOX || newBox.height < MIN_BOX ? oldBox : newBox;

  return (
    <Transformer
      ref={transformerRef}
      keepRatio={false}
      rotateEnabled
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      anchorSize={8}
      anchorStroke="#2563eb"
      borderStroke="#2563eb"
      boundBoxFunc={limitBox}
    />
  );
}
