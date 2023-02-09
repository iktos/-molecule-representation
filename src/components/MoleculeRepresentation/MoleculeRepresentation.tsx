import React, { CSSProperties, memo, useEffect, useMemo, useRef, useState } from 'react';
import { useRDKit } from '@iktos-oss/rdkit-provider';
import { ClickableAtoms, DrawSmilesSVGProps, get_svg, get_svg_from_smarts } from '../../utils/draw';
import { appendRectsToSvg, Rect } from '../../utils/html';
import { get_molecule_details, is_valid_smiles } from '../../utils/molecule';

import {
  CLICKABLE_MOLECULE_CLASSNAME,
  computeClickingAreaForAtoms,
  getAtomIdxFromClickableId,
} from './MoleculeRepresentation.service';
import { Spinner } from '../Spinner';

interface MoleculeRepresentationBaseProps {
  addAtomIndices?: boolean;
  atomsToHighlight?: number[][];
  bondsToHighlight?: number[][];
  clickableAtoms?: ClickableAtoms;
  details?: Record<string, unknown>;
  height: number;
  id?: string;
  onAtomClick?: (atomId: string) => void;
  style?: CSSProperties;
  width: number;
}

interface SmilesRepresentationProps extends MoleculeRepresentationBaseProps {
  smarts?: never;
  smiles: string;
}

interface SmartsRepresentationProps extends MoleculeRepresentationBaseProps {
  smarts: string;
  smiles?: never;
}

export type MoleculeRepresentationProps = SmilesRepresentationProps | SmartsRepresentationProps;

export const MoleculeRepresentation: React.FC<MoleculeRepresentationProps> = memo(
  ({
    addAtomIndices = false,
    atomsToHighlight,
    bondsToHighlight,
    clickableAtoms,
    details,
    height,
    id,
    onAtomClick,
    smarts,
    smiles,
    style,
    width,
    ...restOfProps
  }: MoleculeRepresentationProps) => {
    const { RDKit } = useRDKit();
    const moleculeRef = useRef<HTMLDivElement>(null);
    const [svgContent, setSvgContent] = useState('');
    const [rects, setRects] = useState<Array<Rect>>([]);
    const isClickable = useMemo(() => !!onAtomClick, [onAtomClick]);

    useEffect(() => {
      if (!RDKit) return;
      if (!isClickable) return;
      const structureToDraw = smiles || (smarts as string);
      const moleculeDetails = get_molecule_details(structureToDraw, RDKit);
      if (!moleculeDetails) return;
      setTimeout(
        // do this a better way, the issue is when highlighting there is a moment when the atom-0 is rendered at the wrong position (0-0)
        () =>
          computeClickingAreaForAtoms({
            numAtoms: moleculeDetails.numAtoms,
            parentDiv: moleculeRef.current,
            clickableAtoms: clickableAtoms?.clickableAtomsIds,
          }).then(setRects),
        100,
      );
    }, [smiles, smarts, RDKit, isClickable, clickableAtoms]);

    useEffect(() => {
      if (!RDKit) return;
      const drawingDetails: DrawSmilesSVGProps = {
        smiles: smarts || (smiles as string),
        width,
        height,
        details: { ...details, addAtomIndices },
        atomsToHighlight,
        bondsToHighlight,
        isClickable,
        clickableAtoms,
      };
      const svg = smarts
        ? is_valid_smiles(smarts, RDKit)
          ? get_svg(drawingDetails, RDKit)
          : get_svg_from_smarts({ smarts, width, height }, RDKit)
        : get_svg(drawingDetails, RDKit);
      if (svg) setSvgContent(appendRectsToSvg(svg, rects));
    }, [
      smiles,
      smarts,
      rects,
      atomsToHighlight,
      addAtomIndices,
      details,
      isClickable,
      bondsToHighlight,
      width,
      height,
      RDKit,
      clickableAtoms,
    ]);

    if (!svgContent) return <Spinner width={width} height={height} />;

    return (
      <div
        data-testid='clickable-molecule'
        ref={moleculeRef}
        {...restOfProps}
        className={`molecule ${onAtomClick ? CLICKABLE_MOLECULE_CLASSNAME : ''}`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        id={id}
        onClick={(e) => {
          const clickedId = (e.target as HTMLDivElement).id;
          if (onAtomClick && clickedId) {
            e.preventDefault();
            e.stopPropagation();
            const atomIdx = getAtomIdxFromClickableId(clickedId);
            onAtomClick(atomIdx);
          }
        }}
        style={{ ...style, height, width }}
      ></div>
    );
  },
);

MoleculeRepresentation.displayName = 'MoleculeRepresentation';
export default MoleculeRepresentation;
