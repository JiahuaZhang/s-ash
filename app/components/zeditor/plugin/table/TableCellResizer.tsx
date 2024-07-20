import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalEditable } from '@lexical/react/useLexicalEditable';
import type { TableCellNode, TableDOMCell, TableMapValueType } from '@lexical/table';
import { $computeTableMapSkipCellCheck, $getTableColumnIndexFromTableCellNode, $getTableNodeFromLexicalNodeOrThrow, $getTableRowIndexFromTableCellNode, $isTableCellNode, $isTableRowNode, getDOMCellFromTarget } from '@lexical/table';
import { calculateZoomLevel } from '@lexical/utils';
import { MousePosition } from 'antd/es/modal/interface';
import { $getNearestNodeFromDOMNode, LexicalEditor, } from 'lexical';
import { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type MouseDraggingDirection = 'right' | 'bottom';

const MIN_ROW_HEIGHT = 33;
const MIN_COLUMN_WIDTH = 50;

const TableCellResizer = ({ editor }: { editor: LexicalEditor; }) => {
  const targetRef = useRef<HTMLElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const tableRectRef = useRef<DOMRect | null>(null);
  const mouseStartPosRef = useRef<MousePosition | null>(null);
  const [mouseCurrentPos, updateMouseCurrentPos] = useState<MousePosition | null>(null);
  const [activeCell, updateActiveCell] = useState<TableDOMCell | null>(null);
  const [isMouseDown, updateIsMouseDown] = useState<boolean>(false);
  const [draggingDirection, updateDraggingDirection] = useState<MouseDraggingDirection | null>(null);

  const resetState = useCallback(() => {
    updateActiveCell(null);
    targetRef.current = null;
    updateDraggingDirection(null);
    mouseStartPosRef.current = null;
    tableRectRef.current = null;
  }, []);

  const isMouseDownOnEvent = (event: MouseEvent) => (event.buttons & 1) === 1;

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      setTimeout(() => {
        if (draggingDirection) {
          updateMouseCurrentPos({ x: event.clientX, y: event.clientY, });
          return;
        }

        updateIsMouseDown(isMouseDownOnEvent(event));
        const target = event.target;
        if (resizerRef.current && resizerRef.current.contains(target as Node)) {
          return;
        }

        if (targetRef.current === target) {
          return;
        }

        targetRef.current = target as HTMLElement;
        const cell = getDOMCellFromTarget(target as HTMLElement);
        if (cell && activeCell !== cell) {
          editor.update(() => {
            const tableCellNode = $getNearestNodeFromDOMNode(cell.elem);
            if (!tableCellNode) {
              throw new Error('TableCellResizer: Table cell node not found.');
            }

            const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
            const tableElement = editor.getElementByKey(tableNode.getKey());
            if (!tableElement) {
              throw new Error('TableCellResizer: Table element not found.');
            }

            targetRef.current = target as HTMLElement;
            tableRectRef.current = tableElement.getBoundingClientRect();
            updateActiveCell(cell);
          });
        } else if (cell == null) {
          resetState();
        }
      }, 0);
    };

    const onMouseDown = (event: MouseEvent) => setTimeout(() => updateIsMouseDown(true), 0);
    const onMouseUp = (event: MouseEvent) => setTimeout(() => updateIsMouseDown(false), 0);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [activeCell, draggingDirection, editor, resetState]);

  const isHeightChanging = (direction: MouseDraggingDirection) => direction === 'bottom';

  const updateRowHeight = useCallback(
    (heightChange: number) => {
      if (!activeCell) {
        throw new Error('TableCellResizer: Expected active cell.');
      }

      editor.update(
        () => {
          const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
          if (!$isTableCellNode(tableCellNode)) {
            throw new Error('TableCellResizer: Table cell node not found.');
          }

          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);
          const tableRows = tableNode.getChildren();

          if (tableRowIndex >= tableRows.length || tableRowIndex < 0) {
            throw new Error('Expected table cell to be inside of table row.');
          }

          const tableRow = tableRows[tableRowIndex];
          if (!$isTableRowNode(tableRow)) {
            throw new Error('Expected table row');
          }

          let height = tableRow.getHeight();
          if (height === undefined) {
            const rowCells = tableRow.getChildren<TableCellNode>();
            height = Math.min(
              ...rowCells.map(
                (cell) => getCellNodeHeight(cell, editor) ?? Infinity,
              ),
            );
          }

          const newHeight = Math.max(height + heightChange, MIN_ROW_HEIGHT);
          tableRow.setHeight(newHeight);
        },
        { tag: 'skip-scroll-into-view' },
      );
    },
    [activeCell, editor],
  );

  const getCellNodeWidth = (cell: TableCellNode, activeEditor: LexicalEditor) => {
    const width = cell.getWidth();
    if (width !== undefined) { return width; }

    const domCellNode = activeEditor.getElementByKey(cell.getKey());
    if (domCellNode == null) { return undefined; }

    const computedStyle = getComputedStyle(domCellNode);
    return domCellNode.clientWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight);
  };

  const getCellNodeHeight = (cell: TableCellNode, activeEditor: LexicalEditor,) =>
    activeEditor.getElementByKey(cell.getKey())?.clientHeight;

  const updateColumnWidth = useCallback(
    (widthChange: number) => {
      if (!activeCell) {
        throw new Error('TableCellResizer: Expected active cell.');
      }

      editor.update(() => {
        const tableCellNode = $getNearestNodeFromDOMNode(activeCell.elem);
        if (!$isTableCellNode(tableCellNode)) {
          throw new Error('TableCellResizer: Table cell node not found.');
        }

        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const [tableMap] = $computeTableMapSkipCellCheck(tableNode, null, null);
        const columnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
        if (columnIndex === undefined) {
          throw new Error('TableCellResizer: Table column not found.');
        }

        for (let row = 0; row < tableMap.length; row++) {
          const cell: TableMapValueType = tableMap[row][columnIndex];
          if (
            cell.startRow === row
            && (columnIndex === tableMap[row].length - 1
              || tableMap[row][columnIndex].cell !== tableMap[row][columnIndex + 1].cell)
          ) {
            const width = getCellNodeWidth(cell.cell, editor);
            if (width === undefined) {
              continue;
            }
            const newWidth = Math.max(width + widthChange, MIN_COLUMN_WIDTH);
            cell.cell.setWidth(newWidth);
          }
        }
      }, { tag: 'skip-scroll-into-view' });
    },
    [activeCell, editor],
  );

  const mouseUpHandler = useCallback(
    (direction: MouseDraggingDirection) => {
      const handler = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          throw new Error('TableCellResizer: Expected active cell.');
        }

        if (mouseStartPosRef.current) {
          const { x, y } = mouseStartPosRef.current;

          if (activeCell === null) {
            return;
          }
          const zoom = calculateZoomLevel(event.target as Element);

          if (isHeightChanging(direction)) {
            const heightChange = (event.clientY - y) / zoom;
            updateRowHeight(heightChange);
          } else {
            const widthChange = (event.clientX - x) / zoom;
            updateColumnWidth(widthChange);
          }

          resetState();
          document.removeEventListener('mouseup', handler);
        }
      };
      return handler;
    },
    [activeCell, resetState, updateColumnWidth, updateRowHeight],
  );

  const toggleResize = useCallback(
    (direction: MouseDraggingDirection): MouseEventHandler<HTMLDivElement> =>
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!activeCell) {
          throw new Error('TableCellResizer: Expected active cell.');
        }

        mouseStartPosRef.current = {
          x: event.clientX,
          y: event.clientY,
        };
        updateMouseCurrentPos(mouseStartPosRef.current);
        updateDraggingDirection(direction);

        document.addEventListener('mouseup', mouseUpHandler(direction));
      },
    [activeCell, mouseUpHandler],
  );

  const getResizers = useCallback(() => {
    if (!activeCell) return { bottom: null, left: null, right: null, top: null, };

    const { height, width, top, left } = activeCell.elem.getBoundingClientRect();
    const zoom = calculateZoomLevel(activeCell.elem);
    const zoneWidth = 10; // Pixel width of the zone where you can drag the edge
    const styles = {
      bottom: {
        backgroundColor: 'none',
        height: `${zoneWidth}px`,
        left: `${window.pageXOffset + left}px`,
        top: `${window.pageYOffset + top + height - zoneWidth / 2}px`,
        width: `${width}px`,
      },
      right: {
        backgroundColor: 'none',
        height: `${height}px`,
        left: `${window.pageXOffset + left + width - zoneWidth / 2}px`,
        top: `${window.pageYOffset + top}px`,
        width: `${zoneWidth}px`,
      },
    };

    const tableRect = tableRectRef.current;

    if (draggingDirection && mouseCurrentPos && tableRect) {
      if (isHeightChanging(draggingDirection)) {
        styles[draggingDirection].left = `${window.pageXOffset + tableRect.left}px`;
        styles[draggingDirection].top = `${window.pageYOffset + mouseCurrentPos.y / zoom}px`;
        styles[draggingDirection].height = '3px';
        styles[draggingDirection].width = `${tableRect.width}px`;
      } else {
        styles[draggingDirection].top = `${window.pageYOffset + tableRect.top}px`;
        styles[draggingDirection].left = `${window.pageXOffset + mouseCurrentPos.x / zoom}px`;
        styles[draggingDirection].width = '3px';
        styles[draggingDirection].height = `${tableRect.height}px`;
      }

      styles[draggingDirection].backgroundColor = '#adf';
    }

    return styles;
  }, [activeCell, draggingDirection, mouseCurrentPos]);

  const resizerStyles = getResizers();

  return (
    <div ref={resizerRef}>
      {activeCell != null && !isMouseDown && (
        <>
          <div un-position='absolute'
            un-cursor='col-resize'
            style={resizerStyles.right || undefined}
            onMouseDown={toggleResize('right')}
          />
          <div un-position='absolute'
            un-cursor='row-resize'
            style={resizerStyles.bottom || undefined}
            onMouseDown={toggleResize('bottom')}
          />
        </>
      )}

      {/* <div un-positionn='absolute'
        un-cursor='row-resize'
        un-h='2.5'
        un-left='[105.5px]'
        un-top='[335.5px]'
        un-w='16'
        un-bg='blue-4'
      />
      <div un-positionn='absolute'
        un-cursor='col-resize'
        un-h='6'
        un-left='[164.5px]'
        un-top='[313.5px]'
        un-w='16'
        un-bg='blue4'
      /> */}
    </div>
  );
};

export const TableCellResizerPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();

  return useMemo(() => isEditable
    ? createPortal(<TableCellResizer editor={editor} />, document.body)
    : null,
    [editor, isEditable]);
};