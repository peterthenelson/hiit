import { SetStateAction, useState } from 'react';
import { Page, TimerConfig } from './config';
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export interface ConfigPageProps {
  config: TimerConfig,
  setConfig: React.Dispatch<SetStateAction<TimerConfig>>,
  setPage: React.Dispatch<SetStateAction<Page>>;
}

interface Item {
  id: string,
  content: string,
}

function exercisesToItems(exercises: string[]): Item[] {
  const items: Item[] = [];
  for (let i = 0; i < exercises.length; i++) {
    items.push({ id: i.toString(), content: exercises[i] });
  }
  return items;
}

function itemsToExercises(items: Item[]): string[] {
  return items.map((i) => i.content);
}

export function ConfigPage({ config, setConfig, setPage }: ConfigPageProps) {
  const [items, setItems] = useState(exercisesToItems(config.exercises));

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const tmp = Array.from(items);
    const [reorderedItem] = tmp.splice(result.source.index, 1);
    tmp.splice(result.destination.index, 0, reorderedItem);
    setItems(tmp);
    setConfig({ ...config, exercises: itemsToExercises(tmp) });
  }

  return (
    <div>
      <div>
        <h1>HIIT Timer</h1>
        <DragDropContext onDragEnd={handleDragEnd} >
          <Droppable droppableId='exercises-droppable'>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {items.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                       ref={provided.innerRef}
                       style={provided.draggableProps.style}
                       {...provided.draggableProps}
                       {...provided.dragHandleProps}>
                        {item.content}
                      </div>
                    )}
                  </Draggable>
                ))}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <p></p>
        <button onClick={() => setPage(Page.Timer)}>Start</button>
      </div>
    </div>
  );
}
