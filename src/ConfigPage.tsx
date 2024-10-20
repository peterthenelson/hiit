import React from 'react';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import { PlainTextEditable, getSelection, setCaret } from './PlainTextEditable';
import { armsPreset, chestPreset, defaultPreset, Page, saveConfigToLocalStorage, TimerConfig } from './config';
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PlusIcon, ClipboardDocumentListIcon, XMarkIcon } from '@heroicons/react/20/solid'
import { FolderOpenIcon, ChevronUpDownIcon, PlayIcon } from '@heroicons/react/24/solid'
import './ConfigPage.css';
import { Dropdown } from 'react-bootstrap';

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

type ButtonProps = React.HTMLProps<HTMLButtonElement>;
const PresetsToggle = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <button
    ref={ref}
    className="ConfigPage-presets"
    title="Presets"
    onClick={(e) => {
      if (props.onClick) {
        e.preventDefault();
        props.onClick(e);
      }
    }}
  >
    {props.children}
  </button>

));

export function ConfigPage({ config, setConfig, setPage }: ConfigPageProps) {
  const [items, setItems] = useState(exercisesToItems(config.exercises));
  const [nextId, setNextId] = useState(config.exercises.length);
  const [focus, setFocus] = useState<FocusState>({ type: 'NONE' });
  const focusRef: React.MutableRefObject<HTMLElement | null> = useRef(null);

  const updateConfig = (newConfig: TimerConfig) => {
    setConfig(newConfig);
    saveConfigToLocalStorage(newConfig);
  }

  const updateItems = (items: Item[]) => {
    setItems(Array.from(items));
    updateConfig({ ...config, exercises: itemsToExercises(items) });
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const tmp = Array.from(items);
    const [reorderedItem] = tmp.splice(result.source.index, 1);
    tmp.splice(result.destination.index, 0, reorderedItem);
    updateItems(tmp);
  };

  const handleEditKey = (item: Item, index: number, e: React.KeyboardEvent<HTMLElement>) => {
    const [startOffset, endOffset] = getSelection(item.content.length);
    if (e.code === 'Backspace' &&
        startOffset === endOffset &&
        startOffset === 0 &&
        index > 0) {
      // Backspace at front -> join with previous item and move focus appropriately
      items.splice(index, 1);
      setFocus({ type: 'ITEM', id: items[index-1].id, offset: items[index-1].content.length });
      items[index-1].content += item.content;
      updateItems(items);
    } else if (e.code === 'Enter' && startOffset !== -1) {
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

  const handlePaste = (item: Item, index: number, event: React.ClipboardEvent<HTMLElement>) => {
    const txt = event.clipboardData.getData('text/plain');
    if (!txt.includes('\n')) {
      return;
    }
    const [startOffset, endOffset] = getSelection(item.content.length);
    event.preventDefault();
    // Break into multiple items at the newlines
    const lines = txt.split('\n');
    const remainder = item.content.slice(endOffset);
    items[index].content = item.content.slice(0, startOffset) + lines.shift();
    const newItems: Item[] = [];
    let id = nextId;
    const offset = lines.at(-1)?.length;
    for (const line of lines) {
      newItems.push({ id: id++, content: line });
    }
    newItems[newItems.length - 1].content += remainder;
    items.splice(index + 1, 0, ...newItems);
    setFocus({ type: 'ITEM', id: id - 1, offset: offset });
    setNextId(id);
    updateItems(items);
  };

  const handleStart = () => {
    setPage(Page.Timer);
  };

  const handlePresets = (eventKey: string | null) => {
    let config: TimerConfig | null = null;
    if (eventKey === 'default') {
      config = defaultPreset();
    } else if (eventKey === 'arms') {
      config = armsPreset();
    } else if (eventKey === 'chest') {
      config = chestPreset();
    } else {
      console.warn(`Invalid preset name: ${eventKey}`);
      return;
    }
    setConfig(config);
    setItems(exercisesToItems(config.exercises));
    saveConfigToLocalStorage(config);
  };

  // Force selection to move when focus changes.
  useEffect(() => {
    if (focus.type !== 'ITEM') {
      return;
    }
    setCaret(focusRef, focus.offset);
  }, [focus]);

  return (
    <div className="ConfigPage">
      <h2>HIIT Timer</h2>
      <div className="ConfigPage-buttons">
        <Dropdown onSelect={handlePresets}>
          <Dropdown.Toggle as={PresetsToggle}>
            <FolderOpenIcon pointerEvents="none" />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item eventKey="default">Mix (default)</Dropdown.Item>
            <Dropdown.Item eventKey="arms">Biceps and Triceps</Dropdown.Item>
            <Dropdown.Item eventKey="chest">Chest</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
        <button onClick={handleStart} className="ConfigPage-start" title="Start Timer">
          <PlayIcon pointerEvents="none" />
        </button>
      </div>
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
                        onPaste={(e) => handlePaste(item, index, e)}
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
              <div className="ConfigPage-exercise ConfigPage-pseudoexercise">
                <div
                  className="ConfigPage-insert"
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
                <div
                  className="ConfigPage-copy"
                  onClick={() => {
                    navigator.clipboard.writeText(items.map((i) => i.content).join('\n'));
                  }}
                >
                  Copy Set
                  <ClipboardDocumentListIcon
                    pointerEvents="none"
                    className="ConfigPage-clipboard" />
                </div>
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <div className="ConfigPage-num-settings">
        <label title="Active seconds" htmlFor="ConfigPage-active">Active </label>
        <input
          id="ConfigPage-active"
          title="Active seconds"
          type="number"
          value={config.activeSecs}
          onChange={(e) => updateConfig({ ...config, activeSecs: e.target.valueAsNumber })}
        />
        <label title="Rest seconds" htmlFor="ConfigPage-rest">Rest</label>
        <input
          id="ConfigPage-rest"
          title="Rest seconds"
          type="number"
          value={config.restSecs}
          onChange={(e) => updateConfig({ ...config, restSecs: e.target.valueAsNumber })}
        />
        <label title="Number of Sets" htmlFor="ConfigPage-sets">Sets</label>
        <input
          id="ConfigPage-sets"
          title="Number of Sets"
          type="number"
          value={config.numSets}
          onChange={(e) => updateConfig({ ...config, numSets: e.target.valueAsNumber })}
        />
      </div>
    </div>
  );
}
