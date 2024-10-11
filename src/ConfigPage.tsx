import { SetStateAction, useEffect, useRef, useState } from 'react';
import { PlainTextEditable } from './PlainTextEditable';
import { Page, TimerConfig } from './config';
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PlusIcon } from '@heroicons/react/20/solid'
import { ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/24/solid'
import './ConfigPage.css';

export interface ConfigPageProps {
  config: TimerConfig,
  setConfig: React.Dispatch<SetStateAction<TimerConfig>>,
  setPage: React.Dispatch<SetStateAction<Page>>;
}

interface Item {
  id: number,
  content: string,
}

type FocusState =
  | { type: 'NONE' }
  | { type: 'INSERT' }
  | { type: 'ITEM', id: number, offset?: number };

function exercisesToItems(exercises: string[]): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < exercises.length; i++) {
    items.push({ id: i, content: exercises[i] });
  }
  return items;
}

function itemsToExercises(items: Item[]): string[] {
  return items.map((i) => i.content);
}

function hasFocus(item: Item, focus: FocusState): boolean {
  return focus.type === 'ITEM' && focus.id === item.id;
}

export function ConfigPage({ config, setConfig, setPage }: ConfigPageProps) {
  const [items, setItems] = useState(exercisesToItems(config.exercises));
  const [nextId, setNextId] = useState(config.exercises.length);
  const [focus, setFocus] = useState<FocusState>({ type: 'NONE' });
  const focusRef: React.MutableRefObject<HTMLElement | null> = useRef(null);

  const updateItems = (items: Item[]) => {
    setItems(items);
    setConfig({ ...config, exercises: itemsToExercises(items) });
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const tmp = Array.from(items);
    const [reorderedItem] = tmp.splice(result.source.index, 1);
    tmp.splice(result.destination.index, 0, reorderedItem);
    updateItems(tmp);
  };

  const handleEditKey = (item: Item, index: number, e: React.KeyboardEvent<HTMLElement>) => {
    // TODO: Just rewrite my own contexteditable component and avoid the weird
    // brittle assumptions and workarounds about carets and selections and stale
    // closures and timeouts and empty text nodes.
    const sel = document.getSelection();
    const range = sel?.getRangeAt(0);
    console.assert(range?.startContainer === range?.endContainer);
    const isInFakeTextNode = range?.startContainer !== range?.startContainer.parentNode?.childNodes.item(0);
    const startOffset = range ? (isInFakeTextNode ? item.content.length : range.startOffset) : -1;
    const endOffset = range ? (isInFakeTextNode ? item.content.length : range.endOffset) : -1;
    if (e.code === 'Backspace' &&
        startOffset === endOffset &&
        startOffset === 0 &&
        index > 0) {
      // Backspace at front -> join with previous item and move focus appropriately
      items.splice(index, 1);
      setFocus({ type: 'ITEM', id: items[index-1].id, offset: items[index-1].content.length });
      items[index-1].content += item.content;
      updateItems(items);
    } else if (e.code === 'Enter' && range) {
      // Enter -> start new item w/focus at front (possibly splitting current)
      const remainder = item.content.slice(endOffset);
      items[index].content = item.content.slice(0, startOffset);
      items.splice(index + 1, 0, { id: nextId, content: remainder });
      setFocus({ type: 'ITEM', id: nextId, offset: 0 });
      setNextId(nextId + 1);
      updateItems(items);
    } else if (e.code === 'ArrowUp' &&
               index !== 0 &&
               startOffset === endOffset &&
               startOffset === 0) {
      // Up when cursor at front -> focus up
      setFocus({ type: 'ITEM', id: items[index-1].id, offset: 0 });
    } else if (e.code === 'ArrowDown' &&
               startOffset === endOffset &&
               startOffset === item.content.length) {
      // Down when cursor at end -> focus down
      if (index === items.length - 1) {
        // If at end, insert an element first
        items.push({ id: nextId, content: '' });
        setNextId(nextId + 1)
        updateItems(items);
      }
      setFocus({ type: 'ITEM', id: items[index+1].id, offset: 0 });
    }
  };

  const handleStart = () => {
    setConfig({ ...config, exercises: itemsToExercises(items) });
    setPage(Page.Timer);
  };

  // Force selection focus when focus changes in cases where it needs to be.
  useEffect(() => {
    if (focusRef.current === null || focus.type !== 'ITEM') {
      return;
    }
    const sel = document.getSelection();
    const currentRange = sel?.getRangeAt(0);
    if (sel === null || currentRange === undefined ||
        focusRef.current.contains(currentRange.startContainer) ||
        focusRef.current.contains(currentRange.endContainer)) {
      return;
    }
    const range = document.createRange();
    if (focusRef.current.firstChild) {
      range.setStart(
        focusRef.current.firstChild as Node,
        focus.offset !== undefined ? focus.offset : focusRef.current.firstChild?.textContent?.length || 0);
    }  else {
      range.setStart(focusRef.current, 0);
    }
    range.collapse(true);
    sel.removeAllRanges();
    // TODO: this feels incredibly stupid.
    setTimeout(() => sel.addRange(range));
  }, [focus]);

  return (
    <div className="ConfigPage">
      <h1>HIIT Timer</h1>
      <DragDropContext onDragEnd={handleDragEnd} >
        <Droppable droppableId="ConfigPage-droppable">
          {(provided) => (
            <div
              className="ConfigPage-droppable"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {items.map((item, index) => (
                <Draggable
                  key={item.id}
                  draggableId={item.id.toString()}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      className={
                        'ConfigPage-exercise ConfigPage-draggable ' +
                        (hasFocus(item, focus) ?  'ConfigPage-focused' : '')
                      }
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <div className="ConfigPage-handle">
                        <ChevronUpDownIcon pointerEvents="none" />
                      </div>
                      <PlainTextEditable
                        initialValue={item.content}
                        onChange={(e) => {
                          items[index].content = e.target.value;
                          updateItems(items);
                        }}
                        onFocus={() => setFocus({ type: 'ITEM', id: item.id })}
                        onBlur={() => setFocus({ type: 'NONE' })}
                        onKeyDown={(e) => handleEditKey(item, index, e)}
                        className="ConfigPage-editable"
                        innerRef={hasFocus(item, focus) ? focusRef : undefined}/>
                      <div
                        className="ConfigPage-remove"
                        onClick={() => {
                          items.splice(index, 1);
                          updateItems(items);
                        }}
                      >
                        <XMarkIcon pointerEvents="" />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <div
                className="ConfigPage-exercise ConfigPage-insert"
                onClick={() => {
                  items.push({ id: nextId, content: '' });
                  setFocus({ type: 'ITEM', id: nextId });
                  setNextId(nextId+1);
                  updateItems(items);
                }}
              >
                <PlusIcon
                  pointerEvents="none"
                  className="ConfigPage-plus" />
                Add Exercise
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <p></p>
      <button onClick={handleStart}>Start</button>
    </div>
  );
}
